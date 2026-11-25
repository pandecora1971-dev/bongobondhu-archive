/**
 * Creates (or re-keys) a restricted database account for the website: it can read and write rows,
 * but cannot create, alter or drop tables, cannot touch the migrations table, and cannot edit or
 * delete log-book entries. Migrations keep using the owner account in DIRECT_URL.
 *
 *   npm run db:app-role
 *
 * Run it after `prisma migrate deploy`, and again after any later migration that adds tables.
 * It prints the new DATABASE_URL once; put it in .env and in Vercel. Nothing is written to disk.
 * Works on Neon, Supabase and plain PostgreSQL.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const ROLE = "archive_app";
const ownerUrl = process.env.DIRECT_URL ?? "";
if (!ownerUrl) throw new Error("DIRECT_URL (the owner connection) is required");

const db = new PrismaClient({ datasources: { db: { url: ownerUrl } } });
const password = randomBytes(24).toString("hex"); // hex: safe inside SQL and URLs

async function main() {
  const exists = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM pg_roles WHERE rolname = '${ROLE}'`);
  // A new role is NOSUPERUSER / NOCREATEDB / NOCREATEROLE / NOBYPASSRLS by default.
  // Hosted Postgres (Neon, Supabase) refuses to restate those attributes in ALTER ROLE.
  await db.$executeRawUnsafe(`${exists[0]?.n ? "ALTER" : "CREATE"} ROLE ${ROLE} WITH LOGIN PASSWORD '${password}'`);
  const attrs = await db.$queryRawUnsafe<{ s: boolean; d: boolean; r: boolean }[]>(
    `SELECT rolsuper AS s, rolcreatedb AS d, rolcreaterole AS r FROM pg_roles WHERE rolname = '${ROLE}'`,
  );
  if (attrs[0]?.s || attrs[0]?.d || attrs[0]?.r) throw new Error(`${ROLE} has extra powers (superuser / create db / create role); remove them first`);
  const dbName = (await db.$queryRawUnsafe<{ d: string }[]>(`SELECT current_database() AS d`))[0].d;
  const sql = [
    `GRANT CONNECT ON DATABASE "${dbName}" TO ${ROLE}`,
    `REVOKE CREATE ON SCHEMA public FROM PUBLIC`,
    `GRANT USAGE ON SCHEMA public TO ${ROLE}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE}`,
    // log book: add only (the database trigger also blocks edits for everyone)
    `REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog" FROM ${ROLE}`,
    `REVOKE ALL ON "_prisma_migrations" FROM ${ROLE}`,
  ];
  for (const s of sql) await db.$executeRawUnsafe(s);

  const u = new URL(process.env.DATABASE_URL || ownerUrl);
  // Supabase pooler user names look like "postgres.<project-ref>"; keep the suffix
  const dot = decodeURIComponent(u.username).indexOf(".");
  u.username = dot > 0 ? `${ROLE}${decodeURIComponent(u.username).slice(dot)}` : ROLE;
  u.password = password;
  console.log(`✓ restricted account "${ROLE}" is ready.`);
  console.log(`  Put this in .env and in Vercel as DATABASE_URL (keep DIRECT_URL as the owner):\n`);
  console.log(`  DATABASE_URL="${u.toString()}"\n`);
  console.log(`  This password is shown only once. Running the script again creates a new one.`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(() => db.$disconnect());
