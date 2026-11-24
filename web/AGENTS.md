# Instructions for AI assistants

Before doing anything, read **../README.md** (the project root README). It contains the full project state,
the Supabase + Cloudflare R2 setup steps, the architecture, the rules that must not be broken (section 8),
the TODO list and known gotchas. Admin roles / log book / security audit: ../ADMIN_GUIDE.md. Setup commands in detail: ./README.md.

Key rules in short:
- Complaints are never public; every public submission starts PENDING.
- Never store IPs or log personal data; images must go through processImage() (strips GPS).
- Roles: SUPER_ADMIN (no limits) and MODERATOR (only granted permissions). Every admin page/action/route: requireAdmin(permission | "SUPER"); every mutation: audit(me, …). The log book is append-only (DB trigger).
- After changes run: npm run typecheck, npm run test:validation, and npm run test:security against a TEST database.
- Keep Bangla copy verbatim; do not redesign the homepage (styles/home.css is the prototype CSS).
- Git: never add an AI "Co-Authored-By" line; commit only when the owner asks.
