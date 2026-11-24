/**
 * End-to-end security + workflow test. Run against a RUNNING server and a TEST database:
 *
 *   BASE=http://localhost:3000 SUPER_EMAIL=… SUPER_PASSWORD=… node scripts/security-test.mjs
 *
 * It plays three people — an anonymous visitor, a moderator and a super admin — and checks that
 * every forbidden action is refused and every allowed one works. It creates (and then removes)
 * a test moderator, a test complaint, a test post and a test contribution.
 * ⚠️ Never point this at production.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.BASE || "http://localhost:3000";
if (process.env.SECURITY_TEST_DATABASE !== "true") {
  throw new Error("Refusing database mutations: set SECURITY_TEST_DATABASE=true only for a disposable test database.");
}
const SUPER = { email: process.env.SUPER_EMAIL || process.env.SEED_ADMIN_EMAIL, password: process.env.SUPER_PASSWORD || process.env.SEED_ADMIN_PASSWORD };
const db = new PrismaClient();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓", msg); } else { fail++; console.log("  ✗ FAIL:", msg); } };

// ───────── tiny HTTP client with a cookie jar ─────────
class Client {
  jar = new Map();
  cookie() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "); }
  store(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      const k = kv.slice(0, i).trim(), v = kv.slice(i + 1);
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(c) || v === "") this.jar.delete(k); else this.jar.set(k, v);
    }
  }
  async req(url, init = {}) {
    const res = await fetch(BASE + url, { redirect: "manual", ...init, headers: { cookie: this.cookie(), origin: BASE, ...(init.headers || {}) } });
    this.store(res);
    return res;
  }
  async get(url) { const r = await this.req(url); return { status: r.status, loc: r.headers.get("location") || "", body: r.status === 200 ? await r.text() : "" }; }
  async login(email, password) {
    const c = await (await this.req("/api/auth/csrf")).json();
    const r = await this.req("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: c.csrfToken, email, password }),
    });
    return r.status;
  }
  /** submit a server-action <form> found in `html`, chosen by `pick(fields)` */
  async action(pageUrl, html, pick, extra = {}, headers = {}) {
    const f = forms(html).find(pick);
    if (!f) throw new Error("form not found on " + pageUrl);
    const fd = new FormData();
    for (const [k, v] of f.fields) fd.append(k, v);
    for (const [k, v] of Object.entries(extra)) { fd.delete(k); for (const x of [].concat(v)) fd.append(k, x); }
    const r = await this.req(pageUrl, { method: "POST", body: fd, headers });
    return { status: r.status, loc: r.headers.get("location") || r.headers.get("x-action-redirect") || "" };
  }
}
function forms(html) {
  return [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map((m) => {
    const fields = [...m[1].matchAll(/<input\b([^>]*)>/g)].map((x) => {
      const a = x[1];
      const name = /name="([^"]*)"/.exec(a)?.[1];
      const value = (/value="([^"]*)"/.exec(a)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
      const type = /type="([^"]*)"/.exec(a)?.[1] ?? "text";
      return { name, value, type, checked: /\schecked/.test(a) };
    }).filter((x) => x.name && (x.type === "hidden" || (x.type === "checkbox" ? x.checked : true)));
    return { fields: fields.map((x) => [x.name, x.value]), names: new Set(fields.map((x) => x.name)) };
  }).filter((f) => [...f.names].some((n) => n.startsWith("$ACTION_ID")));
}
const has = (...n) => (f) => n.every((x) => f.names.has(x));

// ───────── fixtures (written straight to the test DB) ─────────
async function fixtures() {
  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#123456" } }).webp().toBuffer();
  const file = async (ownerType, ownerId) => {
    const a = await db.mediaAsset.create({ data: { state: "READY", kind: "IMAGE", ownerType, ownerId, mime: "image/webp" } });
    const key = `media/test/${a.id}.webp`;
    const p = path.join(process.cwd(), ".data", "storage", key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, png);
    return db.mediaAsset.update({ where: { id: a.id }, data: { key } });
  };
  const complaint = await db.complaint.create({ data: { code: "TEST-" + Math.random().toString(36).slice(2, 6).toUpperCase(), secretHash: "scrypt$x$y", crimes: ["OTHER"], description: "security test", contactEnc: null } });
  const post = await db.activityPost.create({ data: { org: "OTHER", activityType: "OTHER", district: "ঢাকা", thana: "test", title: "SECURITY-TEST pending post" } });
  const contrib = await db.contribution.create({ data: { ref: "BB-TEST-" + Date.now(), subject: "BB", types: ["EVENT"], year: 1971, title: "SECURITY-TEST pending contribution", description: "x" } });
  return { complaint, post, contrib, cFile: await file("COMPLAINT", complaint.id), pFile: await file("POST", post.id) };
}

async function main() {
  if (!SUPER.email || !SUPER.password) throw new Error("set SUPER_EMAIL and SUPER_PASSWORD");
  const fx = await fixtures();
  const ADMIN_PAGES = ["/admin", "/admin/contributions", "/admin/complaints", `/admin/complaints/${fx.complaint.id}`, "/admin/posts", "/admin/media", "/admin/projects", "/admin/films", "/admin/history", "/admin/milestones", "/admin/content", "/admin/audit", "/admin/users", "/admin/account"];

  console.log("\n1. Anonymous visitor");
  const anon = new Client();
  for (const u of ADMIN_PAGES) { const r = await anon.get(u); ok(r.status >= 300 && r.status < 400 && r.loc.includes("/admin/login"), `GET ${u} → login redirect (${r.status})`); }
  const forged = new Client(); forged.jar.set("authjs.session-token", "forged.invalid.token");
  for (const u of ["/admin", "/admin/users", "/admin/complaints"]) { const r = await forged.get(u); ok(r.status !== 200 || !r.body.includes("লগ আউট"), `forged session cookie cannot open ${u}`); }
  ok((await anon.get("/api/admin/export?type=complaints")).status === 401, "CSV export → 401");
  ok((await anon.req("/api/admin/upload", { method: "POST", body: new FormData() })).status === 401, "admin upload → 401");
  ok((await anon.get(`/api/media/${fx.cFile.id}`)).status === 404, "complaint evidence file → 404");
  ok((await anon.get(`/api/media/${fx.pFile.id}`)).status === 404, "PENDING post photo → 404");
  ok((await anon.get(`/dusshomoy/${fx.post.id}`)).status === 404, "PENDING post page → 404");
  const feed = await (await anon.req("/api/posts")).text();
  ok(!feed.includes("SECURITY-TEST"), "public feed hides PENDING posts");
  const contribPage = await anon.get("/contributions");
  ok(contribPage.status === 200 && !contribPage.body.includes("SECURITY-TEST"), "public contributions hide PENDING");
  const search = await anon.get("/search?q=SECURITY-TEST");
  ok(!search.body.includes("SECURITY-TEST pending"), "search hides PENDING items");
  ok(!(await anon.get("/search?q=security%20test")).body.includes(fx.complaint.code), "complaints never appear in search");

  console.log("\n2. Super admin");
  const sup = new Client();
  ok((await sup.login(SUPER.email, SUPER.password)) === 302, "super admin can log in");
  const supUsers = await sup.get("/admin/users");
  ok(supUsers.status === 200, "super admin opens /admin/users");
  const modEmail = `mod-${Date.now()}@test.local`, modPw = "TestModerator123";
  await sup.action("/admin/users", supUsers.body, has("email", "password"), { name: "Test Moderator", email: modEmail, password: modPw, role: "MODERATOR", permissions: ["POSTS"] });
  const mod = await db.adminUser.findUnique({ where: { email: modEmail } });
  ok(mod?.role === "MODERATOR" && mod.permissions.join() === "POSTS", "super admin created a moderator with only POSTS");
  const self = await db.adminUser.findUnique({ where: { email: SUPER.email.toLowerCase() } });
  const selfPage = await sup.get(`/admin/users/${self.id}`);
  ok(!forms(selfPage.body).some(has("confirm")), "no delete button on your own account");
  const supCount = await db.adminUser.count({ where: { role: "SUPER_ADMIN", active: true } });
  if (supCount === 1) {
    await sup.action(`/admin/users/${self.id}`, selfPage.body, has("id", "name"), { role: "MODERATOR" });
    ok((await db.adminUser.findUnique({ where: { id: self.id } })).role === "SUPER_ADMIN", "cannot demote yourself / the last super admin");
  }

  console.log("\n3. Moderator (POSTS only)");
  const m = new Client();
  ok((await m.login(modEmail, modPw)) === 302, "moderator can log in");
  ok((await m.get("/admin/posts")).status === 200, "moderator opens /admin/posts (allowed)");
  for (const u of ["/admin/users", `/admin/users/${self.id}`, "/admin/complaints", `/admin/complaints/${fx.complaint.id}`, "/admin/contributions", "/admin/content", "/admin/projects"]) {
    const r = await m.get(u);
    ok(r.status >= 300 && r.loc.includes("denied"), `moderator blocked from ${u}`);
  }
  ok((await m.get(`/api/media/${fx.cFile.id}`)).status === 404, "moderator cannot open complaint evidence");
  ok((await m.get(`/api/media/${fx.pFile.id}`)).status === 200, "moderator can open post photo (POSTS)");
  ok((await m.get("/api/admin/export?type=posts")).status === 403, "moderator without EXPORT → CSV 403");
  ok((await m.get("/api/admin/export?type=complaints")).status === 403, "moderator → complaint CSV 403");
  // replay super-admin-only actions with the moderator's session
  const userPage = await sup.get(`/admin/users/${mod.id}`);
  const r1 = await m.action(`/admin/users/${mod.id}`, userPage.body, has("id", "name"), { role: "SUPER_ADMIN", permissions: ["CONTRIBUTIONS", "POSTS", "COMPLAINTS", "COMPLAINT_PII", "CONTENT", "EXPORT"] });
  ok((await db.adminUser.findUnique({ where: { id: mod.id } })).role === "MODERATOR", `moderator cannot promote themselves (→ ${r1.loc || r1.status})`);
  await m.action(`/admin/users/${self.id}`, selfPage.body, has("confirm"), {}).catch(() => {});
  ok(!!(await db.adminUser.findUnique({ where: { id: self.id } })), "moderator cannot delete a super admin");
  await m.action("/admin/users", supUsers.body, has("email", "password"), { name: "x", email: `evil-${Date.now()}@x.test`, password: "Evil1234567890", role: "SUPER_ADMIN" });
  ok((await db.adminUser.count({ where: { email: { startsWith: "evil-" } } })) === 0, "moderator cannot create accounts");
  const cPage = await sup.get(`/admin/complaints/${fx.complaint.id}`);
  await m.action(`/admin/complaints/${fx.complaint.id}`, cPage.body, (f) => f.names.has("kind") && f.fields.some(([k, v]) => k === "status" && v === "APPROVED"));
  ok((await db.complaint.findUnique({ where: { id: fx.complaint.id } })).status === "PENDING", "moderator cannot change a complaint (no COMPLAINTS)");
  // allowed action: approve the post
  const pPage = await m.get(`/admin/posts/${fx.post.id}`);
  await m.action(`/admin/posts/${fx.post.id}`, pPage.body, (f) => f.names.has("kind") && f.fields.some(([k, v]) => k === "status" && v === "APPROVED"));
  ok((await db.activityPost.findUnique({ where: { id: fx.post.id } })).status === "APPROVED", "moderator approved the post (allowed)");
  ok((await anon.get(`/dusshomoy/${fx.post.id}`)).status === 200, "approved post is now public");
  ok((await anon.get(`/api/media/${fx.pFile.id}`)).status === 200, "approved post photo is now public");
  const publishedMedia = await anon.req(`/api/media/${fx.pFile.id}`);
  ok(publishedMedia.headers.get("cache-control")?.includes("no-store"), "public media is not stored in an independent browser/CDN cache");
  await publishedMedia.body?.cancel();
  await db.mediaAsset.update({ where: { id: fx.pFile.id }, data: { hidden: true } });
  ok((await anon.get(`/api/media/${fx.pFile.id}`)).status === 404, "hiding a published photo revokes the same URL");
  await db.mediaAsset.update({ where: { id: fx.pFile.id }, data: { hidden: false } });
  await db.activityPost.update({ where: { id: fx.post.id }, data: { status: "REJECTED" } });
  ok((await anon.get(`/api/media/${fx.pFile.id}`)).status === 404, "rejecting a published post revokes its photo URL");
  await db.activityPost.update({ where: { id: fx.post.id }, data: { status: "APPROVED" } });
  const optimizer = await anon.req(`/_next/image?url=${encodeURIComponent(`/api/media/${fx.pFile.id}`)}&w=640&q=75`);
  ok(optimizer.status === 400 || optimizer.status === 404, "independent image optimizer cannot cache revocable media");
  await optimizer.body?.cancel();
  // moderator cannot permanently delete files — only hide
  const delForm = forms(pPage.body).find(has("id", "back")) ;
  ok(!forms(pPage.body).some((f) => f.names.has("id") && f.names.has("back") && f.names.size === 3 && !f.names.has("hidden")), "no delete-file button for moderators");
  void delForm;
  const audit = await m.get("/admin/audit");
  ok(audit.status === 200 && !audit.body.includes(SUPER.email), "moderator's log shows only their own actions");
  // cross-site request with a valid session is refused
  const xs = await m.action(`/admin/posts/${fx.post.id}`, pPage.body, (f) => f.names.has("kind") && f.fields.some(([k, v]) => k === "status" && v === "REJECTED"), {}, { origin: "https://evil.example" });
  ok((await db.activityPost.findUnique({ where: { id: fx.post.id } })).status === "APPROVED", `cross-site form post rejected (${xs.status})`);

  console.log("\n4. Log book");
  const logs = await db.auditLog.findMany({ where: { adminId: mod.id } });
  ok(logs.some((l) => l.action === "status:APPROVED" && l.actorEmail === modEmail), "moderator's approval is in the log book with their email");
  const supAudit = await sup.get(`/admin/audit?user=${mod.id}`);
  ok(supAudit.status === 200 && supAudit.body.includes(modEmail), "super admin sees the moderator's log");

  console.log("\n5. Deactivation takes effect immediately");
  const uPage2 = await sup.get(`/admin/users/${mod.id}`);
  await sup.action(`/admin/users/${mod.id}`, uPage2.body, has("id", "name"), { role: "MODERATOR", permissions: ["POSTS"], active: [] });
  const after = await m.get("/admin/posts");
  ok(after.status >= 300 && after.loc.includes("/admin/login"), "deactivated moderator is logged out at once");

  console.log("\n6. Super admin deletes the moderator; their log entries survive");
  const uPage3 = await sup.get(`/admin/users/${mod.id}`);
  await sup.action(`/admin/users/${mod.id}`, uPage3.body, has("confirm"), { confirm: modEmail });
  ok(!(await db.adminUser.findUnique({ where: { id: mod.id } })), "moderator account deleted");
  ok((await db.auditLog.count({ where: { actorEmail: modEmail } })) > 0, "deleted moderator's actions are still in the log book");

  // cleanup fixtures (log rows stay — the log book is append-only by design)
  await db.mediaAsset.deleteMany({ where: { id: { in: [fx.cFile.id, fx.pFile.id] } } });
  await db.complaint.delete({ where: { id: fx.complaint.id } });
  await db.activityPost.delete({ where: { id: fx.post.id } });
  await db.contribution.delete({ where: { id: fx.contrib.id } });

  console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
