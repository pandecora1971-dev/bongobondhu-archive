# বঙ্গবন্ধু ও বাংলাদেশ — web app

Production rebuild of the HTML prototype (`../Homepage v2.html`, `../Report.dc.html`, `../Dusshomoy.dc.html`) as a full-stack Next.js app.

| | |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Components, Server Actions), TypeScript |
| Database | PostgreSQL via Prisma 6 (works with Supabase, Neon or any Postgres) |
| Storage | S3-compatible: **Cloudflare R2**, MinIO, AWS S3 or Supabase Storage, with presigned browser uploads. A local-disk driver is included for development. |
| Images | `sharp`: EXIF/GPS stripped, resized to ≤2400 px WebP, 640 px thumbnails, served through `next/image` |
| Auth | Auth.js v5 credentials (admins only; visitors never log in) |
| Validation | zod, the same schemas on client and server |
| Captcha | Cloudflare Turnstile on every public form |
| i18n | `lang` cookie (`bn` default / `en`) with dictionaries in `src/i18n/` |

---

## 1. Run it locally

### Requirements
- Node.js ≥ 20.9
- PostgreSQL 14+ (Docker, Postgres.app, Homebrew, or a free Supabase project)

### Steps
```bash
cd web
npm install
cp .env.example .env            # then edit DATABASE_URL / DIRECT_URL and the secrets

# Option A: Postgres + MinIO in Docker
docker compose up -d            # Postgres on :5432, MinIO on :9000 (console :9001)

npx prisma migrate deploy       # create tables
npm run db:seed                 # load the prototype content + first admin (SEED_ADMIN_* in .env)
npm run images:import           # copy all prototype images into your storage (≈1 min)
npm run dev                     # http://localhost:3000   ·   admin: http://localhost:3000/admin
```

Generate each secret with `openssl rand -base64 32`. `SEED_ADMIN_PASSWORD` must be at least 12 characters.

With `STORAGE_DRIVER="local"` uploads go to `./.data/storage`, so nothing else needs to be set up for development.

### Useful scripts
| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:seed` | Seed content from `prisma/seed-data/*.json` (converted 1:1 from `data.js`, `img.js`, `p60.js`, `catalog.json`). It skips content if already seeded; `SEED_FORCE=1` replaces all content (never submissions). |
| `npm run images:import` | Download every seed image into storage. Dead links are marked FAILED and show a placeholder. Afterwards, press **ক্যাশ রিফ্রেশ করুন** in `/admin/content`. |
| `npm run admin:create -- --email you@x.org --name "Name" --role SUPER_ADMIN` | Create or reset an account (`SUPER_ADMIN` / `MODERATOR`). The password is prompted or read from `ADMIN_PASSWORD`. |
| `npm run cleanup` | Daily housekeeping: abandoned uploads and expired rate-limit rows |
| `npm run db:studio` | Prisma Studio |

---

## 2. Connect Supabase (PostgreSQL)

1. Create a project at supabase.com. Choose the region closest to Bangladesh (e.g. Singapore).
2. Go to **Project Settings → Database → Connection string** and copy two strings:
   - **Transaction pooler** (port **6543**) → `DATABASE_URL`, adding `?pgbouncer=true&connection_limit=1`
   - **Session pooler / direct** (port **5432**) → `DIRECT_URL`
3. Create the tables and load the content:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
4. The app connects to Postgres directly with its own access control, so Supabase Row Level Security is not used. Do **not** expose these tables through Supabase's public REST API: in **API settings** remove `public` from the exposed schemas, or enable RLS with no policies on every table.

## 3. Connect Cloudflare R2 (storage)

1. In Cloudflare, go to **R2 → Create bucket** (e.g. `archive`) and keep it **private**. The app serves every file itself through `/api/media/[id]` so it can enforce who sees what.
2. **R2 → Manage API tokens → Create token** with *Object Read & Write* on that bucket. Copy the Access Key ID, the Secret and the account endpoint.
3. Set these values in `.env` (or in Vercel):
   ```
   STORAGE_DRIVER="s3"
   S3_BUCKET="archive"
   S3_REGION="auto"
   S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
   S3_ACCESS_KEY_ID="…"
   S3_SECRET_ACCESS_KEY="…"
   S3_FORCE_PATH_STYLE="false"
   ```
4. **CORS**: browsers upload straight to R2 with presigned URLs. Under bucket **Settings → CORS policy**, add:
   ```json
   [{ "AllowedOrigins": ["https://YOUR-DOMAIN", "http://localhost:3000"],
      "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
   ```
5. Run `npm run images:import` once against R2, then press **ক্যাশ রিফ্রেশ করুন** in `/admin/content`.

## 4. Deploy to Vercel

1. Push the `web/` folder to a Git repo and import it in Vercel, with the **Root Directory** set to `web`.
2. Add every variable from `.env.example` in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SITE_URL` is your real domain.
   - `STORAGE_DRIVER=s3`, because local storage is refused on Vercel.
   - Use real Turnstile keys from the Cloudflare dashboard → Turnstile → Add site.
   - Use fresh secrets, not your local ones.
3. Vercel's build runs `prisma generate && next build`. Run migrations from your machine or CI with `npx prisma migrate deploy`, pointing `DIRECT_URL` at production.
4. Optional: add a Vercel Cron job or a GitHub Action that runs `npm run cleanup` daily.

---

## 5. What's where

```
src/
  app/
    (home)/page.tsx           homepage (port of Homepage v2.html)
    report/                   /report  5-step complaint wizard   ·  /report/status  code + secret lookup
    dusshomoy/                /dusshomoy  feed + form  ·  /dusshomoy/[id]  shareable post with OG image
    search/                   /search  (the homepage search box)
    admin/                    login + protected dashboard
      (panel)/…               contributions · complaints · posts · media · projects · films · history
                              · milestones · content · audit · users
      actions.ts              every admin mutation (role check → zod → write → audit log → cache refresh)
    actions/public.ts         public server actions (contribution, complaint, status, follow-up, post)
    api/uploads/presign       step 1 of every upload (returns a presigned PUT + one-time token)
    api/media/[id]            serves every stored file and enforces visibility
    api/posts                 feed pagination
    api/admin/upload|export   admin image upload · CSV export
  components/home/            homepage islands + HomeEngine (the prototype's scroll/animation engine)
  components/forms/           report wizard, status lookup, uploads hook, Turnstile
  components/dusshomoy/       feed, post form, gallery
  lib/                        db, auth, storage (S3/R2 + local), media (sharp), validation (zod),
                              rate limiting, captcha, crypto, labels (Bangla/English for every enum), geo
  i18n/                       dictionaries (homepage + forms)
  styles/home.css             the prototype stylesheet, ported verbatim
prisma/
  schema.prisma · migrations/ · seed.ts · seed-data/*.json
public/map/                   Bangladesh GeoJSON + neighbouring countries (no CDN needed)
```

## 6. How the backend works

**Submissions**
- All three public forms are anonymous by default.
- Every submission starts as `PENDING` and appears publicly only after an admin approves it.
- **Complaints are never public.**

**Uploads**
1. The browser asks `/api/uploads/presign`.
2. It uploads the file directly to R2.
3. It sends only `{id, token}` with the form.
4. The server then:
   - checks the token hash
   - re-reads the real file type from magic bytes (it never trusts the browser)
   - enforces the size limits
   - **re-encodes images, which removes all EXIF/GPS metadata**
   - writes thumbnails and deletes the raw upload

**Complaint secrets**: each complaint gets a code like `ABCD-EFGH` and a one-time 6-character secret. Only an scrypt hash of the secret is stored. Lost secrets cannot be recovered, by design.

**Privacy**
- IP addresses and user agents are never stored.
- Rate limiting uses `sha256(salt + route + ip + time-window)` in Postgres, and those rows expire with the window.
- Contact details and victim names are encrypted at rest (AES-256-GCM, `ENCRYPTION_KEY`).
- Viewing decrypted data in the admin is itself written to the audit log.
- Logs never contain form contents.

**Admin roles**: Super Admin (no limits) and Moderators (only the permissions a super admin ticks: contributions, posts, complaints, private contact details, content, CSV). Moderators can never manage accounts, see other people's logs, permanently delete files, or export contact details. Every action goes into an append-only log book that only super admins can see in full. Details are in `../README.md` §7.

**Tests**: `npm run test:validation` and `npm run test:security` (59 end-to-end checks; see `../README.md` §11).

**Security headers**
- Per-request CSP with nonces
- HSTS
- `X-Frame-Options: DENY`
- nosniff
- A sandboxed CSP on served media
- Same-origin checks on route handlers
- Rate limits on every public route and on login

**Caching**
- Homepage content is cached (`getHome`, tag `home`) and refreshed whenever an admin edits content.
- The feed statistics are cached under the tag `posts`.
- Media uses `private, no-store` and bypasses the independent image optimizer cache so hide/reject actions revoke access on subsequent requests. Images remain preprocessed WebP.

**Capacity**: 1,000 users is well within a single Vercel project, a small Supabase instance and R2.

## 7. Differences from the prototype (intentional)

- **Films**: the handoff says 13, but `Homepage v2.html` defines 9. All 9 are seeded; more can be added in `/admin/films`. (The road has 13 entries.)
- **Removed**: the "এখানে ভিডিও ড্র্যাগ করে ছাড়ুন" drop zone on films was a design-tool affordance and has been removed.
- **Fixed a prototype bug**: the atlas map never straightened after its "drop" reveal, because `.rv.drop` overrode `.rv.in`.
- **Copy changed**: দুঃসময়ের গল্প confirmation now says "জমা হয়েছে, যাচাইয়ের পর দেখা যাবে" instead of "প্রকাশিত হয়েছে", because posts are now moderated.
- **District field**: on the report and post forms, district is a dropdown filtered by division (all 64 districts), which makes the division/district filters reliable. Thana stays free text.
- **Dead links replaced**: the homepage search box opens `/search`, and "প্রকাশিত রেকর্ড" (a `#` link) now opens the complaint status page.
- **Additions**:
  - an optional description field for each accused person (the handoff asked for one)
  - follow-up messages on `/report/status`
  - English for the report and দুঃসময়ের গল্প pages

## 8. Known limits / to do before launch

- **Video, audio and PDF metadata is not stripped.** Only images are re-encoded. These files stay private until approved; reviewers should check them before publishing.
- **Lighthouse has not been run.** Run it against a production build: `npm run build && npm start`, then `npx lighthouse http://localhost:3000 --form-factor=mobile`. The homepage HTML is about 124 KB gzipped; most of that is the RSC payload for roughly 250 images.
- **Image permissions**: the prototype README warns that reuse permission and the subjects of the 60-project photos are not yet verified. Credits and source links are kept on every image. After import, one project (#53, Dhaka East–West Expressway) has no working photo.
- **v75 portraits and the PM portrait** were empty `<image-slot>`s in the prototype. Upload them in `/admin/content`.
- **Policy pages** (privacy, editorial, terms) don't exist yet. The footer links to sections of the homepage instead.
