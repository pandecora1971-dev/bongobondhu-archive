/**
 * The public address of the admin panel.
 *
 * The pages live in app/admin/ (internal route "/admin"), but visitors reach them only through
 * the secret path set in the ADMIN_PATH environment variable (e.g. ADMIN_PATH=some-long-word).
 * middleware.ts rewrites /<ADMIN_PATH>/… to /admin/… and answers 404 for /admin itself.
 * The repository is public, so the secret must never be written into the code — only into
 * the hosting environment (Vercel → Settings → Environment Variables) and the local .env.
 *
 * Without ADMIN_PATH the panel stays at /admin (local development, or a missing variable).
 * Server-only value: client components receive it as a prop.
 */
export const INTERNAL_ADMIN = "/admin";

function slug(): string {
  const raw = (process.env.ADMIN_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!raw) return "admin";
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(raw)) throw new Error("ADMIN_PATH must be 8–100 letters, digits, '-' or '_'");
  return raw;
}

/** e.g. "/rstsj…" — prefix for every admin link, redirect and form "back" value */
export const ADMIN = `/${slug()}`;

/** true when the panel is hidden behind a secret path (so plain /admin must 404) */
export const ADMIN_HIDDEN = ADMIN !== INTERNAL_ADMIN;

/** "/<secret>/x" → "/admin/x"; null when the path is not under the public admin prefix */
export function toInternalAdmin(pathname: string): string | null {
  if (pathname !== ADMIN && !pathname.startsWith(ADMIN + "/")) return null;
  return INTERNAL_ADMIN + pathname.slice(ADMIN.length);
}
