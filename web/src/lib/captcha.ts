import "server-only";
import { env } from "./env";
import { captchaConfigIsSafe, captchaResultIsValid } from "./security";

/** Cloudflare Turnstile server-side verification. Fails closed in production. */
export async function verifyCaptcha(token: string | null | undefined): Promise<boolean> {
  if (env.captchaDisabled && !env.isProd) return true;
  if (env.isProd && !captchaConfigIsSafe(env.turnstileSecret, process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "", env.captchaDisabled)) return false;
  if (!env.turnstileSecret) return !env.isProd;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    // remoteip is optional; do not transmit the visitor's IP to the verifier.
    const body = new URLSearchParams({ secret: env.turnstileSecret, response: token });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return false;
    const j: unknown = await r.json();
    return env.isProd ? captchaResultIsValid(j, env.siteUrl) : !!j && typeof j === "object" && "success" in j && j.success === true;
  } catch {
    return false;
  }
}
