import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/labels";
import { Pager, Top } from "@/components/admin/ui";
import a from "../../admin.module.css";

const SIZE = 100;

// human labels for the log book
const ACTION: Record<string, string> = {
  login: "লগইন", "login:failed": "ভুল পাসওয়ার্ডে লগইন চেষ্টা", "status:APPROVED": "অনুমোদন", "status:REJECTED": "বাতিল", "status:ARCHIVED": "আর্কাইভ",
  "status:PENDING": "অপেক্ষমাণে ফেরত", edit: "সম্পাদনা", create: "তৈরি", delete: "মুছে ফেলা", note: "নোট", view: "দেখা", "view:pii": "গোপন তথ্য দেখা",
  "media:hide": "ফাইল লুকানো", "media:unhide": "ফাইল দেখানো", "media:delete": "ফাইল মুছে ফেলা", "media:upload": "ছবি আপলোড",
  "user:create": "ব্যবহারকারী তৈরি", "user:update": "ব্যবহারকারী পরিবর্তন", "user:delete": "ব্যবহারকারী মুছে ফেলা", "user:logout-all": "জোর করে লগআউট",
  "account:password": "নিজের পাসওয়ার্ড পরিবর্তন", "account:password-wrong": "পাসওয়ার্ড পরিবর্তনে ভুল", export: "CSV ডাউনলোড", "cache:refresh": "ক্যাশ রিফ্রেশ",
};
const label = (x: string) => ACTION[x] ?? (x.startsWith("redact:") ? `তথ্য মুছে ফেলা (${x.slice(7)})` : x.startsWith("progress:") ? `অভিযোগের ধাপ → ${x.slice(9)}` : x);
const ENTITY_LINK: Record<string, string> = { contribution: "contributions", complaint: "complaints", post: "posts", project: "projects", chapter: "history", AdminUser: "users" };

/**
 * Log book. Super admins see everyone (filter by person, action, type, date).
 * Moderators only ever see their own entries — the filter is enforced on the server.
 */
export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, +(sp.page || 1));
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? new Date(sp.from + "T00:00:00Z") : undefined;
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? new Date(sp.to + "T23:59:59Z") : undefined;
  const where: Prisma.AuditLogWhereInput = {
    ...(me.super ? (sp.user ? { adminId: sp.user } : {}) : { adminId: me.id }),
    ...(me.super && sp.role ? { actorRole: sp.role } : {}),
    ...(sp.action ? { action: { startsWith: sp.action } } : {}),
    ...(sp.entity ? { entityType: sp.entity } : {}),
    ...(sp.id ? { entityId: sp.id } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const [rows, total, users] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: SIZE, skip: (page - 1) * SIZE }),
    db.auditLog.count({ where }),
    me.super ? db.adminUser.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }) : Promise.resolve([]),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  return (
    <>
      <Top
        title={me.super ? "লগ বই — সব মডারেটর ও অ্যাডমিন" : "আমার কাজের লগ"}
        sub={me.super ? "কে, কখন, কী করেছে — প্রতিটি কাজ স্থায়ীভাবে সংরক্ষিত; মুছে বা বদলানো যায় না।" : "আপনার নিজের কাজের রেকর্ড। অন্যদের লগ শুধু সুপার অ্যাডমিন দেখেন।"}
      />
      <form className={a.filters}>
        {me.super && (
          <>
            <select name="user" defaultValue={sp.user ?? ""}>
              <option value="">সবাই</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({ROLES.label(u.role)})</option>)}
            </select>
            <select name="role" defaultValue={sp.role ?? ""}>
              <option value="">সব ভূমিকা</option>
              <option value="MODERATOR">শুধু মডারেটর</option>
              <option value="SUPER_ADMIN">শুধু সুপার অ্যাডমিন</option>
            </select>
          </>
        )}
        <select name="action" defaultValue={sp.action ?? ""}>
          <option value="">সব কাজ</option>
          <option value="status:">অনুমোদন / বাতিল</option>
          <option value="edit">সম্পাদনা</option>
          <option value="redact:">তথ্য মুছে ফেলা</option>
          <option value="media:">ফাইল</option>
          <option value="view">দেখা</option>
          <option value="user:">ব্যবহারকারী</option>
          <option value="login">লগইন</option>
          <option value="export">CSV</option>
        </select>
        <select name="entity" defaultValue={sp.entity ?? ""}>
          <option value="">সব বিষয়</option>
          {["contribution", "complaint", "post", "media", "project", "film", "chapter", "event", "milestone", "content", "AdminUser"].map((e) => <option key={e}>{e}</option>)}
        </select>
        <input type="date" name="from" defaultValue={sp.from ?? ""} aria-label="থেকে" />
        <input type="date" name="to" defaultValue={sp.to ?? ""} aria-label="পর্যন্ত" />
        <button className={a.btn}>ফিল্টার</button>
        {qs.size > 0 && <a className={`${a.btn} ${a.ghost}`} href="/admin/audit">রিসেট</a>}
      </form>
      <table className={a.table}>
        <thead><tr><th>সময়</th><th>কে</th><th>কাজ</th><th>বিষয়</th><th>বিস্তারিত</th></tr></thead>
        <tbody>
          {rows.map((l) => {
            const link = ENTITY_LINK[l.entityType];
            return (
              <tr key={l.id}>
                <td className={a.muted} style={{ whiteSpace: "nowrap" }}>{l.createdAt.toLocaleString("en-GB")}</td>
                <td>
                  {me.super && l.adminId ? <a href={`/admin/audit?user=${l.adminId}`}>{l.actorName ?? "—"}</a> : l.actorName ?? "—"}
                  <br /><span className={a.muted}>{l.actorEmail}{l.actorRole && ` · ${ROLES.label(l.actorRole as never) || l.actorRole}`}</span>
                  {!l.adminId && l.actorEmail && <><br /><span className={a.pill}>অ্যাকাউন্ট মুছে ফেলা</span></>}
                </td>
                <td><b style={{ color: l.action.includes("failed") || l.action.includes("delete") || l.action.includes("wrong") ? "oklch(0.5 0.2 27)" : undefined }}>{label(l.action)}</b></td>
                <td className={a.mono}>
                  {l.entityType}
                  <br />
                  {l.entityId && link && (me.super || l.entityType !== "AdminUser") ? <a href={`/admin/${link}/${l.entityId}`}>{l.entityId}</a> : l.entityId}
                </td>
                <td className={a.mono} style={{ maxWidth: 460, wordBreak: "break-word" }}>{l.detail ? JSON.stringify(l.detail).slice(0, 400) : ""}</td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={5} className={a.muted}>কোনো রেকর্ড নেই।</td></tr>}
        </tbody>
      </table>
      <Pager page={page} total={total} size={SIZE} base={`/admin/audit?${qs}`} />
    </>
  );
}
