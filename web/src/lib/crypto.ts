import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { env } from "./env";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const hmac = (key: string, s: string) => createHmac("sha256", key).update(s).digest("base64url");

// Unambiguous alphabet (no 0/O/1/I) — same as the prototype
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const randomCode = (n: number) => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join("");
export const randomToken = (bytes = 24) => randomBytes(bytes).toString("base64url");

function key(): Buffer {
  const k = Buffer.from(env.encryptionKey, "base64");
  if (k.length < 32) return createHash("sha256").update(env.encryptionKey).digest();
  return k.subarray(0, 32);
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url) */
export function encrypt(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    const [v, iv, tag, ct] = enc.split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** scrypt hash for the complaint secret key: scrypt$<salt>$<hash> */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scryptAsync(secret.trim().toUpperCase(), salt, 32);
  return `scrypt$${salt.toString("base64url")}$${h.toString("base64url")}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [alg, s, h] = stored.split("$");
  if (alg !== "scrypt" || !s || !h) return false;
  const got = await scryptAsync(secret.trim().toUpperCase(), Buffer.from(s, "base64url"), 32);
  const want = Buffer.from(h, "base64url");
  return got.length === want.length && timingSafeEqual(got, want);
}
