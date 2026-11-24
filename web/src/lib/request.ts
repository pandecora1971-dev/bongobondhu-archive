import "server-only";
import { headers } from "next/headers";
import { env } from "./env";
import { requestClientIp, requestIsSameOrigin } from "./security";

/** Client IP from proxy headers. Only ever used hashed (rate limiting) — never stored or logged. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  // On other hosts, opt into a header only when a trusted reverse proxy
  // overwrites it and direct access to the origin server is blocked.
  return requestClientIp(h, process.env.VERCEL === "1", process.env.TRUSTED_PROXY_IP_HEADER);
}

/** Reject cross-site POSTs to route handlers (server actions already check Origin). */
export function sameOrigin(req: Request): boolean {
  return requestIsSameOrigin(req, env.siteUrl, env.isProd);
}
