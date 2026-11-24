/**
 * Copy every seed image that still lives on an external URL into our own storage
 * (R2 / MinIO / local), EXIF-stripped + resized + thumbnailed. Dead links are marked FAILED,
 * so the site shows the neutral placeholder instead.
 *
 *   npm run images:import            # all pending
 *   npm run images:import -- --retry # also retry ones that FAILED before
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "node:fs";
import path from "node:path";

const db = new PrismaClient();
const retry = process.argv.includes("--retry");
const UA = "ArchiveImageImporter/1.0 (+https://github.com; one-time import of credited images)";

const s3 = process.env.STORAGE_DRIVER === "s3"
  ? new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    })
  : null;

async function put(key: string, body: Buffer) {
  if (s3) {
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: body, ContentType: "image/webp" }));
    return;
  }
  const p = path.join(process.cwd(), ".data", "storage", key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

async function one(a: { id: string; externalUrl: string | null; ownerType: string | null }) {
  const r = await fetch(a.externalUrl!, { headers: { "User-Agent": UA, Accept: "image/*" }, signal: AbortSignal.timeout(30_000), redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 40 * 1024 * 1024) throw new Error("too large");
  const base = sharp(buf, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
  const full = await base.clone().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).toColourspace("srgb").webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).toColourspace("srgb").webp({ quality: 74 }).toBuffer();
  const k = `media/${(a.ownerType || "site").toLowerCase()}/seed/${a.id}`;
  await put(`${k}.webp`, full.data);
  await put(`${k}_t.webp`, thumb);
  await db.mediaAsset.update({
    where: { id: a.id },
    data: { key: `${k}.webp`, thumbKey: `${k}_t.webp`, mime: "image/webp", width: full.info.width, height: full.info.height, size: full.data.length, state: "READY" },
  });
}

async function main() {
  const todo = await db.mediaAsset.findMany({
    where: { key: null, externalUrl: { not: null }, state: retry ? { in: ["READY", "FAILED"] } : "READY" },
    select: { id: true, externalUrl: true, ownerType: true },
  });
  console.log(`${todo.length} images to import → ${s3 ? "S3/R2 bucket " + process.env.S3_BUCKET : ".data/storage"}`);
  let ok = 0, bad = 0, i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const a = todo[i++];
      try {
        await one(a);
        ok++;
        process.stdout.write(".");
      } catch (e) {
        bad++;
        await db.mediaAsset.update({ where: { id: a.id }, data: { state: "FAILED" } });
        process.stdout.write("x");
        if (process.env.VERBOSE) console.log(`\n  ${a.externalUrl} → ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`\n✓ imported ${ok}, ✗ failed ${bad} (failed ones show a placeholder; replace them in /admin)`);
  // tell a running site to drop its cached homepage
  console.log("Now press “ক্যাশ রিফ্রেশ করুন” in /admin/content so the live site picks up the new files.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
