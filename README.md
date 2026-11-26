# বঙ্গবন্ধু ও বাংলাদেশ — project README (read this first)

> **For any person or AI assistant opening this folder:** this file is the single source of truth about the project:
> what exists, how it works, what is finished, what is not, and the rules not to break.
> Read it fully before changing anything. Detailed setup commands are also in `web/README.md`.
> **Admin roles, log book, security audit and test results: see [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md).**

Last updated: **2026-11-24**. Local security hardening and current verification limits:
[`web/SECURITY_REVIEW.md`](web/SECURITY_REVIEW.md). Production deployment is not yet verified.
The integration security suite now requires `SECURITY_TEST_DATABASE=true` and a disposable test database.

---

## 1. What this project is

A bilingual (Bangla default, English toggle) national digital archive website called **বঙ্গবন্ধু ও বাংলাদেশ**. It has:

- a long, animated **homepage**: history 1948–1975, the 15 August 1975 memorial, development projects 1996–2001 and 2009–2024, a 60-project grid, the Prime Minister section, a full index, the July–August 2024 timeline, a Bangladesh atlas map, and the contribution portal
- three **public submission forms**, all anonymous by default:
  1. **Contributions** about Bangabandhu (BB) or Sheikh Hasina (SH), from the homepage → reference like `BB-2026-XXXXX`
  2. **Complaints** (`/report`), a 5-step wizard → tracking code + one-time secret. **Never public.**
  3. **দুঃসময়ের গল্প** (`/dusshomoy`) → public feed of Awami League and affiliated organisations' activities after admin approval
- a protected **admin dashboard** (`/admin`) with **Super Admins** and **Moderators**: moderation queues, content editing, media, CSV export, a tamper-proof **log book**, and user management
- a public page of **approved contributions** (`/contributions`)

The site is designed for about **1,000 users**.

## 2. Folder layout

```
শেখ হাসিনার উন্নয়ন প্রকল্প/
├── README.md               ← THIS FILE
├── HANDOFF.md              original specification (the requirements)
├── Homepage v2.html        prototype: visual + behavioural spec for the homepage
├── Report.dc.html          prototype: complaint wizard
├── Dusshomoy.dc.html       prototype: দুঃসময়ের গল্প page
├── data.js, img.js, p60.js prototype data (already converted into the database seed)
├── map/                    Bangladesh GeoJSON (copied into web/public/map)
├── uploads/                reference screenshots + image source catalog (no image files)
├── Homepage.html, support.js, image-slot.js   old / prototype-only; do NOT port
└── web/                    ← THE REAL APPLICATION (Next.js). All work happens here.
    ├── README.md           setup + deploy guide (commands in detail)
    ├── .env.example        every environment variable, with comments
    ├── docker-compose.yml  local Postgres + MinIO (an R2 stand-in)
    ├── prisma/             schema.prisma · migrations/ · seed.ts · seed-data/*.json
    ├── scripts/            import-images.ts · create-admin.ts · cleanup.ts
    ├── public/             map/ (GeoJSON), og-default.png, icon.svg, robots.txt
    └── src/                application code (see section 7)
```

## 3. Current status

**Done and tested end to end on a local machine:**
- [x] Homepage port: CSS copied unchanged, animation engine ported, all sections, Bangla/English toggle
- [x] BB/SH contribution form: uploads, captcha, reference number
- [x] `/report` wizard: accused person photo upload, evidence files, code + secret
- [x] `/report/status`: lookup and follow-up messages
- [x] `/dusshomoy`: form, moderated feed, filters, gallery modal, `/dusshomoy/[id]` share page with og:image
- [x] `/search`: the homepage search box
- [x] Admin: login, all queues, approve/reject/edit/redact, complaint updates, media viewer, CSV export, content editors
- [x] **Roles**: Super Admin (no limits) + Moderators (only the permissions a super admin ticks); log book; user create/edit/deactivate/delete; force logout; own password change
- [x] **Automated tests**: `npm run test:security` (59 checks, all passing) and `npm run test:validation`
- [x] `/contributions`: public page of approved BB/SH contributions
- [x] Image pipeline: EXIF/GPS stripped (verified with a GPS-tagged JPEG), WebP plus thumbnails, served through `next/image`
- [x] All 246 prototype images imported into storage: 237 worked, 9 dead links now show a placeholder
- [x] Production build (`npm run build`) passes, and the TypeScript type check is clean
- [x] Database migration `prisma/migrations/20261123000000_init` applies cleanly to an empty database

**Not done yet: see section 9 (TODO).**

**Not connected yet:** Supabase (database) and Cloudflare R2 (storage). The owner will add them; see section 4.

---

## 4. ⭐ When you add Supabase and Cloudflare R2: the 5 steps

Do these **in this order**. All commands run inside the `web/` folder.

### Step 1: Put the Supabase connection strings in `DATABASE_URL` and `DIRECT_URL`
1. Create a Supabase project. Choose the region closest to Bangladesh (e.g. **Singapore**).
2. Go to **Project Settings → Database → Connection string**.
3. In `web/.env` (locally) and in Vercel's Environment Variables (production), set both values:
   ```
   # Transaction pooler, port 6543. Keep the ?pgbouncer=true&connection_limit=1 at the end
   DATABASE_URL="postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   # Session pooler / direct, port 5432. Used for migrations
   DIRECT_URL="postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```
4. **Important:** in Supabase **API settings**, remove `public` from the exposed schemas, or enable RLS with no policies on every table. The app connects to Postgres directly with its own access control, so the tables must **not** be readable through Supabase's public REST API.

### Step 2: Create the tables and load the content
```bash
cd web
npm install
npx prisma migrate deploy      # creates all tables
npm run db:seed                # loads all prototype content + creates the first admin
```
- The first **Super Admin** comes from `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (≥ 12 characters, not the example value) and `SEED_ADMIN_NAME` in `.env`. Log in at `/admin` and create moderators under **সুপার অ্যাডমিন ও মডারেটর**.
- To add or reset an account from the command line: `npm run admin:create -- --email you@example.org --name "Name" --role SUPER_ADMIN` (or `MODERATOR`)

### Step 3: Put the R2 keys in the `S3_*` variables and set `STORAGE_DRIVER=s3`
1. In Cloudflare, go to **R2 → Create bucket**, e.g. `archive`. **Keep it private** (no public access). The app serves every file itself.
2. **R2 → Manage API tokens → Create API token** with permission **Object Read & Write** on that bucket.
3. Set these values in `.env` and in Vercel:
   ```
   STORAGE_DRIVER="s3"
   S3_BUCKET="archive"
   S3_REGION="auto"
   S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
   S3_ACCESS_KEY_ID="<access key id>"
   S3_SECRET_ACCESS_KEY="<secret access key>"
   S3_FORCE_PATH_STYLE="false"
   ```

### Step 4: Add the CORS rule to the R2 bucket
Browsers upload files **directly** to R2 using presigned URLs, so the bucket must allow it.
Under R2 → your bucket → **Settings → CORS policy**, add:
```json
[
  {
    "AllowedOrigins": ["https://YOUR-REAL-DOMAIN", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```
Without this rule, every file upload on the site fails.

### Step 5: Import the images, then refresh the cache
```bash
npm run images:import
```
- This downloads every prototype image, removes its metadata, resizes it and uploads it into R2. Dead links are marked FAILED and show a placeholder.
- Then log in at `/admin` → **অন্যান্য কনটেন্ট** (`/admin/content`) → press **ক্যাশ রিফ্রেশ করুন**. The homepage is cached, so it won't show the new image locations until you do this.

### After the 5 steps: deploy to Vercel
1. Push `web/` to a Git repository and import it into Vercel. Set **Root Directory = `web`**.
2. Add **every** variable from `web/.env.example` in Vercel. In production:
   - `NEXT_PUBLIC_SITE_URL` = your real domain
   - `STORAGE_DRIVER=s3` (local storage is refused on Vercel)
   - **New** random secrets: `AUTH_SECRET`, `RATE_LIMIT_SALT`, `ENCRYPTION_KEY` and `UPLOAD_SIGNING_SECRET`, each generated with `openssl rand -base64 32`
   - **Real Cloudflare Turnstile keys** (Cloudflare → Turnstile → Add site). The keys in `.env.example` are always-pass TEST keys.
3. Run migrations against production from your computer or CI: `npx prisma migrate deploy`
4. Optional: schedule `npm run cleanup` daily (Vercel Cron or a GitHub Action).

> ⚠️ **Never change `ENCRYPTION_KEY` after real data exists.** Contact details, victim names and all complaint text are encrypted with it; changing it makes them unreadable. Keep a separate safe copy of it.

### After the tables exist: give the website a restricted database account
```bash
npm run db:app-role
```
It creates `archive_app`, which can read and write rows but cannot change tables or edit the log book, and prints a new `DATABASE_URL` once. Put that value in `.env` and Vercel; keep `DIRECT_URL` as the owner account (used only for migrations). Run it again after any migration that adds tables.
> ⚠️ Keep `RATE_LIMIT_SALT` and `AUTH_SECRET` secret. Changing `AUTH_SECRET` logs every admin out (harmless).

---

## 5. Run it locally (without Supabase / R2)

```bash
cd web
cp .env.example .env        # set DATABASE_URL + DIRECT_URL to any Postgres; fill in the secrets
docker compose up -d        # optional: Postgres :5432 + MinIO :9000
npx prisma migrate deploy
npm run db:seed
npm run images:import       # optional; with STORAGE_DRIVER="local" files go to web/.data/storage
npm run dev                 # http://localhost:3000   admin: http://localhost:3000/admin
```

**Notes:**
- The current `web/.env` points to a throwaway test database on port **55432**, which is no longer running. Change `DATABASE_URL` and `DIRECT_URL` to your own database.
- The owner's Homebrew Postgres (port 5432) needs a password.
- `npm start` (production mode) with local storage requires `ALLOW_LOCAL_STORAGE=true`.

## 6. Environment variables (summary; full comments in `web/.env.example`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL (OG tags, origin checks) |
| `DATABASE_URL`, `DIRECT_URL` | Postgres pooled / direct connections |
| `STORAGE_DRIVER` | `local` (development) or `s3` (R2 / MinIO / S3) |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | Storage |
| `ALLOW_LOCAL_STORAGE` | Only for `npm start` locally without S3 |
| `AUTH_SECRET`, `AUTH_TRUST_HOST` | Admin sessions (Auth.js) |
| `RATE_LIMIT_SALT` | Salt for hashed rate-limit keys |
| `ENCRYPTION_KEY` | AES-256-GCM key for contact details and victim names. **Never rotate once live.** |
| `UPLOAD_SIGNING_SECRET` | Signs local-driver upload URLs |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CAPTCHA_DISABLED` | Captcha |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | First admin, created by the seed |
| `RESEND_API_KEY`, `OTP_EMAIL_FROM` | Emailed 6-digit login code for every admin (on when the key is set). See `ADMIN_GUIDE.md` §4 |

---

## 7. Architecture

### Stack
- **Next.js 15.5** (App Router, React 19, Server Components, Server Actions), TypeScript 5.9
- **Prisma 6.19** + PostgreSQL
- **Auth.js v5** (next-auth beta), admin credentials only
- **zod 4**, **sharp**, **AWS SDK v3** (S3 API for R2), **d3-geo** (map), **Cloudflare Turnstile**
- Fonts from `next/font`: Anek Bangla, Noto Serif Bengali, Noto Serif, Outfit

### Key files (`web/src/`)
| Path | What |
|---|---|
| `app/(home)/page.tsx` | Homepage, rendered from the database |
| `styles/home.css` | **Prototype CSS copied unchanged** (only font names swapped) + a few additions at the end |
| `components/home/HomeEngine.tsx` | Port of the prototype's scroll/animation script: preloader, hero video, chapters, road, films, memorial, reveals, smooth scroll |
| `components/home/*` | Nav, Chooser modal, GiveModal (BB/SH form), GiveQuick, P60Grid, IndexTabs, Atlas, holes (memorial) |
| `app/report/*`, `components/forms/ReportWizard.tsx`, `StatusLookup.tsx` | Complaints |
| `app/dusshomoy/*`, `components/dusshomoy/*` | দুঃসময়ের গল্প |
| `app/actions/public.ts` | Public server actions: submitContribution, submitComplaint, lookupStatus, addFollowup, submitPost |
| `app/admin/actions.ts` | Every admin mutation: role check → zod → write → audit log → cache refresh |
| `app/admin/(panel)/*` | Admin pages |
| `app/api/uploads/presign` | Step 1 of every upload |
| `app/api/uploads/local` | Development-only upload sink |
| `app/api/media/[id]` | Serves **every** stored file and enforces who may see it |
| `app/api/posts` | Feed pagination |
| `app/api/admin/upload`, `app/api/admin/export` | Admin image upload, CSV export |
| `lib/storage.ts` | Storage abstraction (S3/R2 + local disk) |
| `lib/media.ts` | File-type sniffing, sharp processing, finalising uploads |
| `lib/validation.ts` | zod schemas shared by browser and server |
| `lib/labels.ts` | Bangla/English labels for every enum (labels are never in enum names) |
| `lib/content.ts` | Cached homepage loader (`getHome`, cache tag `home`) + editable JSON block schemas |
| `lib/posts.ts` | Feed queries (cache tag `posts`) |
| `lib/auth.ts` | Auth.js config, `currentAdmin()`, `requireAdmin(permission)`, `can(me, permission)` |
| `lib/access.ts` | Which permission is needed for a file, by what it belongs to |
| `scripts/security-test.mjs` | End-to-end attack/flow test (anonymous, moderator, super admin) |
| `scripts/validation-test.ts` | Form-validation edge cases (must never crash) |
| `lib/ratelimit.ts`, `captcha.ts`, `crypto.ts`, `request.ts`, `geo.ts`, `bn.ts`, `i18n.ts` | Helpers |
| `i18n/home.ts`, `i18n/forms.ts` | Text dictionaries (Bangla verbatim from the prototypes, plus English) |
| `middleware.ts` | Per-request CSP nonce + cheap `/admin` cookie gate |

### Data model (`web/prisma/schema.prisma`)
- **Submissions**
  - `Contribution`
  - `Complaint`, with `AccusedPerson` and `ComplaintUpdate`
  - `ActivityPost`
- **Files**: `MediaAsset`, used for all files. It records an owner type and owner id, an optional site slot, and either a storage key or an external URL.
- **Editable content**
  - `Project` (the 60 projects)
  - `Milestone` (the road + atlas pins)
  - `Film`
  - `HistoryChapter`, with `TimelineEvent`
  - `ContentBlock`: JSON for hero captions, domains, stops, index, steps, marquee, terms, years, v75, a24 and map labels
- **System**: `AdminUser`, `AuditLog`, `RateLimit`
- **Status values**
  - Moderation: `PENDING`, `APPROVED`, `REJECTED`, `ARCHIVED`
  - Complaints also have a `progress` value the submitter sees: `RECEIVED`, `UNDER_REVIEW`, `NEED_INFO`, `VERIFIED`, `CLOSED`

### How an upload works
1. The browser calls `POST /api/uploads/presign` and gets `{id, token, presigned PUT URL}`.
2. The browser uploads the file straight to R2.
3. The form sends only `{id, token}`.
4. The server action verifies the token hash, re-reads the real file type from the stored bytes, and checks the size limit.
5. **Images** are re-encoded with sharp, which removes all EXIF/GPS. A 640 px thumbnail is made and the raw upload is deleted.
6. **PDFs** are rebuilt page by page (`stripPdf()` in `lib/media.ts`), which drops author, software, dates and XMP metadata. An encrypted or damaged PDF is kept as-is (admin-only).
7. Video and audio are moved as they are, with metadata **not** stripped.

Size and count limits live in `lib/upload-rules.ts`, shared by browser and server.

### Who can see which files (`/api/media/[id]`)
| Files | Who can see them |
|---|---|
| Site content: projects, films, chapters, milestones, site images | Everyone; cached (browser 5 min, CDN 1 h), so hiding one can take up to an hour to disappear |
| Approved posts and approved contributions | Everyone |
| Complaints, accused photos, anything pending | **Admins only**, never cached |

### Admin roles: Super Admin and Moderators

**Super Admin**
- Has **no limits**.
- Can create other super admins and moderators.
- Can edit anyone's name, role and permissions, reset passwords, deactivate accounts, **force-logout** anyone, and **delete** accounts.
- Sees the **log book of everyone** at `/admin/audit` and can filter it by person, role, action, type and date.
- Gets a team overview on the dashboard: each person's actions in the last 7 days and their last login.
- The only safety rails: you cannot demote, deactivate or delete **yourself**, and the **last active super admin** cannot be removed. This prevents locking everyone out.

**Moderator**
- Can do **only** what a super admin ticks among these permissions:

| Permission | Allows |
|---|---|
| `CONTRIBUTIONS` | BB/SH contribution queue |
| `POSTS` | দুঃসময়ের গল্প queue |
| `COMPLAINTS` | Complaint queue, without contact details |
| `COMPLAINT_PII` | See private contact details and victim names (complaints and contributions) |
| `CONTENT` | Edit homepage content, projects, films, history and site images |
| `EXPORT` | CSV export, never with contact details |

- **A moderator can never:**
  - open user management
  - create, edit or delete any account, including other moderators
  - see other people's log entries (they see only their own)
  - permanently delete files (they can only hide them)
  - download a CSV with contact details

**Every check runs on the server.** Hidden menu items are only a convenience. Each page, server action, API route and file download re-checks the permission. Accounts are re-read from the database on every request, so deactivation, permission changes, password changes and "force logout" take effect **immediately**, through a session version stored in the login token.

**Log book (`AuditLog`)**
- Every login, failed login, view of private data, approval, rejection, edit, redaction, file action, export and account change is recorded with:
  - who did it (name, email and role are copied into the row)
  - what they did, on which item, and when
  - before/after details
- A **database trigger makes it append-only**: entries can't be edited or deleted, even with direct SQL.
- When an account is deleted, its entries stay.

**Login protection**
- Rate limits apply per IP *and* per account, so rotating IPs doesn't help.
- Failed attempts are logged.
- New passwords need at least 12 characters with both letters and numbers.

---|---|
| ADMIN | Everything, including users and the CSV export with contact details |
| EDITOR | Content, contributions and posts. **Cannot see complaints.** |
| REVIEWER | Complaints, contributions and posts. Cannot edit content. |

---

## 8. Rules: do not break these

1. **Complaints must never become public.** No public page, API or feed may show complaint data or files.
2. **Every public submission starts `PENDING`.** Only an admin approval makes a contribution or post public.
3. **Never store IP addresses or user agents.**
   - Rate limiting uses only `sha256(salt|route|ip|window)`.
   - Never log form contents or personal data.
4. **Contact details and victim names stay encrypted** (`encrypt()` / `decrypt()` in `lib/crypto.ts`). Viewing them in the admin writes an audit entry.
   **All complaint text is encrypted too** (`seal()` / `unseal()`): description, links, accused name/role/organisation/description/links, follow-up and update messages, internal notes. Accused names are searchable only by exact full name through a keyed hash (`nameIndex()`). Location and categories stay readable for filters.
5. **Every admin page / action / route must call `requireAdmin(permission)` (or `adminOrNull`) and every mutation must call `audit(me, …)`.** Use `"SUPER"` for anything about accounts or permanent deletion. The middleware is only a convenience; never rely on hiding a button.
6. **Never trust the browser's file type.** Use `sniff()` in `lib/media.ts`. Images must go through `processImage()` (this is what strips GPS).
7. **Keep Bangla copy verbatim from the prototypes.** Labels go in `lib/labels.ts` or `src/i18n/*`, never in enum names.
8. **Hero years:** "১৯৪৮–১৯৭৫" and the two terms "১৯৯৬–২০০১" and "২০০৯–২০২৪". **Never "১৯৯৬–২০২৪".**
9. **Do not redesign the homepage.** `styles/home.css` is the prototype's CSS. Put changes at the end of the file, under "production additions".
10. **Links between the homepage and other pages use plain `<a>`, not `next/link`.** This is deliberate: the homepage's global CSS would leak into other pages on client-side navigation. The ESLint rule is turned off on purpose.
11. **After changing content outside the admin** (scripts, direct SQL), press **ক্যাশ রিফ্রেশ করুন** in `/admin/content`.
12. **Git:** the owner wants to be the sole contributor. **Do not add "Co-Authored-By: Claude" (or any AI co-author) lines to commits.** Only commit when the owner asks.
    - Note: the git repository root is currently the owner's home folder (`/Users/yusuf`), not this project. Suggest `git init` inside `web/` before committing.

---

## 9. TODO / known gaps

- [ ] **Connect Supabase + R2** (section 4) and deploy to Vercel.
- [ ] **Lighthouse not run** (target ≥ 90 on mobile). Run it after deploying: `npx lighthouse https://YOUR-DOMAIN --form-factor=mobile`. The homepage HTML is about 124 KB gzipped, mostly the RSC payload for roughly 250 images; reduce it if the score is low.
- [ ] **Video and audio metadata is not stripped** (images and PDFs are). Doing it needs ffmpeg, which is too heavy for Vercel functions with 200 MB files; it would need a separate worker. These files are admin-only and never public; reviewers should check them before approving.
- [ ] **Missing portraits:** the PM portrait and the 18 portraits for the 15 August memorial. Upload them in `/admin/content`, using slots `pm` and `v75-<group>-<index>` (e.g. `v75-0-4` is Sheikh Russel).
- [ ] **Project #53** (ঢাকা ইস্ট–ওয়েস্ট এলিভেটেড এক্সপ্রেসওয়ে) has no working photo. Upload one in `/admin/projects`.
- [ ] **Image permissions:** reuse permission and the subjects of the 60-project photos are not yet verified (warning from the prototype's `uploads/…/README.txt`). Credits and source links are stored on every image.
- [ ] **Policy pages** (privacy, editorial policy, terms, about, contact) don't exist. The footer links to homepage sections instead.
- [ ] **Films:** the handoff says 13, but the prototype defines 9. All 9 are seeded; add more in `/admin/films`.
- [ ] **Bot protection:** the keys in `.env.example` are always-pass TEST keys. Production needs real Turnstile keys.
- [ ] **Admin image uploads** are downscaled in the browser because Vercel limits request bodies to 4.5 MB. Very large originals are resized before upload.

## 10. Deliberate differences from the prototype

- **Bug fix:** the atlas map stayed tilted after its reveal, because `.rv.drop` overrode `.rv.in`. Fixed with `.rv.drop.in{transform:none}`.
- **Removed:** the "এখানে ভিডিও ড্র্যাগ করে ছাড়ুন" drop zone on films (a design-tool feature only).
- **Copy changed:** the দুঃসময়ের গল্প success message says "জমা হয়েছে, যাচাইয়ের পর দেখা যাবে" instead of "প্রকাশিত হয়েছে", because posts are moderated.
- **District field:** on the report and post forms, district is a dropdown filtered by division (all 64 districts are in `lib/geo.ts`). Thana stays free text. For "প্রবাস" (abroad) it becomes a country/city field.
- **Dead links replaced:**
  - the homepage search box (previously did nothing) now opens `/search`
  - "প্রকাশিত রেকর্ড" (`#`) now opens `/report/status`
- **Additions:**
  - an optional description per accused person
  - follow-up messages on `/report/status`
  - English for the report and দুঃসময়ের গল্প pages
  - a "copy" button for the complaint code and secret
- **Neighbour countries on the map** are bundled locally (`public/map/neighbors.json`) instead of fetched from a CDN.

## 11. Tests

Run these after **every** change that touches admin, forms or validation:

```bash
npm run typecheck
npx next lint
npm run test:validation          # form validation must never crash, bad input must be rejected
npm run build
ALLOW_LOCAL_STORAGE=true npm start            # in another terminal (local driver), or npm run dev
BASE=http://localhost:3000 SUPER_EMAIL=… SUPER_PASSWORD=… npm run test:security
```

**What `test:security` covers (59 checks)**

As an anonymous visitor:
- every admin page redirects to login
- a forged session cookie doesn't work
- CSV export, admin upload, complaint files and pending items are all refused
- the public feed, search and contributions page hide anything pending
- complaints never appear anywhere public

As a moderator (with only the POSTS permission):
- forbidden pages are blocked
- they cannot promote themselves, create accounts, delete a super admin, or touch complaints
- they cannot download CSVs or open complaint evidence
- they see only their own log
- a cross-site form submission is rejected
- the allowed approval works and the post becomes public

As a super admin:
- creating, deactivating and deleting a moderator all work
- deactivation logs the moderator out immediately
- the log book keeps a deleted moderator's actions

**Run it only against a TEST database.** It creates and removes test records, and its log-book rows stay (the log book is append-only).

## 12. Handy commands (inside `web/`)

| Command | What |
|---|---|
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build + server |
| `npx tsc --noEmit` | Type check |
| `npx prisma migrate deploy` | Apply migrations |
| `npx prisma migrate dev --name x` | Create a new migration after editing `schema.prisma` |
| `npm run db:seed` / `SEED_FORCE=1 npm run db:seed` | Seed content / replace all content (never touches submissions) |
| `npm run images:import` / `npm run images:import -- --retry` | Copy seed images into storage / retry failed ones |
| `npm run admin:create -- --email … --name … --role SUPER_ADMIN` | Create or reset an account (`SUPER_ADMIN` or `MODERATOR`). Use this if every super admin is locked out. |
| `npm run cleanup` | Delete abandoned uploads and expired rate-limit rows |
| `npm run db:studio` | Browse the database |

## 13. Gotchas met during development

- **zod 4 keeps running refinements after an earlier check has failed.** Every `.refine()` must be safe on *any* string. A `new URL()` inside a refine once crashed every complaint that had no Facebook link; it's fixed now and covered by `test:validation`.
- **Turnstile tokens are single-use.** Every form re-mounts the widget after a failed submission (the `capKey` state).

- **React 19 resets a `<form>` after its action runs.** Automated tests must re-fill every field before resubmitting.
- **Dev mode compiles each page on first visit** (3–6 s). Don't mistake that for a hang.
- **Next's data cache persists in `.next/cache` across restarts.** Use the admin cache-refresh button after scripts change data.
- **Don't use `Readable.toWeb` from a dynamic `import("node:stream")`.** It isn't available in the bundled server code, so `lib/storage.ts` builds the web stream manually.
- **Every client-side state change must leave server-rendered `className` props alone.** The animation engine adds classes like `in`, `on`, `show` and `act` directly to the page; that's why the 60-project grid hides cards with `style`/`data-hid` instead of changing their class.
