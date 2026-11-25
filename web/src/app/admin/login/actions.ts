"use server";
import { AuthError } from "next-auth";
import { checkPassword, signIn, TooMany } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailOtpEnabled, maskEmail, startChallenge } from "@/lib/login-otp";

export type LoginState = {
  error?: "bad" | "rate" | "send" | "code";
  /** set once the password was right and a code was emailed */
  challenge?: string;
  to?: string;
} | null;

const fail = (e: unknown, base: LoginState = {}): LoginState => {
  if (e instanceof AuthError) return { ...base, error: (e as AuthError & { code?: string }).code === "rate_limited" ? "rate" : base?.challenge ? "code" : "bad" };
  throw e; // NEXT_REDIRECT on success
};

/** Step 1: email + password. With email codes on, this emails a code instead of signing in. */
export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  if (!emailOtpEnabled()) {
    try {
      await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirectTo: "/admin" });
      return null;
    } catch (e) {
      return fail(e);
    }
  }
  let u;
  try {
    u = await checkPassword({ email: fd.get("email"), password: fd.get("password") });
  } catch (e) {
    if (e instanceof TooMany) return { error: "rate" };
    throw e;
  }
  if (!u) return { error: "bad" };
  const challenge = await startChallenge(u);
  if (!challenge) return { error: "send" };
  await db.auditLog.create({ data: { adminId: u.id, actorName: u.name, actorEmail: u.email, actorRole: u.role, action: "login:code-sent", entityType: "AdminUser", entityId: u.id } });
  return { challenge, to: maskEmail(u.email) };
}

/** Step 2: the 6-digit code from the email. */
export async function verifyCode(prev: LoginState, fd: FormData): Promise<LoginState> {
  const challenge = String(fd.get("challenge") ?? "");
  const base = { challenge, to: prev?.to };
  try {
    await signIn("credentials", { challenge, code: String(fd.get("code") ?? "").trim(), redirectTo: "/admin" });
    return null;
  } catch (e) {
    return fail(e, base);
  }
}
