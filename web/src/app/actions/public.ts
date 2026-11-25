"use server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { encrypt, hashSecret, nameIndex, randomCode, seal, unseal, verifySecret } from "@/lib/crypto";
import { verifyCaptcha } from "@/lib/captcha";
import { rateLimit } from "@/lib/ratelimit";
import { finalizeUploads, UploadError } from "@/lib/media";
import { normaliseDistrict } from "@/lib/geo";
import {
  complaintSchema, contributionSchema, followupSchema, postSchema, statusLookupSchema,
  type ComplaintInput, type ContributionInput, type PostInput,
} from "@/lib/validation";

type Fail = { ok: false; error: "invalid" | "captcha" | "rate" | "upload" | "server" | "notfound" };

// No PII in logs: only the error class/message, never the payload.
const logErr = (where: string, _e: unknown) => console.error(`[${where}] operation failed`);

async function unique(make: () => string, exists: (c: string) => Promise<boolean>) {
  for (let i = 0; i < 8; i++) {
    const c = make();
    if (!(await exists(c))) return c;
  }
  throw new Error("could not allocate a unique code");
}

// ───────────────────────────── 1. BB / SH contribution ─────────────────────────────

export async function submitContribution(input: ContributionInput): Promise<{ ok: true; ref: string } | Fail> {
  const p = contributionSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const d = p.data;
  if (!(await rateLimit("contribution")).ok) return { ok: false, error: "rate" };
  if (!(await verifyCaptcha(d.captcha))) return { ok: false, error: "captcha" };

  try {
    const year = new Date().getFullYear();
    const ref = await unique(
      () => `${d.subject}-${year}-${randomCode(5)}`,
      async (c) => !!(await db.contribution.findUnique({ where: { ref: c }, select: { id: true } })),
    );
    await db.$transaction(
      async (tx) => {
        const c = await tx.contribution.create({
          data: {
            ref, subject: d.subject, types: d.types, year: d.year, date: d.date, place: d.place, title: d.title,
            description: d.description, sourceUrls: d.sourceUrl ? [d.sourceUrl] : [], videoLink: d.videoLink,
            attribution: d.attribution, name: d.attribution === "ANON" ? null : d.name, contactEnc: encrypt(d.contact),
          },
        });
        await finalizeUploads({ uploads: d.uploads, purpose: "contribution", ownerType: "CONTRIBUTION", ownerId: c.id, tx });
      },
      { timeout: 60_000 },
    );
    return { ok: true, ref };
  } catch (e) {
    logErr("contribution", e);
    return { ok: false, error: e instanceof UploadError ? "upload" : "server" };
  }
}

// ───────────────────────────── 2. complaint (/report) ─────────────────────────────

export async function submitComplaint(input: ComplaintInput): Promise<{ ok: true; code: string; secret: string } | Fail> {
  const p = complaintSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const d = p.data;
  if (!(await rateLimit("complaint")).ok) return { ok: false, error: "rate" };
  if (!(await verifyCaptcha(d.captcha))) return { ok: false, error: "captcha" };

  try {
    const code = await unique(
      () => `${randomCode(4)}-${randomCode(4)}`,
      async (c) => !!(await db.complaint.findUnique({ where: { code: c }, select: { id: true } })),
    );
    const secret = randomCode(6); // shown once, only its hash is stored
    const secretHash = await hashSecret(secret);

    await db.$transaction(
      async (tx) => {
        const c = await tx.complaint.create({
          data: {
            code, secretHash, crimes: d.crimes, harms: d.harms, victimType: d.victimType, victimCount: d.victimCount,
            victimNameEnc: encrypt(d.victimName), incidentDate: d.date ? new Date(d.date + "T00:00:00Z") : null,
            division: d.division, district: d.district ? normaliseDistrict(d.district) : null, thana: d.thana,
            description: seal(d.description) ?? "", links: d.links.map((l) => seal(l)!).filter(Boolean), witness: d.witness, caseFiled: d.caseFiled, idMode: d.idMode,
            contactEnc: d.idMode === "CONTACT" ? encrypt(d.contact) : null,
            updates: { create: { message: "অভিযোগটি জমা হয়েছে।", progress: "RECEIVED", public: true } },
          },
        });
        for (const [i, a] of d.accused.entries()) {
          if (!a.name && !a.role && !a.org && !a.description && !a.facebookUrl && !a.photoUrl && !a.photo) continue;
          const acc = await tx.accusedPerson.create({
            data: {
              complaintId: c.id, order: i, name: seal(a.name), nameIdx: nameIndex(a.name), role: seal(a.role), org: seal(a.org),
              description: seal(a.description), how: a.how, facebookUrl: seal(a.facebookUrl), photoUrl: seal(a.photoUrl),
            },
          });
          if (a.photo) await finalizeUploads({ uploads: [a.photo], purpose: "accused", ownerType: "ACCUSED", ownerId: acc.id, tx });
        }
        await finalizeUploads({ uploads: d.uploads, purpose: "complaint", ownerType: "COMPLAINT", ownerId: c.id, tx });
      },
      { timeout: 90_000 },
    );
    return { ok: true, code, secret };
  } catch (e) {
    logErr("complaint", e);
    return { ok: false, error: e instanceof UploadError ? "upload" : "server" };
  }
}

// ───────────────────────────── /report/status ─────────────────────────────

export type StatusView = {
  code: string;
  progress: string;
  createdAt: string;
  updatedAt: string;
  updates: { at: string; message: string; progress: string | null; fromPublic: boolean }[];
};

async function findComplaint(code: string, secret: string) {
  const c = await db.complaint.findUnique({
    where: { code: code.includes("-") ? code : `${code.slice(0, 4)}-${code.slice(4)}` },
    include: { updates: { where: { public: true }, orderBy: { createdAt: "asc" } } },
  });
  // always run scrypt so timing does not reveal whether the code exists
  const ok = await verifySecret(secret, c?.secretHash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  return c && ok ? c : null;
}

export async function lookupStatus(input: { code: string; secret: string }): Promise<{ ok: true; view: StatusView } | Fail> {
  const p = statusLookupSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  if (!(await rateLimit("status")).ok) return { ok: false, error: "rate" };
  const c = await findComplaint(p.data.code, p.data.secret);
  if (!c) return { ok: false, error: "notfound" };
  return {
    ok: true,
    view: {
      code: c.code, progress: c.progress, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      updates: c.updates.map((u) => ({ at: u.createdAt.toISOString(), message: unseal(u.message) ?? "", progress: u.progress, fromPublic: u.fromPublic })),
    },
  };
}

export async function addFollowup(input: { code: string; secret: string; message: string; captcha?: string }): Promise<{ ok: true; view: StatusView } | Fail> {
  const p = followupSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  if (!(await rateLimit("followup")).ok) return { ok: false, error: "rate" };
  if (!(await verifyCaptcha(p.data.captcha))) return { ok: false, error: "captcha" };
  const c = await findComplaint(p.data.code, p.data.secret);
  if (!c) return { ok: false, error: "notfound" };
  await db.complaintUpdate.create({ data: { complaintId: c.id, fromPublic: true, public: true, message: seal(p.data.message) ?? "" } });
  await db.complaint.update({ where: { id: c.id }, data: { updatedAt: new Date() } });
  return lookupStatus({ code: p.data.code, secret: p.data.secret });
}

// ───────────────────────────── 3. দুঃসময়ের গল্প ─────────────────────────────

export async function submitPost(input: PostInput): Promise<{ ok: true; id: string } | Fail> {
  const p = postSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const d = p.data;
  if (!(await rateLimit("post")).ok) return { ok: false, error: "rate" };
  if (!(await verifyCaptcha(d.captcha))) return { ok: false, error: "captcha" };
  try {
    const id = await db.$transaction(
      async (tx) => {
        const post = await tx.activityPost.create({
          data: {
            org: d.org, activityType: d.activityType, level: d.level, date: d.date ? new Date(d.date + "T00:00:00Z") : null,
            division: d.division, district: normaliseDistrict(d.district), thana: d.thana, place: d.place, participants: d.participants,
            title: d.title, description: d.description, links: d.links, name: d.name, role: d.role, anonymous: d.anonymous,
          },
        });
        await finalizeUploads({ uploads: d.uploads, purpose: "post", ownerType: "POST", ownerId: post.id, tx });
        return post.id;
      },
      { timeout: 60_000 },
    );
    return { ok: true, id };
  } catch (e) {
    logErr("post", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) return { ok: false, error: "server" };
    return { ok: false, error: e instanceof UploadError ? "upload" : "server" };
  }
}
