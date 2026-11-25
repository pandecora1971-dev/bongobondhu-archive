# Admin guide: Super Admin, Moderators, log book & security audit

> For the site owner, every super admin, and any AI assistant working on this project.
> General setup (Supabase, R2, Vercel) is in [`README.md`](README.md).
> Last updated: **2026-11-23**

---

## 1. The two roles

### Super Admin: no limits
A super admin can do **everything**:

- Approve, reject, edit and redact every queue: contributions, complaints and দুঃসময়ের গল্প posts.
- See private contact details and victim names, and download CSV files with contact details.
- Edit all site content: projects, films, history, roadmap, homepage text and images.
- **Permanently delete** files (moderators can only hide them).
- **Create** other super admins and moderators.
- **Edit** anyone's name, role and permissions, and **reset** their password.
- **Deactivate** an account, which blocks login immediately.
- **Log someone out of all devices** at once.
- **Delete** an account permanently. Their log-book entries stay.
- See the **full log book** of every super admin and moderator.

**Only two safety rails exist**, to prevent locking everyone out:
1. You cannot demote, deactivate or delete **yourself**.
2. The **last active super admin** cannot be demoted, deactivated or deleted.

### Moderator: only what a super admin allows
When creating or editing a moderator, the super admin ticks the permissions:

| Permission | What the moderator can do |
|---|---|
| তথ্য জমা (BB / SH) যাচাই (`CONTRIBUTIONS`) | Review the Bangabandhu / Sheikh Hasina contribution queue |
| দুঃসময়ের গল্প যাচাই (`POSTS`) | Review দুঃসময়ের গল্প posts |
| অভিযোগ দেখা ও হালনাগাদ (`COMPLAINTS`) | View complaints and post status updates to the submitter. Contact details stay hidden. |
| গোপন যোগাযোগ তথ্য দেখা (`COMPLAINT_PII`) | See private contact details and victim names (complaints and contributions). Each view is logged. |
| সাইটের কনটেন্ট সম্পাদনা (`CONTENT`) | Edit projects, films, history, roadmap, homepage text and images |
| CSV ডাউনলোড (`EXPORT`) | Download CSV files for the areas they can access, **never with contact details** |

New moderators get `CONTRIBUTIONS` + `POSTS` by default.

**A moderator can NEVER, whatever is ticked:**
- open the user page, or create, edit, deactivate or delete **any** account, including other moderators
- change their own role or permissions
- see **other people's** log entries (they see only their own)
- permanently delete files (they can only hide them)
- download a CSV with contact details

---

## 2. How to manage people (super admin)

| Task | Where |
|---|---|
| Create a super admin or moderator | `/admin/users` → **নতুন সুপার অ্যাডমিন বা মডারেটর**. Initial password: ≥ 12 characters with letters and numbers. |
| Change role / permissions / name / password | `/admin/users` → click the name → **সংরক্ষণ** |
| Stop someone working right now | Untick **সক্রিয়** → সংরক্ষণ. They are logged out immediately. |
| Log someone out everywhere (e.g. lost phone) | User page → **সব ডিভাইস থেকে লগআউট করুন** |
| Delete an account | User page → type their exact email → **অ্যাকাউন্ট মুছে ফেলুন**. Deactivating is usually enough. |
| See what one person did | User page (last 30 actions), or `/admin/audit?user=…` |
| Change your own password | `/admin/account` (any role). You are logged out everywhere afterwards. |
| Locked out completely | On the server: `npm run admin:create -- --email you@x.org --name "Name" --role SUPER_ADMIN` |

**Changes apply immediately.** Changing someone's role, permissions, password or active status logs them out of every device on their next click. Every request re-reads the account from the database and checks a "session version" stored in the login token.

---

## 3. The log book (`/admin/audit`)

**What is recorded:**
- logins and **failed logins**
- **viewing** a complaint, and viewing private contact data
- approvals, rejections, archiving and returning items to pending
- edits (with before → after values) and redactions
- hiding, unhiding, uploading and deleting files
- CSV downloads (and whether they included contact details)
- cache refreshes
- creating, editing, deleting and force-logging-out accounts
- password changes

**Each entry stores:** who did it (name, email and role, copied into the row), what they did, which item, when, and the details.

**Who sees what:**
- **Super admins** see everyone. They can filter by person, by role (e.g. "only moderators"), by action type, item type and date range. The dashboard also shows each person's activity for the last 7 days and their last login.
- **Moderators** see only their own entries. The server enforces this filter; it isn't just hidden in the page.

**Tamper-proof:** a database trigger makes the log book **append-only**. No one can edit or delete entries, even with direct database access. If an account is deleted, its entries stay and are marked "অ্যাকাউন্ট মুছে ফেলা".

---

## 4. Security design: how admins are protected

- **Every check runs on the server.** Hiding a menu item is only cosmetic. Every admin page, server action, API route and file download calls `requireAdmin(permission)` again.
- **Private files** (complaint evidence, accused photos, anything pending) are served only to admins holding the matching permission. Everyone else gets 404.
- **Login protection:**
  - rate limits per IP *and* per account, so rotating IPs doesn't help
  - failed attempts are logged
  - bcrypt password hashes
  - sessions expire after 8 hours
  - **emailed login code (second step, BNPNAMA-style):** when `RESEND_API_KEY` is set, every admin
    (super admin and moderator) must enter a 6-digit code sent to their own email after the password.
    The code lasts 10 minutes, allows 5 tries and works once; only its HMAC is stored
    (`AdminLoginChallenge` table). A new password step cancels the old code. While codes are on, a
    plain email + password sign-in is refused, so the step cannot be skipped. Log book entries:
    `login:code-sent`, `login:code-failed`, `login`. Each admin's email must be a real inbox they read.
- **Cross-site attacks:** form submissions from other websites are rejected (Origin check). Cookies are httpOnly and SameSite.
- **No IP addresses are stored** anywhere. Rate limiting uses a salted hash that expires.

---

## 5. Security & flow audit (2026-11-23): what was found and fixed

| # | Problem found | Fix |
|---|---|---|
| 1 | **Any complaint without a Facebook link crashed on submit.** zod 4 kept running a check that called `new URL("")`. | All URL checks rewritten to be crash-safe; covered by `npm run test:validation` |
| 2 | A logged-in editor/moderator could open **complaint evidence** by guessing a file ID | The file route now requires the permission for that file's area |
| 3 | **Captcha failed on every retry** after a failed submit (Turnstile tokens are single-use) | All 4 forms re-create the widget after a failure |
| 4 | **Approving a BB/SH contribution had no visible effect** (no public page existed) | New public page `/contributions` (images only, never contact details). Linked in the footer and included in search. |
| 5 | Opening a complaint **loaded a complainant-supplied photo link**, leaking the admin's IP | Shown as a link with a warning; never loaded automatically |
| 6 | Changing password, role or active status **did not log the person out** | Session version in the login token, checked on every request |
| 7 | Two simultaneous requests could **attach the same upload twice** | Uploads are now claimed atomically |
| 8 | **No limit on total upload size**, so storage could be filled | Byte budget of 1.5 GB per IP per hour; video limit lowered to 200 MB |
| 9 | **Contributors' contact details** were visible to every moderator | Now needs the `COMPLAINT_PII` permission; each view is logged |
| 10 | Deleting an admin would have **erased who did what** in the log | Actor name, email and role are copied into every log entry; database trigger makes the log append-only |

Also added in this round:
- per-account login throttling, and logging of failed logins
- password strength rules
- "own account" password change
- a 60-second server time limit, so image processing isn't cut off on Vercel

---

## 6. Automated tests

Run after **every** change to admin, forms or validation, **only against a test database**:

```bash
cd web
npm run typecheck
npx next lint
npm run test:validation
npm run build
ALLOW_LOCAL_STORAGE=true npm start          # or: npm run dev   (in another terminal)
BASE=http://localhost:3000 SUPER_EMAIL=… SUPER_PASSWORD=… npm run test:security
```

**Result on 2026-11-23: 59 passed, 0 failed.** Type check, lint and production build were all clean.

What `test:security` checks:

| As… | Checks |
|---|---|
| **Anonymous visitor** (26 checks) | Every admin page redirects to login; a forged session cookie fails; CSV export, admin upload, complaint files, pending photos and pending post pages are all refused; the public feed, search and `/contributions` hide pending items; complaints never appear publicly |
| **Super admin** (5 checks) | Can log in, open user management and create a moderator with chosen permissions. Has no delete button on their own account. Cannot demote themselves while they are the last super admin. |
| **Moderator** (POSTS only, 21 checks) | Blocked from users, complaints, contributions and content pages. Cannot open complaint evidence or download CSVs. **Cannot promote themselves, create accounts, delete a super admin, or change a complaint.** Can approve a post, which then becomes public. Has no file-delete buttons. Sees only their own log. A cross-site form submission is rejected. |
| **Log book & lifecycle** (7 checks) | The moderator's approval is logged with their email, and the super admin can see it; deactivation logs the moderator out immediately; deleting the moderator works and their log entries survive |

The browser was also used to run the real public forms end to end (contribution, complaint without optional fields, post without photos), with no console errors.

---

## 7. Still to do / not verified

- [ ] **Not yet tested against real Supabase + R2** (not connected). After setup, run `npm run test:security` once against a **test copy**.
- [ ] **Lighthouse not measured.** The attempt to run it was blocked. Run it after deploying.
- [ ] **Video and audio metadata is not stripped** (images and PDFs are). Reviewers should check these files before approving.
- [ ] **Policy pages** (privacy, editorial policy, terms) don't exist yet.
- [ ] **Missing photos:** the PM portrait, the 15 August memorial portraits and project #53. Upload them in the admin.
- [ ] The local test database was reset for the new roles. The first super admin login is still `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `web/.env`. **Use your own strong password in production.**

---

## 8. Where it lives in the code (`web/`)

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | `AdminRole` (SUPER_ADMIN, MODERATOR), `Permission`, `AdminUser.sessionVersion`, `AuditLog` actor snapshot |
| `prisma/migrations/…_init/migration.sql` | Tables + the append-only trigger on `AuditLog` |
| `src/lib/auth.ts` | Login, `currentAdmin()`, `requireAdmin(permission \| "SUPER")`, `adminOrNull()`, `can()` |
| `src/lib/access.ts` | Which permission a file needs, by its owner |
| `src/lib/audit.ts` | `audit(me, action, entity, id, detail)` |
| `src/app/admin/actions.ts` | Every admin action (user management = `"SUPER"` only) |
| `src/app/admin/(panel)/users/` | User list, create, per-user page (edit, logout-all, delete, activity) |
| `src/app/admin/(panel)/audit/page.tsx` | Log book |
| `src/app/admin/(panel)/account/page.tsx` | Own password change |
| `scripts/security-test.mjs`, `scripts/validation-test.ts` | Automated tests |
| `scripts/create-admin.ts` | Emergency account creation from the command line |
