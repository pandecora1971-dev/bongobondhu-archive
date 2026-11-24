# Security hardening — 24 November 2026

Security changes are saved locally and prepared for the owner's private GitHub repository.
Production deployment has not been verified: access to the signed-in Chrome session
requires computer-control approval, and this checkout has no Vercel project link.
No production release has been made.

## Fixed

- Media access is checked on every request. Successful files, redirects and denials use
  `private, no-store`. Disabling the separate Next.js image optimizer prevents a cached
  approved image from continuing to bypass a later hide/rejection. Images still use the
  existing resize, WebP and EXIF/GPS stripping pipeline.
- Approved contributions cannot expose PDF/audio/video through a guessed media URL.
  These files retain metadata and stay available only to permitted reviewers.
- Production CAPTCHA rejects Cloudflare test credentials, missing keys, disabled
  verification, oversized tokens, network failures and tokens for another hostname.
  Verification no longer transmits visitors' raw IP addresses to Cloudflare.
- Route handlers and middleware enforce the configured full origin, including scheme
  and port. Request-controlled Host/forwarded-host headers cannot approve a foreign
  origin. Production writes without Origin require explicit same-origin Fetch Metadata.
- On Vercel, rate limiting reads only the platform-provided `x-vercel-forwarded-for`.
  Spoofed Cloudflare and generic forwarding headers are ignored. On other hosts, set
  `TRUSTED_PROXY_IP_HEADER` only behind a proxy that overwrites it and prevents direct
  access to the origin. Otherwise requests share a conservative rate-limit bucket.
- Chunked uploads are bounded while reading, in addition to declared-size validation.
  Local upload endpoints are unavailable on Vercel and require explicit opt-in for a
  local production-mode test. Invalid sizes and oversized multipart bodies are rejected.
- Admin, authentication and report responses have no-store and noindex headers and
  suppress referrers. Prefetch headers no longer skip middleware checks.
- Short/development signing secrets and the known development encryption key are
  refused in production. Existing encryption data/key derivation was not changed.
- Public submission/storage failures log fixed operation names; automatic Prisma error
  logging is disabled because raw errors can contain private query arguments.
- The database integration suite now requires `SECURITY_TEST_DATABASE=true`, preventing
  accidental fixture writes without an explicit disposable-database designation.

## Verification

- Passed: isolated behavioral security regressions against the real policy, CAPTCHA,
  body-reader, middleware, environment and media-route modules, with DB/storage/network
  adapters stubbed. Run `npm run test:security:unit` after dependencies are installed.
- Passed: existing 28 validation/pagination assertions and additional URL/form cases,
  using the exact locally cached Zod 4.6.7 and TypeScript 5.9.3.
- Passed: syntax checks for 100 TypeScript files, standalone strict typechecking of
  the request policy/body reader, and Node syntax checks of both security test scripts.
- Full application typecheck, lint, build and database security integration tests remain
  unverified. This checkout lacks runnable dependencies; online installation failed,
  and offline installation confirmed missing cached packages. No disposable database
  or running test server was available. Tests were not run against production.
- CI now runs the new security suite before building and uses its disposable PostgreSQL
  database for the existing integration suite.

## Before production verification

1. Install the locked dependencies with `npm ci`. Run `npm run typecheck`,
   `npm run lint`, `npm run test:validation`, `npm run test:security:unit` and
   `npm run build` in a functioning environment.
2. Against a disposable database and running test server only, run the existing
   `npm run test:security` with `SECURITY_TEST_DATABASE=true` and test admin credentials.
3. Set the exact HTTPS `NEXT_PUBLIC_SITE_URL`, strong production signing secrets,
   real Turnstile keys and private S3/R2 storage. Check database public API exposure
   separately (for Supabase, disable public schema exposure or enforce deny-by-default RLS).
4. Preserve the existing `ENCRYPTION_KEY` wherever real encrypted records exist.
   If the known development key was used for real records, re-encrypt them through a
   controlled migration; changing the key directly would make them unreadable.
5. Deploy through the owner's account, purge previous image/media CDN caches if any,
   then check HTTPS, security headers, anonymous admin/evidence denial, CAPTCHA and
   hide/reject behavior on the live URL. Previously downloaded browser copies cannot
   be recalled. No claim of complete or production-verified security is made.

References used: [Next.js image caching](https://nextjs.org/docs/15/app/api-reference/components/image),
[Cloudflare Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
[Vercel request headers](https://vercel.com/docs/headers/request-headers).
