"use server";
import { ADMIN } from "@/lib/admin-path";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Permission, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { seal } from "@/lib/crypto";
import { permissionForOwner } from "@/lib/access";
import { BLOCKS, invalidateHome, type BlockKey } from "@/lib/content";
import { deleteAssetFiles } from "@/lib/media";
import { ACTIVITY_TYPES, LEVELS, ORGS, PERMISSIONS, PROGRESS } from "@/lib/labels";
import { DIVISIONS } from "@/lib/geo";

/*
 * Every admin mutation:  requireAdmin(permission) → zod → write → audit() → revalidate.
 * Forms post FormData; ids come from hidden inputs and are re-validated here.
 * Super admins pass every check; moderators only what their permissions allow.
 */

const tup = <T extends string>(a: readonly T[]) => a as unknown as [T, ...T[]];
const id = z.string().min(10).max(40);
const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => z.string().trim().max(max).transform((v) => (v ? v : null));
const status = z.enum(["PENDING", "APPROVED", "REJECTED", "ARCHIVED"]);
const fdo = (fd: FormData) => Object.fromEntries([...fd.keys()].map((k) => [k, fd.getAll(k).length > 1 ? fd.getAll(k) : fd.get(k)]));
const back = (fd: FormData, fallback: string) => {
  const r = String(fd.get("back") || fallback);
  return r.startsWith(`${ADMIN}`) && !r.startsWith("//") ? r : fallback;
};
const KIND_PERM = { contribution: "CONTRIBUTIONS", post: "POSTS", complaint: "COMPLAINTS" } as const;

// ───────────────────────────── moderation: status ─────────────────────────────

export async function setStatus(fd: FormData) {
  const p = z.object({ kind: z.enum(["contribution", "post", "complaint"]), id, status, note: str(4000).optional() }).parse(fdo(fd));
  const me = await requireAdmin(KIND_PERM[p.kind]);
  const now = new Date();
  if (p.kind === "contribution") {
    await db.contribution.update({ where: { id: p.id }, data: { status: p.status, reviewNote: p.note || undefined, reviewedAt: now, reviewedBy: me.id } });
    revalidatePath("/contributions");
  } else if (p.kind === "post") {
    const cur = await db.activityPost.findUniqueOrThrow({ where: { id: p.id }, select: { publishedAt: true } });
    await db.activityPost.update({
      where: { id: p.id },
      data: { status: p.status, reviewNote: p.note || undefined, publishedAt: p.status === "APPROVED" ? cur.publishedAt ?? now : cur.publishedAt },
    });
    revalidateTag("posts");
    revalidatePath("/dusshomoy");
  } else {
    await db.complaint.update({ where: { id: p.id }, data: { status: p.status } });
  }
  await audit(me, `status:${p.status}`, p.kind, p.id, p.note ? { note: p.note } : undefined);
  redirect(back(fd, `${ADMIN}/${p.kind}s/${p.id}`));
}

// ───────────────────────────── contributions ─────────────────────────────

export async function updateContribution(fd: FormData) {
  const me = await requireAdmin("CONTRIBUTIONS");
  const p = z
    .object({ id, title: str(300).min(1), description: str(20000).min(1), year: z.coerce.number().int().min(1900).max(2100), date: optStr(60), place: optStr(200), name: optStr(120), reviewNote: optStr(4000) })
    .parse(fdo(fd));
  const before = await db.contribution.findUniqueOrThrow({ where: { id: p.id } });
  const { id: _id, ...data } = p;
  await db.contribution.update({ where: { id: p.id }, data });
  await audit(me, "edit", "contribution", p.id, diff(before, data));
  revalidatePath("/contributions");
  redirect(`${ADMIN}/contributions/${p.id}?saved=1`);
}

export async function redactContribution(fd: FormData) {
  const me = await requireAdmin("CONTRIBUTIONS");
  const p = z.object({ id, what: z.enum(["contact", "name"]) }).parse(fdo(fd));
  await db.contribution.update({ where: { id: p.id }, data: p.what === "contact" ? { contactEnc: null } : { name: null, attribution: "ANON" } });
  await audit(me, `redact:${p.what}`, "contribution", p.id);
  revalidatePath("/contributions");
  redirect(`${ADMIN}/contributions/${p.id}?saved=1`);
}

// ───────────────────────────── complaints ─────────────────────────────

export async function complaintUpdate(fd: FormData) {
  const me = await requireAdmin("COMPLAINTS");
  const p = z.object({ id, progress: z.enum(tup(PROGRESS.codes)), message: str(10000), public: z.literal("on").optional() }).parse(fdo(fd));
  await db.$transaction([
    db.complaint.update({ where: { id: p.id }, data: { progress: p.progress } }),
    db.complaintUpdate.create({
      data: { complaintId: p.id, progress: p.progress, message: p.message ? seal(p.message)! : PROGRESS.label(p.progress), public: p.public === "on", adminId: me.id },
    }),
  ]);
  await audit(me, `progress:${p.progress}`, "complaint", p.id, { public: p.public === "on" });
  redirect(`${ADMIN}/complaints/${p.id}?saved=1`);
}

export async function complaintNote(fd: FormData) {
  const me = await requireAdmin("COMPLAINTS");
  const p = z.object({ id, internalNote: str(20000) }).parse(fdo(fd));
  await db.complaint.update({ where: { id: p.id }, data: { internalNote: seal(p.internalNote) } });
  await audit(me, "note", "complaint", p.id);
  redirect(`${ADMIN}/complaints/${p.id}?saved=1`);
}

export async function redactComplaint(fd: FormData) {
  const me = await requireAdmin("COMPLAINTS");
  const p = z.object({ id, what: z.enum(["contact", "victimName", "accused"]), accusedId: id.optional() }).parse(fdo(fd));
  if (p.what === "contact") await db.complaint.update({ where: { id: p.id }, data: { contactEnc: null, idMode: "ANON" } });
  if (p.what === "victimName") await db.complaint.update({ where: { id: p.id }, data: { victimNameEnc: null } });
  if (p.what === "accused" && p.accusedId)
    await db.accusedPerson.updateMany({ where: { id: p.accusedId, complaintId: p.id }, data: { facebookUrl: null, photoUrl: null } });
  await audit(me, `redact:${p.what}`, "complaint", p.id, p.accusedId ? { accusedId: p.accusedId } : undefined);
  redirect(`${ADMIN}/complaints/${p.id}?saved=1`);
}

// ───────────────────────────── posts ─────────────────────────────

export async function updatePost(fd: FormData) {
  const me = await requireAdmin("POSTS");
  const p = z
    .object({
      id, title: str(300).min(1), description: optStr(20000),
      org: z.enum(tup(ORGS.codes)), activityType: z.enum(tup(ACTIVITY_TYPES.codes)),
      level: z.union([z.enum(tup(LEVELS.codes)), z.literal("")]).transform((v) => v || null),
      division: z.union([z.enum(tup(DIVISIONS.map((d) => d.code))), z.literal("")]).transform((v) => v || null),
      district: str(80).min(1), thana: str(120).min(1), place: optStr(200),
      participants: z.union([z.coerce.number().int().min(1), z.literal("")]).transform((v) => (v === "" ? null : v)),
      name: optStr(120), role: optStr(120), anonymous: z.literal("on").optional(), reviewNote: optStr(4000),
    })
    .parse(fdo(fd));
  const before = await db.activityPost.findUniqueOrThrow({ where: { id: p.id } });
  const { id: _id, anonymous, ...rest } = p;
  const data = { ...rest, anonymous: anonymous === "on" } as Prisma.ActivityPostUpdateInput;
  await db.activityPost.update({ where: { id: p.id }, data });
  await audit(me, "edit", "post", p.id, diff(before, data as Record<string, unknown>));
  revalidateTag("posts");
  redirect(`${ADMIN}/posts/${p.id}?saved=1`);
}

// ───────────────────────────── media ─────────────────────────────

/** Hide / unhide a file. Needs the permission of whatever the file belongs to. */
export async function setMediaHidden(fd: FormData) {
  const p = z.object({ id, hidden: z.enum(["1", "0"]) }).parse(fdo(fd));
  const a0 = await db.mediaAsset.findUniqueOrThrow({ where: { id: p.id }, select: { ownerType: true } });
  const me = await requireAdmin(permissionForOwner(a0.ownerType));
  const a = await db.mediaAsset.update({ where: { id: p.id }, data: { hidden: p.hidden === "1" } });
  await audit(me, p.hidden === "1" ? "media:hide" : "media:unhide", "media", p.id, { owner: `${a.ownerType}:${a.ownerId}` });
  if (a.ownerType === "POST") revalidateTag("posts");
  else invalidateHome();
  redirect(back(fd, `${ADMIN}/media`));
}

/** Permanent deletion of a file — super admin only. Moderators can only hide. */
export async function deleteMedia(fd: FormData) {
  const me = await requireAdmin("SUPER");
  const p = z.object({ id }).parse(fdo(fd));
  const a = await db.mediaAsset.delete({ where: { id: p.id } });
  await deleteAssetFiles(a);
  await audit(me, "media:delete", "media", p.id, { owner: `${a.ownerType}:${a.ownerId}`, slot: a.slot });
  invalidateHome();
  revalidateTag("posts");
  redirect(back(fd, `${ADMIN}/media`));
}

// ───────────────────────────── content editors ─────────────────────────────

export async function saveProject(fd: FormData) {
  const me = await requireAdmin("CONTENT");
  const p = z.object({ id, titleBn: str(300).min(1), titleEn: str(300).min(1), sector: optStr(200), place: optStr(200), year: optStr(60), cost: optStr(120), noteBn: optStr(4000), noteEn: optStr(4000) }).parse(fdo(fd));
  const { id: _id, ...data } = p;
  await db.project.update({ where: { id: p.id }, data });
  await audit(me, "edit", "project", p.id);
  invalidateHome();
  redirect(`${ADMIN}/projects/${p.id}?saved=1`);
}

export async function saveFilm(fd: FormData) {
  const me = await requireAdmin("CONTENT");
  const p = z
    .object({
      id, titleBn: str(300).min(1), titleEn: str(300).min(1), subBn: str(300), subEn: str(300), descBn: str(4000), descEn: str(4000),
      color: z.enum(["amber", "teal", "pink", "violet", "blue", "coral"]),
      youtubeId: z.union([z.string().regex(/^[\w-]{11}$/), z.literal("")]).transform((v) => v || null),
      videoUrl: z.union([z.url({ protocol: /^https$/ }), z.literal("")]).transform((v) => v || null),
      projectOrder: z.union([z.coerce.number().int().min(0).max(999), z.literal("")]).transform((v) => (v === "" ? null : v)),
      order: z.coerce.number().int().min(0).max(999),
      published: z.literal("on").optional(),
    })
    .parse(fdo(fd));
  const { id: _id, published, ...data } = p;
  const clash = await db.film.findFirst({ where: { order: data.order, NOT: { id: p.id } }, select: { id: true } });
  if (clash) redirect(`${ADMIN}/films?error=order#f-${p.id}`);
  await db.film.update({ where: { id: p.id }, data: { ...data, published: published === "on" } });
  await audit(me, "edit", "film", p.id);
  invalidateHome();
  redirect(`${ADMIN}/films?saved=1#f-${p.id}`);
}

export async function saveMilestone(fd: FormData) {
  const me = await requireAdmin("CONTENT");
  const p = z
    .object({
      id, titleBn: str(300).min(1), titleEn: str(300).min(1), placeBn: str(300), placeEn: str(300), whenBn: str(300), whenEn: str(300),
      descBn: str(4000), descEn: str(4000), status: z.enum(["D", "P", "O", "L", "A"]),
      roadOrder: z.union([z.coerce.number().int().min(0).max(999), z.literal("")]).transform((v) => (v === "" ? null : v)),
      roadYearBn: optStr(40),
      lng: z.union([z.coerce.number().min(87).max(93), z.literal("")]).transform((v) => (v === "" ? null : v)),
      lat: z.union([z.coerce.number().min(20).max(27), z.literal("")]).transform((v) => (v === "" ? null : v)),
    })
    .parse(fdo(fd));
  const { id: _id, ...data } = p;
  await db.milestone.update({ where: { id: p.id }, data });
  await audit(me, "edit", "milestone", p.id);
  invalidateHome();
  redirect(`${ADMIN}/milestones?saved=1#m-${p.id}`);
}

export async function saveChapter(fd: FormData) {
  const me = await requireAdmin("CONTENT");
  const p = z.object({ id, yearBn: str(60), yearEn: str(60), titleBn: str(300).min(1), titleEn: str(300).min(1), descBn: str(4000), descEn: str(4000) }).parse(fdo(fd));
  const { id: _id, ...data } = p;
  await db.historyChapter.update({ where: { id: p.id }, data });
  await audit(me, "edit", "chapter", p.id);
  invalidateHome();
  redirect(`${ADMIN}/history/${p.id}?saved=1`);
}

export async function saveEvent(fd: FormData) {
  const me = await requireAdmin("CONTENT");
  const p = z
    .object({ chapterId: id, eventId: z.union([id, z.literal("")]), order: z.coerce.number().int().min(0).max(999), dateBn: str(100).min(1), dateEn: str(100), textBn: str(4000).min(1), textEn: str(4000) })
    .parse(fdo(fd));
  const data = { order: p.order, dateBn: p.dateBn, dateEn: p.dateEn, textBn: p.textBn, textEn: p.textEn };
  if (p.eventId) await db.timelineEvent.updateMany({ where: { id: p.eventId, chapterId: p.chapterId }, data });
  else await db.timelineEvent.create({ data: { ...data, chapterId: p.chapterId } });
  await audit(me, p.eventId ? "edit" : "create", "event", p.eventId || p.chapterId);
  invalidateHome();
  redirect(`${ADMIN}/history/${p.chapterId}?saved=1`);
}

export async function deleteEvent(fd: FormData) {
  const me = await requireAdmin("CONTENT");
  const p = z.object({ chapterId: id, eventId: id }).parse(fdo(fd));
  await db.timelineEvent.deleteMany({ where: { id: p.eventId, chapterId: p.chapterId } });
  await audit(me, "delete", "event", p.eventId);
  invalidateHome();
  redirect(`${ADMIN}/history/${p.chapterId}?saved=1`);
}

export async function saveBlock(fd: FormData): Promise<void> {
  const me = await requireAdmin("CONTENT");
  const key = z.enum(Object.keys(BLOCKS) as [BlockKey, ...BlockKey[]]).parse(fd.get("key"));
  let json: unknown;
  try {
    json = JSON.parse(String(fd.get("json") || ""));
  } catch {
    redirect(`${ADMIN}/content?error=json&key=${key}`);
  }
  const p = BLOCKS[key].schema.safeParse(json);
  if (!p.success) redirect(`${ADMIN}/content?error=schema&key=${key}`);
  await db.contentBlock.upsert({ where: { key }, create: { key, data: p.data as Prisma.InputJsonValue }, update: { data: p.data as Prisma.InputJsonValue } });
  await audit(me, "edit", "content", key);
  invalidateHome();
  redirect(`${ADMIN}/content?saved=${key}#b-${key}`);
}

/** Drop cached homepage + feed data (e.g. after `npm run images:import`). */
export async function refreshCache() {
  const me = await requireAdmin("CONTENT");
  invalidateHome();
  revalidateTag("posts");
  revalidatePath("/", "layout");
  await audit(me, "cache:refresh", "site");
  redirect(`${ADMIN}/content?saved=cache`);
}

// ───────────────────────────── users — SUPER ADMIN ONLY ─────────────────────────────

const roleE = z.enum(["SUPER_ADMIN", "MODERATOR"]);
const permList = (fd: FormData) => z.array(z.enum(tup(PERMISSIONS.codes))).parse(fd.getAll("permissions").map(String)) as Permission[];
const strongPw = z
  .string()
  .min(12)
  .max(200)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "password needs letters and numbers");

async function activeSupers(exceptId?: string) {
  return db.adminUser.count({ where: { role: "SUPER_ADMIN", active: true, ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
}

export async function createUser(fd: FormData) {
  const me = await requireAdmin("SUPER");
  const p = z.object({ email: z.email().max(200).toLowerCase(), name: str(120).min(1), role: roleE, password: strongPw }).safeParse(fdo(fd));
  if (!p.success) redirect(`${ADMIN}/users?error=invalid`);
  if (await db.adminUser.findUnique({ where: { email: p.data.email } })) redirect(`${ADMIN}/users?error=exists`);
  const permissions = p.data.role === "SUPER_ADMIN" ? [] : permList(fd);
  const u = await db.adminUser.create({
    data: { email: p.data.email, name: p.data.name, role: p.data.role, permissions, createdById: me.id, passwordHash: await bcrypt.hash(p.data.password, 12) },
  });
  await audit(me, "user:create", "AdminUser", u.id, { email: u.email, name: u.name, role: u.role, permissions });
  redirect(`${ADMIN}/users?saved=1`);
}

export async function updateUser(fd: FormData) {
  const me = await requireAdmin("SUPER");
  const p = z
    .object({ id, name: str(120).min(1), role: roleE, active: z.literal("on").optional(), password: z.union([strongPw, z.literal("")]) })
    .safeParse(fdo(fd));
  if (!p.success) redirect(`${ADMIN}/users/${String(fd.get("id") || "")}?error=invalid`);
  const d = p.data;
  const u = await db.adminUser.findUniqueOrThrow({ where: { id: d.id } });
  const active = d.active === "on";
  const permissions = d.role === "SUPER_ADMIN" ? [] : permList(fd);
  // you cannot lock yourself out, and there must always be one active super admin
  if (u.id === me.id && (d.role !== "SUPER_ADMIN" || !active)) redirect(`${ADMIN}/users/${u.id}?error=self`);
  if (u.role === "SUPER_ADMIN" && (d.role !== "SUPER_ADMIN" || !active) && (await activeSupers(u.id)) === 0) redirect(`${ADMIN}/users/${u.id}?error=last`);

  const changedAccess = u.role !== d.role || u.active !== active || !!d.password || u.permissions.slice().sort().join() !== permissions.slice().sort().join();
  await db.adminUser.update({
    where: { id: u.id },
    data: {
      name: d.name, role: d.role, active, permissions,
      ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 12) } : {}),
      // any change to access logs that person out everywhere (except yourself editing your own name)
      ...(changedAccess && u.id !== me.id ? { sessionVersion: { increment: 1 } } : {}),
    },
  });
  await audit(me, "user:update", "AdminUser", u.id, {
    email: u.email,
    from: { name: u.name, role: u.role, active: u.active, permissions: u.permissions },
    to: { name: d.name, role: d.role, active, permissions },
    passwordReset: !!d.password,
  });
  redirect(`${ADMIN}/users/${u.id}?saved=1`);
}

/** Log a user out of every device (bumps their session version). */
export async function forceLogout(fd: FormData) {
  const me = await requireAdmin("SUPER");
  const p = z.object({ id }).parse(fdo(fd));
  const u = await db.adminUser.update({ where: { id: p.id }, data: { sessionVersion: { increment: 1 } } });
  await audit(me, "user:logout-all", "AdminUser", u.id, { email: u.email });
  redirect(p.id === me.id ? `${ADMIN}/login` : `${ADMIN}/users/${p.id}?saved=1`);
}

/** Permanently delete an account. Their log-book entries stay (name/email were copied in). */
export async function deleteUser(fd: FormData) {
  const me = await requireAdmin("SUPER");
  const p = z.object({ id, confirm: z.string() }).parse(fdo(fd));
  const u = await db.adminUser.findUniqueOrThrow({ where: { id: p.id } });
  if (u.id === me.id) redirect(`${ADMIN}/users/${u.id}?error=self`);
  if (p.confirm.trim().toLowerCase() !== u.email) redirect(`${ADMIN}/users/${u.id}?error=confirm`);
  if (u.role === "SUPER_ADMIN" && (await activeSupers(u.id)) === 0) redirect(`${ADMIN}/users/${u.id}?error=last`);
  await audit(me, "user:delete", "AdminUser", u.id, { email: u.email, name: u.name, role: u.role });
  await db.adminUser.delete({ where: { id: u.id } });
  redirect(`${ADMIN}/users?saved=deleted`);
}

// ───────────────────────────── own account (everyone) ─────────────────────────────

export async function changeOwnPassword(fd: FormData) {
  const me = await requireAdmin();
  const p = z.object({ current: z.string().min(1).max(200), password: strongPw, confirm: z.string() }).safeParse(fdo(fd));
  if (!p.success || p.data.password !== p.data.confirm) redirect(`${ADMIN}/account?error=invalid`);
  const u = await db.adminUser.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await bcrypt.compare(p.data.current, u.passwordHash))) {
    await audit(me, "account:password-wrong", "AdminUser", me.id);
    redirect(`${ADMIN}/account?error=current`);
  }
  await db.adminUser.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(p.data.password, 12), sessionVersion: { increment: 1 } } });
  await audit(me, "account:password", "AdminUser", me.id);
  redirect(`${ADMIN}/login?changed=1`);
}

// ───────────────────────────── helpers ─────────────────────────────

function diff(before: Record<string, unknown>, after: Record<string, unknown>): Prisma.InputJsonValue {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    const a = before[k] instanceof Date ? (before[k] as Date).toISOString() : before[k];
    if (JSON.stringify(a ?? null) !== JSON.stringify(after[k] ?? null)) out[k] = { from: a ?? null, to: after[k] ?? null };
  }
  return out as Prisma.InputJsonValue;
}
