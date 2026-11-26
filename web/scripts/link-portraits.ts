/**
 * Link the portraits from prisma/portraits.ts into an existing database WITHOUT re-seeding.
 * Only fills SITE slots that have no image yet — anything an admin uploaded is left alone.
 *
 *   npm run portraits:link              # dry run: lists what would be added
 *   npm run portraits:link -- --apply   # writes the rows
 *
 * Afterwards `npm run images:import` copies them into our storage (EXIF-stripped, resized).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PORTRAITS } from "../prisma/portraits";

const db = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const host = (process.env.DATABASE_URL ?? "").replace(/^.*@([^/:?]+).*$/, "$1");
  console.log(`database host: ${host}${apply ? "" : "  (dry run — pass --apply to write)"}`);
  const taken = new Set(
    (await db.mediaAsset.findMany({ where: { ownerType: "SITE", slot: { in: PORTRAITS.map((p) => p.slot) }, state: { not: "FAILED" } }, select: { slot: true } }))
      .map((a) => a.slot),
  );
  const todo = PORTRAITS.filter((p) => !taken.has(p.slot));
  for (const p of PORTRAITS) console.log(`${taken.has(p.slot) ? "skip (has image)" : "add             "}  ${p.slot.padEnd(8)} ${p.alt}`);
  if (!apply || !todo.length) return;
  await db.mediaAsset.createMany({
    data: todo.map((p) => ({
      state: "READY" as const, kind: "IMAGE" as const, externalUrl: p.url, alt: p.alt, caption: p.alt,
      credit: p.credit, license: p.license, sourceUrl: p.sourceUrl, ownerType: "SITE" as const, slot: p.slot, sort: 0,
    })),
  });
  console.log(`✓ added ${todo.length} portrait(s). The homepage cache refreshes within an hour (or after any admin content save).`);
}

main().finally(() => db.$disconnect());
