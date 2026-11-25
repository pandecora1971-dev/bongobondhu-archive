import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import { hmac, randomToken, sha256 } from "./crypto";

/**
 * Second login step (as on BNPNAMA): after a correct password, a 6-digit code is emailed to the
 * admin's own address. Turned on by setting RESEND_API_KEY. While it is on, Auth.js refuses a plain
 * email + password sign-in, so the code cannot be skipped by posting to /api/auth directly.
 */
export const OTP_TTL_MIN = 10;
const MAX_TRIES = 5;

export const emailOtpEnabled = () => !!process.env.RESEND_API_KEY;

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const shown = user.length <= 2 ? user[0] + "*" : user[0] + "*".repeat(Math.min(user.length - 2, 6)) + user[user.length - 1];
  return `${shown}@${domain}`;
}

const codeHash = (id: string, code: string) => hmac(env.authSecret, `login-otp|${id}|${code}`);

/** Creates a single-use challenge, emails the code and returns the token the browser keeps. */
export async function startChallenge(user: { id: string; email: string; name: string }): Promise<string | null> {
  const token = randomToken(32);
  const id = sha256(token);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // one live code per account: a new password step cancels the previous code
  await db.adminLoginChallenge.deleteMany({ where: { OR: [{ adminId: user.id }, { expiresAt: { lt: new Date() } }] } });
  await db.adminLoginChallenge.create({ data: { id, adminId: user.id, codeHash: codeHash(id, code), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000) } });
  if (!(await sendCode(user.email, user.name, code))) {
    await db.adminLoginChallenge.delete({ where: { id } }).catch(() => {});
    return null;
  }
  return token;
}

/** Returns the admin id when the code is right; each challenge allows 5 tries and one success. */
export async function verifyChallenge(token: string, code: string): Promise<{ adminId: string | null; knownAdminId: string | null }> {
  if (!/^\d{6}$/.test(code) || token.length < 20 || token.length > 100) return { adminId: null, knownAdminId: null };
  const id = sha256(token);
  // count the try first (atomic), so parallel guesses cannot exceed the limit
  const counted = await db.adminLoginChallenge.updateMany({
    where: { id, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: MAX_TRIES } },
    data: { attempts: { increment: 1 } },
  });
  const row = await db.adminLoginChallenge.findUnique({ where: { id } });
  if (!counted.count || !row) return { adminId: null, knownAdminId: row?.adminId ?? null };
  const a = Buffer.from(row.codeHash), b = Buffer.from(codeHash(id, code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { adminId: null, knownAdminId: row.adminId };
  const used = await db.adminLoginChallenge.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
  return { adminId: used.count === 1 ? row.adminId : null, knownAdminId: row.adminId };
}

async function sendCode(to: string, name: string, code: string): Promise<boolean> {
  const from = process.env.OTP_EMAIL_FROM || "Archive Security <onboarding@resend.dev>";
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `অ্যাডমিন লগইন কোড: ${code}`,
        text: `${name}, আপনার লগইন কোড: ${code}\nকোডটির মেয়াদ ${OTP_TTL_MIN} মিনিট। আপনি লগইনের চেষ্টা না করে থাকলে এখনই পাসওয়ার্ড বদলান।`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #aaa99f;background:#f4f2ec;color:#12120f">
<h2 style="margin:0 0 12px;font-size:20px">বঙ্গবন্ধু ও বাংলাদেশ <span style="color:#ff7873">′</span> অ্যাডমিন লগইন</h2>
<p style="font-size:15px;line-height:1.6">${esc(name)}, প্যানেলে প্রবেশ করতে নিচের ৬ সংখ্যার কোডটি লিখুন:</p>
<div style="border:1px solid #12120f;background:#fff;padding:16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0">${code}</div>
<p style="font-size:13px;color:#6a685e">কোডটির মেয়াদ ${OTP_TTL_MIN} মিনিট। আপনি লগইনের চেষ্টা না করে থাকলে এখনই পাসওয়ার্ড বদলান এবং একজন সুপার অ্যাডমিনকে জানান।</p>
</div>`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false; // never log the address or the code
  }
}
