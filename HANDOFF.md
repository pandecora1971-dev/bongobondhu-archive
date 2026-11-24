# Handoff: বঙ্গবন্ধু ও বাংলাদেশ — rebuild as a full-stack Next.js app

Paste everything below the line into Claude Code or Codex, with this project folder in the working directory.

---

You are rebuilding an existing HTML prototype as a production Next.js app with a real backend. The prototype in this folder is the **visual and behavioral spec**. Match its layout, typography, colors, copy (Bangla, verbatim), animations and interactions closely. Do not redesign.

## Source files (prototype)

- `Homepage v2.html` — main site. Vanilla HTML + CSS + one large inline script. Reads `data.js`, `img.js`, `p60.js`, `map/*.json`.
- `data.js` — `window.DATA`: hero captions, domains, history chapters, timeline events, roadmap, films (YouTube IDs), incident categories, contribution types, etc.
- `img.js` — `window.IMG`: image URLs per section (Wikimedia etc.). Some links are dead; see "Images" below.
- `p60.js` — 60 development projects (name, sector, place, year, cost, image).
- `map/bd-adm1.json`, `map/bd-adm2.json` — Bangladesh division/district GeoJSON for the atlas.
- `Report.dc.html` — 5-step anonymous complaint (অভিযোগ) wizard. Template markup + a `class Component` with state/logic. Treat the template as JSX-like markup with `{{ }}` holes and the class as a React class component.
- `Dusshomoy.dc.html` — "দুঃসময়ের গল্প": public feed + submission form for Awami League and affiliated organizations' activities.
- `support.js` — runtime for the `.dc.html` files only. **Do not port it.** Rewrite those pages as normal React components.
- `Homepage.html` is an older version. Ignore it.
- `uploads/` holds reference screenshots and the source images for the 60 projects (`uploads/bongobondhu_60_projects/`).

## Stack

- Next.js 15 (App Router, TypeScript, Server Components where sensible, Server Actions or route handlers for mutations).
- PostgreSQL + Prisma.
- Object storage for uploads: S3-compatible (Cloudflare R2 / S3 / Supabase Storage). Use presigned uploads. Generate thumbnails with `sharp`.
- Styling: port the prototype CSS as-is. Use CSS Modules or a single global stylesheet with the same class names. Do not convert to Tailwind unless you can match the result pixel for pixel. Fonts: Anek Bangla + Noto Serif Bengali via `next/font/google`.
- Auth: admin only (NextAuth/Auth.js credentials or email magic link). Public visitors never log in.
- Validation: zod on every input, client and server.
- i18n: the site has a বাংলা/English toggle (`data-en` attributes in the prototype). Implement it with a `lang` cookie and a simple dictionary. Default is Bangla.

## Routes

- `/` — homepage (port of `Homepage v2.html`).
- `/report` — complaint wizard (port of `Report.dc.html`).
- `/report/status` — look up a complaint by reference code + secret key, show its status.
- `/dusshomoy` — activity feed + submission form (port of `Dusshomoy.dc.html`).
- `/dusshomoy/[id]` — shareable single-post page with OG image.
- `/admin` — protected moderation dashboard.

## Homepage behavior to preserve

- Sticky hero. Background crossfades between muted YouTube clips (IDs `9gyFK7cQGu0`, `EqLHavO0HpQ`; random clip, random start, about 8s each, 1.8s crossfade, YouTube chrome hidden by scaling and cropping). Image slides with captions are the fallback until the first clip plays. Pause when the hero is off-screen or the tab is hidden.
- Hero year badge: "১৯৪৮–১৯৭৫" and the two Awami League terms "১৯৯৬–২০০১" and "২০০৯–২০২৪" (never "১৯৯৬–২০২৪").
- Nav: logo, links (no ইতিহাস / উন্নয়ন text links), অভিযোগ জানান → `/report`, দুঃসময়ের গল্প → `/dusshomoy`, language toggle, "তথ্য দিন" button.
- Every "তথ্য দিন" / "তথ্য জমা দিন" button opens a chooser modal with 4 options: বঙ্গবন্ধুর তথ্য দিন (opens the BB contribution form), শেখ হাসিনার তথ্য দিন (opens the SH form), অভিযোগ জানান (`/report`), দুঃসময়ের গল্প (`/dusshomoy`). Escape and backdrop click close it. Focus is trapped while open.
- Sections, in order: history chapters with event lists, BB contribution (`#give-bb`), development roadmap, mega-project video reel (13 films, custom controls, autoplay muted, sound preference carries to the next video), 60-project grid (4 cols desktop / 2 mobile, first 12 shown then "সব দেখুন"), SH contribution (`#give-sh`), July–August 2024, Bangladesh atlas (GeoJSON), incident documentation, public contribution portal with marquees.
- Smooth wheel scrolling and reveal-on-scroll animations as in the prototype. Respect `prefers-reduced-motion`.
- Move all `data.js` / `p60.js` / `img.js` content into the database (seed script) so admins can edit it. Keep the JSON as the seed source.

## Forms and backend

All public submissions are anonymous by default. Never store IP addresses or user agents in plain text. If you need rate limiting, use a salted hash with a short TTL. Strip EXIF/GPS from every uploaded image server-side. Add hCaptcha or Turnstile on every public form. Every submission starts as `PENDING` and only appears publicly after an admin approves it.

1. **Contributions (BB / SH)**, from the homepage multi-step panel. Fields: subject (`BB` | `SH`), types[], title, description, date/period, place, source links, files, optional name/contact. Returns a reference like `BB-2026-XXXXX`.

2. **Complaints (`/report`)**, a 5-step wizard. Port the fields exactly from `Report.dc.html`. Crime categories (multi-select, card with tick):
   জুলাই জঙ্গি সন্ত্রাসী, মব সৃষ্টি, বাড়িঘর লুটপাট, অগ্নিসংযোগ, জয় বাংলা স্লোগানের জন্য মারধর ও নির্যাতন, প্রশাসনের জড়িত ব্যক্তি, জেলে হত্যা ও নির্যাতন, জামিনে বাধা, শিক্ষা প্রতিষ্ঠানে বাধা ও মব, খুন / অপহরণ, হত্যাচেষ্টা, হত্যা ও নির্যাতন, মিথ্যা মামলা, হুমকি ও চাঁদাবাজি, বাড়ি বা জমি দখল, শিশু নির্যাতন, অন্যান্য.
   - The form also covers harms, victim info, date and location (division / district / thana), and evidence files.
   - Each accused person has: name, role/affiliation, description, how you know, **photo upload, Facebook profile URL, photo URL**.
   - On submit, return a reference code plus a one-time secret key. Store only a hash of the secret. `/report/status` uses the pair to look up the complaint.
   - Complaints are **never public**. They are visible only to admins.

3. **দুঃসময়ের গল্প posts (`/dusshomoy`)**
   - Fields:
     - organization: আওয়ামী লীগ, যুবলীগ, ছাত্রলীগ, স্বেচ্ছাসেবক লীগ, কৃষক লীগ, শ্রমিক লীগ, মহিলা আওয়ামী লীগ, যুব মহিলা লীগ, তাঁতী লীগ, মৎস্যজীবী লীগ, আইনজীবী পরিষদ, বঙ্গবন্ধু পরিষদ, প্রবাসী শাখা, অন্যান্য
     - activity type: মিটিং / সভা, মিছিল, মানববন্ধন, বিক্ষোভ / প্রতিবাদ, ত্রাণ / সেবা, দোয়া / মিলাদ, জনসংযোগ, অনলাইন প্রচারণা, আইনি সহায়তা, আহত বা বন্দি কর্মীর পাশে, অন্যান্য
     - committee level, date, division, district*, thana/upazila*, place, approx. participants, title*, description
     - up to 6 photos, links (one per line)
     - optional name and role, plus "নাম প্রকাশ করবেন না" (default on)
   - Public feed: approved posts in a card grid, filter chips by organization with counts, stat counters (posts, distinct thanas), and a modal or detail page with an image gallery. Add filters for division/district, infinite scroll or pagination, and sort by newest.

## Data model (Prisma, suggested)

`Contribution`, `Complaint`, `AccusedPerson` (belongs to Complaint), `ActivityPost`, `MediaAsset` (key, mime, width, height, thumbKey, ownerType, ownerId), `Project` (60 projects), `Film`, `HistoryChapter`, `TimelineEvent`, `AdminUser`, `AuditLog`. Use enums for status (`PENDING`, `APPROVED`, `REJECTED`, `ARCHIVED`), organization and activity type. Put Bangla labels in a lookup table or i18n file, not in the enum names.

## Admin dashboard

- Queues for contributions, complaints and posts, with filters and search.
- Approve, reject, edit and redact actions. Complaints also get status updates that the submitter sees on `/report/status`.
- Media viewer. CSV export.
- Editors for projects, films and history content.
- Audit log of every admin action.

## Images

The prototype has 185 image URLs and only about 134 load. Nine projects have no image (যমুনা সেতু, কৃষি, ভাতা স্কিম, এমআরটি-৫, এক্সপ্রেসওয়ে, …). Use the files in `uploads/bongobondhu_60_projects/` where they match. Upload every image to your own storage, serve it through `next/image`, and show a neutral placeholder tile when an image is missing. Admins can replace images.

## Quality bar

- Lighthouse ≥ 90 on mobile. Lazy-load the YouTube players and the map. No layout shift in the hero.
- Fully responsive, matching the prototype at 375, 768, 1280 and 1920 px.
- Accessible: keyboard navigable, visible focus, 44px tap targets, `lang="bn"`, alt text.
- Security: CSP, server-side file type and size checks, per-route rate limits, no PII in logs.
- Deliver a `README` with setup steps, `.env.example`, a Prisma seed from the prototype data files, Docker compose (Postgres + MinIO) for local development, and deploy notes for Vercel + Neon/Supabase + R2.

Work in this order: scaffold and seed, homepage port, forms with storage, admin, polish. After each phase, run the app and compare it against the prototype opened directly in a browser.
