import "server-only";
import { db } from "./db";
import { env } from "./env";
import { sha256 } from "./crypto";
import { clientIp } from "./request";

export type Limit = { limit: number; windowSec: number };

export const LIMITS = {
  contribution: { limit: 8, windowSec: 3600 },
  complaint: { limit: 6, windowSec: 3600 },
  post: { limit: 10, windowSec: 3600 },
  presign: { limit: 60, windowSec: 3600 },
  presignMB: { limit: 1500, windowSec: 3600 }, // ≤ 1.5 GB of uploads per IP per hour
  status: { limit: 20, windowSec: 900 },
  followup: { limit: 10, windowSec: 3600 },
  login: { limit: 10, windowSec: 900 },
  loginAccount: { limit: 6, windowSec: 900 },
  feed: { limit: 600, windowSec: 600 },
} satisfies Record<string, Limit>;

/**
 * Fixed-window limiter in Postgres (works across serverless instances).
 * The key is sha256(salt|bucket|ip|window): the raw IP is never written anywhere,
 * and rows expire with the window (short TTL).
 */
export async function rateLimit(bucket: keyof typeof LIMITS, extra = "", opts: { perIp?: boolean; cost?: number } = {}): Promise<{ ok: boolean; retryAfter: number }> {
  const { limit, windowSec } = LIMITS[bucket];
  const ip = opts.perIp === false ? "*" : await clientIp();
  const now = Date.now();
  const win = Math.floor(now / (windowSec * 1000));
  const key = sha256(`${env.rateLimitSalt}|${bucket}|${ip}|${extra}|${win}`);
  const resetAt = new Date((win + 1) * windowSec * 1000);
  const cost = Math.max(1, Math.ceil(opts.cost ?? 1));

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, ${cost}, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimit"."count" + ${cost}
    RETURNING "count"`;

  // opportunistic cleanup of expired windows (~1% of calls)
  if (Math.random() < 0.01) {
    db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
  }

  const count = Number(rows[0]?.count ?? 1);
  return { ok: count <= limit, retryAfter: Math.ceil((resetAt.getTime() - now) / 1000) };
}
