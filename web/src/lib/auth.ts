import "server-only";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminRole, Permission } from "@prisma/client";
import { db } from "./db";
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.authSecret,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const p = loginSchema.safeParse(raw);
        if (!p.success) return null;
        // throttle per IP *and* per account (stops slow distributed guessing of one admin)
        const [byIp, byAcct] = await Promise.all([rateLimit("login"), rateLimit("loginAccount", sha256(p.data.email), { perIp: false })]);
        if (!byIp.ok || !byAcct.ok) throw new TooMany();
        const u = await db.adminUser.findUnique({ where: { email: p.data.email } });
        // always run bcrypt so response time does not reveal whether the email exists
        const ok = await bcrypt.compare(p.data.password, u?.passwordHash ?? (DUMMY ??= bcrypt.hashSync("dummy-password", 12)));
        if (!u || !u.active || !ok) {
          if (u) await db.auditLog.create({ data: { adminId: u.id, actorName: u.name, actorEmail: u.email, actorRole: u.role, action: "login:failed", entityType: "AdminUser", entityId: u.id } });
          return null;
        }
        await db.adminUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
        await db.auditLog.create({ data: { adminId: u.id, actorName: u.name, actorEmail: u.email, actorRole: u.role, action: "login", entityType: "AdminUser", entityId: u.id } });
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
  if (!me) redirect("/admin/login");
  if (need === "SUPER" ? !me.super : need ? !can(me, need) : false) redirect("/admin?denied=1");
  return me;
}

/** Same check for route handlers: returns null instead of redirecting. */
export async function adminOrNull(need?: Permission | "SUPER"): Promise<Admin | null> {
  const me = await currentAdmin();
  if (!me) return null;
  if (need === "SUPER" ? !me.super : need ? !can(me, need) : false) return null;
  return me;
}
