import "server-only";
import sharp from "sharp";
import type { MediaKind, OwnerType, Prisma } from "@prisma/client";
import { db } from "./db";
import { storage } from "./storage";
import { sha256 } from "./crypto";
import { UPLOAD_RULES, type UploadPurpose } from "./upload-rules";

// ───────────────────────────── type sniffing (never trust the browser's MIME) ─────────────────────────────

export function sniff(b: Buffer): { kind: MediaKind; mime: string } | null {
  const at = (i: number, ...xs: number[]) => xs.every((x, k) => b[i + k] === x);
  const str = (i: number, s: string) => b.subarray(i, i + s.length).toString("latin1") === s;
  if (at(0, 0xff, 0xd8, 0xff)) return { kind: "IMAGE", mime: "image/jpeg" };
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { kind: "IMAGE", mime: "image/png" };
  if (str(0, "GIF87a") || str(0, "GIF89a")) return { kind: "IMAGE", mime: "image/gif" };
  if (str(0, "RIFF") && str(8, "WEBP")) return { kind: "IMAGE", mime: "image/webp" };
  if (str(4, "ftyp")) {
    const brand = b.subarray(8, 12).toString("latin1");
    if (["heic", "heix", "hevc", "mif1", "msf1", "avif"].includes(brand)) return { kind: "IMAGE", mime: brand === "avif" ? "image/avif" : "image/heic" };
    if (brand.startsWith("M4A")) return { kind: "AUDIO", mime: "audio/mp4" };
    if (brand.startsWith("qt")) return { kind: "VIDEO", mime: "video/quicktime" };
    return { kind: "VIDEO", mime: "video/mp4" };
  }
  if (at(0, 0x1a, 0x45, 0xdf, 0xa3)) return { kind: "VIDEO", mime: "video/webm" };
  if (str(0, "%PDF-")) return { kind: "PDF", mime: "application/pdf" };
  if (str(0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { kind: "AUDIO", mime: "audio/mpeg" };
  if (str(0, "OggS")) return { kind: "AUDIO", mime: "audio/ogg" };
  if (str(0, "RIFF") && str(8, "WAVE")) return { kind: "AUDIO", mime: "audio/wav" };
  return null;
}

// ───────────────────────────── image processing ─────────────────────────────

/**
 * Re-encode → drops ALL metadata (EXIF, GPS, XMP, IPTC, ICC except sRGB conversion).
 * `.rotate()` bakes the EXIF orientation into pixels first.
 */
export async function processImage(input: Buffer) {
  const base = sharp(input, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
  const full = await base
    .clone()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .webp({ quality: 74 })
    .toBuffer();
  return { full: full.data, width: full.info.width, height: full.info.height, thumb };
}

const ext = (mime: string) =>
  ({ "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "application/pdf": "pdf", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav" })[mime] ?? "bin";

const folder = (o: OwnerType) => o.toLowerCase();

export class UploadError extends Error {}

/**
 * Attach uploads (created by /api/uploads/presign) to their owner.
 * Verifies the per-upload token, re-checks size + real type from the stored bytes,
 * strips image metadata, writes thumbnails, and deletes the raw upload.
 */
export async function finalizeUploads(opts: {
  uploads: { id: string; token: string }[];
  purpose: UploadPurpose;
  ownerType: OwnerType;
  ownerId: string;
  tx?: Prisma.TransactionClient;
}): Promise<string[]> {
  const rule = UPLOAD_RULES[opts.purpose];
  if (opts.uploads.length > rule.maxFiles) throw new UploadError("too many files");
  const client = opts.tx ?? db;
  const done: string[] = [];

  for (const [i, u] of opts.uploads.entries()) {
    // claim atomically: a token can attach its file exactly once, even under concurrent requests
    const claimed = await client.mediaAsset.updateMany({
      where: { id: u.id, state: "PENDING", ownerId: null, uploadTokenHash: sha256(u.token) },
      data: { ownerType: opts.ownerType, ownerId: opts.ownerId, uploadTokenHash: null },
    });
    if (claimed.count !== 1) throw new UploadError("invalid upload");
    const a = await client.mediaAsset.findUnique({ where: { id: u.id } });
    if (!a || !a.key) throw new UploadError("invalid upload");
    if (Date.now() - a.createdAt.getTime() > 6 * 3600 * 1000) throw new UploadError("upload expired");

    const head = await storage.head(a.key, 64);
    if (!head) throw new UploadError("file missing");
    const t = sniff(head.first);
    if (!t || !rule.kinds.includes(t.kind)) {
      await storage.delete(a.key).catch(() => {});
      throw new UploadError("file type not allowed");
    }
    if (head.size > rule.maxBytes[t.kind]) {
      await storage.delete(a.key).catch(() => {});
      throw new UploadError("file too large");
    }

    const stamp = new Date().toISOString().slice(0, 7);
    const base = `media/${folder(opts.ownerType)}/${stamp}/${a.id}`;
    let data: Prisma.MediaAssetUpdateInput;

    if (t.kind === "IMAGE") {
      const raw = await storage.get(a.key);
      let p;
      try {
        p = await processImage(raw);
      } catch {
        await storage.delete(a.key).catch(() => {});
        throw new UploadError("image could not be read");
      }
      await storage.put(`${base}.webp`, p.full, "image/webp");
      await storage.put(`${base}_t.webp`, p.thumb, "image/webp");
      await storage.delete(a.key).catch(() => {});
      data = { key: `${base}.webp`, thumbKey: `${base}_t.webp`, mime: "image/webp", width: p.width, height: p.height, size: p.full.length };
    } else {
      // Video / audio / PDF are kept as-is in the private bucket (metadata NOT stripped — see README).
      const to = `${base}.${ext(t.mime)}`;
      await storage.move(a.key, to);
      data = { key: to, mime: t.mime, size: head.size };
    }

    await client.mediaAsset.update({
      where: { id: a.id },
      data: { ...data, kind: t.kind, state: "READY", ownerType: opts.ownerType, ownerId: opts.ownerId, sort: i, uploadTokenHash: null },
    });
    done.push(a.id);
  }
  return done;
}

/** Admin-side: store an image directly (project/film/chapter/site image replacement). */
export async function storeAdminImage(buf: Buffer, ownerType: OwnerType, ownerId: string | null, meta: Partial<Prisma.MediaAssetCreateInput>) {
  const t = sniff(buf);
  if (!t || t.kind !== "IMAGE") throw new UploadError("not an image");
  const p = await processImage(buf);
  const asset = await db.mediaAsset.create({ data: { ...meta, state: "PENDING", kind: "IMAGE", ownerType, ownerId } });
  const base = `media/${folder(ownerType)}/${new Date().toISOString().slice(0, 7)}/${asset.id}`;
  await storage.put(`${base}.webp`, p.full, "image/webp");
  await storage.put(`${base}_t.webp`, p.thumb, "image/webp");
  return db.mediaAsset.update({
    where: { id: asset.id },
    data: { state: "READY", key: `${base}.webp`, thumbKey: `${base}_t.webp`, mime: "image/webp", width: p.width, height: p.height, size: p.full.length },
  });
}

export async function deleteAssetFiles(a: { key: string | null; thumbKey: string | null }) {
  if (a.key) await storage.delete(a.key).catch(() => {});
  if (a.thumbKey) await storage.delete(a.thumbKey).catch(() => {});
}

/** Public URL for an asset (our own route, or the original external URL for un-imported seed images). */
export function mediaUrl(a: { id: string; key: string | null; externalUrl: string | null }, v: "full" | "thumb" = "full") {
  if (a.key) return `/api/media/${a.id}${v === "thumb" ? "?v=thumb" : ""}`;
  return a.externalUrl ?? "";
}
