import { ADMIN } from "@/lib/admin-path";
import "server-only";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminRole, AdminUser, Permission } from "@prisma/client";
import { db } from "./db";
import { emailOtpEnabled, verifyChallenge } from "./login-otp";
import { rateLimit } from "./ratelimit";
import { sha256 } from "./crypto";
import { env } from "./env";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: AdminRole } & DefaultSession["user"];
  }
  interface User {
    role?: AdminRole;
    sv?: number;
  }
}

class TooMany extends CredentialsSignin {
  code = "rate_limited";
}

let DUMMY: string | undefined;
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });
const codeSchema = z.object({ challenge: z.string().min(20).max(100), code: z.string().trim().regex(/^\d{6}$/) });

const logRow = (u: AdminUser, action: string) =>
  db.auditLog.create({ data: { adminId: u.id, actorName: u.name, actorEmail: u.email, actorRole: u.role, action, entityType: "AdminUser", entityId: u.id } });

/**
 * Login step 1: email + password, throttled per IP *and* per account (stops slow distributed
 * guessing of one admin). Returns the account, null for a wrong login, or throws TooMany.
 */
export async function checkPassword(raw: unknown): Promise<AdminUser | null> {
  const p = loginSchema.safeParse(raw);
  if (!p.success) return null;
  const [byIp, byAcct] = await Promise.all([rateLimit("login"), rateLimit("loginAccount", sha256(p.data.email), { perIp: false })]);
  if (!byIp.ok || !byAcct.ok) throw new TooMany();
  const u = await db.adminUser.findUnique({ where: { email: p.data.email } });
  // always run bcrypt so response time does not reveal whether the email exists
  const ok = await bcrypt.compare(p.data.password, u?.passwordHash ?? (DUMMY ??= bcrypt.hashSync("dummy-password", 12)));
  if (!u || !u.active || !ok) {
    if (u) await logRow(u, "login:failed");
    return null;
  }
  return u;
}

export { TooMany };

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.authSecret,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: `${ADMIN}/login`, error: `${ADMIN}/login` },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, challenge: {}, code: {} },
      async authorize(raw) {
        let u: AdminUser | null;
        if (emailOtpEnabled()) {
          // Login step 2: the emailed code. A plain email + password is refused while codes are on.
          const p = codeSchema.safeParse(raw);
          if (!p.success) return null;
          if (!(await rateLimit("login")).ok) throw new TooMany();
          const r = await verifyChallenge(p.data.challenge, p.data.code);
          u = r.adminId ? await db.adminUser.findUnique({ where: { id: r.adminId } }) : null;
          if (!u || !u.active) {
            const known = r.knownAdminId ? await db.adminUser.findUnique({ where: { id: r.knownAdminId } }) : null;
            if (known) await logRow(known, "login:code-failed");
            return null;
          }
        } else {
          u = await checkPassword(raw);
          if (!u) return null;
        }
        await db.adminUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
        await logRow(u, "login");
        return { id: u.id, email: u.email, name: u.name, role: u.role, sv: u.sessionVersion };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.sv = user.sv;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.role = (token.role as AdminRole) ?? "MODERATOR";
      (session as unknown as { sv?: number }).sv = token.sv as number | undefined;
      return session;
    },
  },
});

export type Admin = { id: string; name: string; email: string; role: AdminRole; permissions: Permission[]; super: boolean };

/** Every permission check in the app goes through here. Super admins have no limits. */
export const can = (me: Admin | null | undefined, p: Permission) => !!me && (me.super || me.permissions.includes(p));

/**
 * Who is logged in? Re-reads the account on every call, so deactivation, deletion,
 * role / permission / password changes and "log out everywhere" take effect immediately.
 */
export async function currentAdmin(): Promise<Admin | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  const u = await db.adminUser.findUnique({ where: { id: s.user.id } });
  const sv = (s as unknown as { sv?: number }).sv;
  if (!u || !u.active || sv !== u.sessionVersion) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, permissions: u.permissions, super: u.role === "SUPER_ADMIN" };
}

/**
 * Call at the top of every admin page and server action.
 *   requireAdmin()             → any active admin
 *   requireAdmin("POSTS")      → super admin, or a moderator holding that permission
 *   requireAdmin("SUPER")      → super admin only
 */
export async function requireAdmin(need?: Permission | "SUPER"): Promise<Admin> {
  const me = await currentAdmin();
  if (!me) redirect(`${ADMIN}/login`);
  if (need === "SUPER" ? !me.super : need ? !can(me, need) : false) redirect(`${ADMIN}?denied=1`);
  return me;
}

/** Same check for route handlers: returns null instead of redirecting. */
export async function adminOrNull(need?: Permission | "SUPER"): Promise<Admin | null> {
  const me = await currentAdmin();
  if (!me) return null;
  if (need === "SUPER" ? !me.super : need ? !can(me, need) : false) return null;
  return me;
}
