/**
 * Create (or reset) an admin user from the command line.
 *   npm run admin:create -- --email you@example.org --name "Your Name" --role ADMIN
 * The password is read from ADMIN_PASSWORD or prompted (never passed as an argument).
 */
import "dotenv/config";
import { PrismaClient, type AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };

async function main() {
  const email = (arg("email") || process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const name = arg("name") || process.env.SEED_ADMIN_NAME || "Admin";
  const role = (arg("role") || "SUPER_ADMIN").toUpperCase().replace("-", "_") as AdminRole;
  if (!email || !["SUPER_ADMIN", "MODERATOR"].includes(role)) throw new Error("usage: --email x@y --name N --role SUPER_ADMIN|MODERATOR");
  let password = process.env.ADMIN_PASSWORD || "";
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password (≥ 12 chars): ");
    rl.close();
  }
  if (password.length < 12 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) throw new Error("password must be ≥ 12 characters with letters and numbers");
  const db = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const u = await db.adminUser.upsert({ where: { email }, create: { email, name, role, passwordHash }, update: { name, role, passwordHash, active: true, sessionVersion: { increment: 1 } } });
  await db.auditLog.create({ data: { adminId: null, actorName: "command line", action: "cli:upsert", entityType: "AdminUser", entityId: u.id, detail: { email, role } } });
  console.log(`✓ ${email} (${role}) ready`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
