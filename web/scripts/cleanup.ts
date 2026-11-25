/**
 * Housekeeping — run daily (cron / Vercel Cron / GitHub Action):
 *   - deletes uploads that were presigned but never attached to a submission (> 24 h)
 *   - deletes expired rate-limit windows
 *   - deletes used or expired admin login codes
 *   npm run cleanup
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "node:fs";
import path from "node:path";

const db = new PrismaClient();
const s3 = process.env.STORAGE_DRIVER === "s3"
  ? new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } })
  : null;
const del = (key: string) =>
  s3 ? s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key })).then(() => {}) : fs.rm(path.join(process.cwd(), ".data", "storage", key), { force: true });

async function main() {
  const stale = await db.mediaAsset.findMany({ where: { state: "PENDING", ownerId: null, createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } }, select: { id: true, key: true } });
  for (const a of stale) if (a.key) await del(a.key).catch(() => {});
  await db.mediaAsset.deleteMany({ where: { id: { in: stale.map((a) => a.id) } } });
  const rl = await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  const otp = await db.adminLoginChallenge.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } });
  console.log(`✓ removed ${stale.length} abandoned uploads, ${rl.count} expired rate-limit rows, ${otp.count} old login codes`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
