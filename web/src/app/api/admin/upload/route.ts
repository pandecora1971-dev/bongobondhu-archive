import { ADMIN } from "@/lib/admin-path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminOrNull } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { invalidateHome } from "@/lib/content";
import { storeAdminImage, UploadError } from "@/lib/media";
import { sameOrigin } from "@/lib/request";
import { readLimitedBody, BodyTooLarge } from "@/lib/request-body";

export const runtime = "nodejs";
export const maxDuration = 60;

const meta = z.object({
  ownerType: z.enum(["PROJECT", "MILESTONE", "FILM", "CHAPTER", "SITE"]),
  ownerId: z.string().max(40).optional().transform((v) => v || null),
  slot: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().or(z.literal("")).transform((v) => v || null),
  caption: z.string().max(500).optional(),
  credit: z.string().max(500).optional(),
  sourceUrl: z.string().max(2000).optional(),
  back: z.string().max(300).optional(),
});

/** Admin image upload (replaces / adds content images). Multipart; ≤ 25 MB; processed by sharp. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  const me = await adminOrNull("CONTENT");
  if (!me) return new NextResponse(null, { status: 401 });
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 26 * 1024 * 1024) return NextResponse.json({ error: "size" }, { status: 413 });
  let fd: FormData;
  try {
    const body = await readLimitedBody(req, 26 * 1024 * 1024);
    fd = await new Response(body, { headers: { "Content-Type": req.headers.get("content-type") || "" } }).formData();
  } catch (e) {
    return NextResponse.json({ error: "invalid" }, { status: e instanceof BodyTooLarge ? 413 : 400 });
  }
  const m = meta.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!m.success || !files.length || files.length > 20) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (files.some((f) => f.size > 25 * 1024 * 1024)) return NextResponse.json({ error: "size" }, { status: 413 });
  if (m.data.ownerType !== "SITE" && !m.data.ownerId) return NextResponse.json({ error: "owner" }, { status: 400 });
  try {
    for (const [i, f] of files.slice(0, 20).entries()) {
      const a = await storeAdminImage(Buffer.from(await f.arrayBuffer()), m.data.ownerType, m.data.ownerId, {
        slot: m.data.slot, caption: m.data.caption || null, alt: m.data.caption || null, credit: m.data.credit || null,
        sourceUrl: m.data.sourceUrl || null, sort: 100 + i, originalName: f.name.slice(0, 255),
      });
      await audit(me, "media:upload", "media", a.id, { owner: `${m.data.ownerType}:${m.data.ownerId ?? m.data.slot}` });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof UploadError ? e.message : "failed" }, { status: 400 });
  }
  invalidateHome();
  const back = m.data.back?.startsWith(`${ADMIN}`) ? m.data.back : `${ADMIN}`;
  return NextResponse.redirect(new URL(back + (back.includes("?") ? "&" : "?") + "saved=1", req.url), 303);
}
