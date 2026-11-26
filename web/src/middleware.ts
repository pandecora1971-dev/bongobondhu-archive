import { NextResponse, type NextRequest } from "next/server";
import { requestIsSameOrigin } from "./lib/security";
import { ADMIN, ADMIN_HIDDEN, INTERNAL_ADMIN, toInternalAdmin } from "./lib/admin-path";

/**
 * - Per-request CSP nonce (Next applies it to its own scripts automatically).
 * - Admin lives behind the secret ADMIN_PATH (see lib/admin-path.ts); plain /admin answers 404.
 * - Cheap admin gate: no session cookie → <ADMIN>/login. Real authorisation happens
 *   server-side in every admin page and action (requireAdmin()).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isInternalAdmin = pathname === INTERNAL_ADMIN || pathname.startsWith(INTERNAL_ADMIN + "/");
  // the internal route is never reachable directly once the panel has a secret address
  if (ADMIN_HIDDEN && isInternalAdmin) return notFound(req);
  const adminPath = toInternalAdmin(pathname); // "/admin/…" when this is an admin request, else null
  const dev = process.env.NODE_ENV !== "production";
  const privatePage = adminPath !== null || pathname.startsWith("/api/auth") || pathname.startsWith("/report");
  const secure = (res: NextResponse) => {
    if (privatePage) {
      res.headers.set("Cache-Control", "private, no-store");
      res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      res.headers.set("Referrer-Policy", "no-referrer");
    }
    return res;
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      !requestIsSameOrigin(req, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", !dev)) {
    return secure(new NextResponse(null, { status: 403 }));
  }

  if (adminPath !== null && !adminPath.startsWith(INTERNAL_ADMIN + "/login")) {
    const has =
      req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
    if (!has) {
      const url = req.nextUrl.clone();
      url.pathname = ADMIN + "/login";
      url.search = "";
      return secure(NextResponse.redirect(url));
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const s3 = process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : "";
  const bucketHost =
    process.env.S3_ENDPOINT && process.env.S3_FORCE_PATH_STYLE !== "true"
      ? `https://${process.env.S3_BUCKET}.${new URL(process.env.S3_ENDPOINT).host}`
      : "";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.youtube.com https://s.ytimg.com https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `media-src 'self' blob: https://commons.wikimedia.org https://upload.wikimedia.org`,
    `frame-src https://www.youtube-nocookie.com https://www.youtube.com https://challenges.cloudflare.com`,
    `connect-src 'self' https://challenges.cloudflare.com ${s3} ${bucketHost} https://*.r2.cloudflarestorage.com${dev ? " ws: http://localhost:*" : ""}`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    dev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  let res: NextResponse;
  if (adminPath !== null && ADMIN_HIDDEN) {
    const url = req.nextUrl.clone();
    url.pathname = adminPath;
    res = NextResponse.rewrite(url, { request: { headers } });
  } else {
    res = NextResponse.next({ request: { headers } });
  }
  res.headers.set("Content-Security-Policy", csp);
  return secure(res);
}

/** same answer as any unknown address, so the internal route reveals nothing */
function notFound(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/__not-found";
  url.search = "";
  const res = NextResponse.rewrite(url);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|api/media|map/|favicon.ico|icon.svg|og-default.png|robots.txt).*)",
    },
  ],
};
