import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { adminOrNull } from "@/lib/auth";
import { permissionForOwner } from "@/lib/access";
import { canPublishMedia } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Every stored file is served from here (the bucket is private).
 *  - site content (projects, films, chapters …) → public, immutable cache
 *  - approved posts / contributions             → public
 *  - complaints, accused, anything pending      → admins only, never cached
 */
async function isPublic(a: { ownerType: string | null; ownerId: string | null; hidden: boolean; kind: string }) {
  if (a.hidden || !a.ownerId && a.ownerType !== "SITE") return false;
  if (!canPublishMedia(a.ownerType, a.kind)) return false;
  switch (a.ownerType) {
    case "SITE": case "PROJECT": case "MILESTONE": case "FILM": case "CHAPTER":
      return true;
    case "POST":
      return !!(await db.activityPost.findFirst({ where: { id: a.ownerId!, status: "APPROVED" }, select: { id: true } }));
    case "CONTRIBUTION":
      return !!(await db.contribution.findFirst({ where: { id: a.ownerId!, status: "APPROVED" }, select: { id: true } }));
    default:
      return false; // COMPLAINT, ACCUSED, unattached
  }
}

const CURATED = new Set(["SITE", "PROJECT", "MILESTONE", "FILM", "CHAPTER"]);
const isCurated = (ownerType: string | null) => !!ownerType && CURATED.has(ownerType);
const curatedCache = { "Cache-Control": "public, max-age=300, s-maxage=3600" };

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const thumb = url.searchParams.get("v") === "thumb";
  const a = await db.mediaAsset.findUnique({ where: { id } });
  const noStore = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
  if (!a || a.state !== "READY") return new NextResponse(null, { status: 404, headers: noStore });

  const pub = await isPublic(a);
  // private files: only admins allowed to work on that area (e.g. complaint evidence needs COMPLAINTS)
  if (!pub && !(await adminOrNull(permissionForOwner(a.ownerType)))) return new NextResponse(null, { status: 404, headers: noStore });
  // Admin-curated site content may be cached (browser 5 min, CDN 1 h): hiding one can take up to
  // an hour to disappear. Public submissions and private files are never cached.
  const cacheHeaders = pub && isCurated(a.ownerType) ? curatedCache : noStore;

  if (!a.key) {
    if (a.externalUrl) {
      const redirect = NextResponse.redirect(a.externalUrl, 302);
      for (const [k, v] of Object.entries(cacheHeaders)) redirect.headers.set(k, v);
      return redirect;
    }
    return new NextResponse(null, { status: 404, headers: noStore });
  }
  const key = thumb && a.thumbKey ? a.thumbKey : a.key;
  const mime = thumb && a.thumbKey ? "image/webp" : a.mime || "application/octet-stream";
  try {
    const range = req.headers.get("range") ?? undefined;
    const s = await storage.stream(key, a.kind === "VIDEO" || a.kind === "AUDIO" ? range : undefined);
    const h = new Headers({
      "Content-Type": mime,
      "Content-Length": String(s.size),
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      ...cacheHeaders,
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    });
    if (s.contentRange) h.set("Content-Range", s.contentRange);
    if (a.kind === "PDF") h.set("Content-Disposition", `inline; filename="${a.id}.pdf"`);
    if (!pub) h.set("Vary", "Cookie");
    return new NextResponse(s.body, { status: s.status, headers: h });
  } catch {
    console.error("[media] storage read failed");
    return new NextResponse(null, { status: 404, headers: noStore });
  }
}
