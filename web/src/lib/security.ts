/** Request policies shared by server code and security regression tests. */
export function requestIsSameOrigin(req: Request, siteUrl: string, isProd: boolean): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;
  const origin = req.headers.get("origin");
  // Browser writes send Origin. Missing headers need explicit same-origin metadata.
  if (!origin) return fetchSite === "same-origin" || (!isProd && !fetchSite);
  try {
    const supplied = new URL(origin);
    const expected = new URL(siteUrl);
    return supplied.origin === origin && supplied.origin === expected.origin;
  } catch {
    return false;
  }
}

/** Vercel overwrites this header; arbitrary Cloudflare headers are not trusted. */
export function requestClientIp(h: Pick<Headers, "get">, vercel: boolean, trustedProxyHeader = ""): string {
  const value = vercel
    ? h.get("x-vercel-forwarded-for")
    : trustedProxyHeader ? h.get(trustedProxyHeader) : null;
  return value?.split(",")[0]?.trim() || "0.0.0.0";
}

export function captchaConfigIsSafe(secret: string, siteKey: string, disabled: boolean): boolean {
  const testKey = /^[123]x0+/;
  return !disabled && !!secret && !!siteKey && !testKey.test(secret) && !testKey.test(siteKey);
}

export function captchaResultIsValid(result: unknown, siteUrl: string): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as { success?: unknown; hostname?: unknown };
  try {
    return r.success === true && r.hostname === new URL(siteUrl).hostname;
  } catch {
    return false;
  }
}

/** Public submissions' PDFs/audio/video retain metadata and need private review. */
export function canPublishMedia(ownerType: string | null, kind: string): boolean {
  return (ownerType !== "CONTRIBUTION" && ownerType !== "POST") || kind === "IMAGE";
}
