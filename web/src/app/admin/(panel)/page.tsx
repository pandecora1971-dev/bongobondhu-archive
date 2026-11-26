import { ADMIN } from "@/lib/admin-path";
import { can, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS, ROLES } from "@/lib/labels";
import { Top } from "@/components/admin/ui";
import a from "../admin.module.css";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const since = new Date(Date.now() - 7 * 864e5);
  const [cP, cA, kP, kAll, pP, pA, media, logs, team] = await Promise.all([
    can(me, "CONTRIBUTIONS") ? db.contribution.count({ where: { status: "PENDING" } }) : 0,
    can(me, "CONTRIBUTIONS") ? db.contribution.count({ where: { status: "APPROVED" } }) : 0,
    can(me, "COMPLAINTS") ? db.complaint.count({ where: { status: "PENDING" } }) : 0,
    can(me, "COMPLAINTS") ? db.complaint.count() : 0,
    can(me, "POSTS") ? db.activityPost.count({ where: { status: "PENDING" } }) : 0,
    can(me, "POSTS") ? db.activityPost.count({ where: { status: "APPROVED" } }) : 0,
    db.mediaAsset.count({ where: { state: "READY" } }),
    db.auditLog.findMany({ where: me.super ? {} : { adminId: me.id }, take: 12, orderBy: { createdAt: "desc" } }),
    me.super
      ? db.adminUser.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }], include: { _count: { select: { audit: { where: { createdAt: { gte: since } } } } } } })
      : Promise.resolve([]),
  ]);
  const S = (href: string, n: number, label: string) => (
    <div className={`${a.card} ${a.stat}`}><a href={href}><b>{n}</b><span>{label}</span></a></div>
  );
  return (
    <>
      <Top title={`স্বাগতম, ${me.name}`} sub={`${ROLES.label(me.role)}${me.super ? " — কোনো সীমা নেই" : " — অনুমতি: " + (me.permissions.map((p) => PERMISSIONS.label(p)).join(", ") || "কিছুই না")}`} />
      {sp.denied && <div className={a.warn}>এই অংশে প্রবেশের অনুমতি আপনার নেই। প্রয়োজনে একজন সুপার অ্যাডমিনকে বলুন।</div>}
      <div className={a.cards}>
        {can(me, "CONTRIBUTIONS") && S(`${ADMIN}/contributions?status=PENDING`, cP, "তথ্য জমা — অপেক্ষমাণ")}
        {can(me, "COMPLAINTS") && S(`${ADMIN}/complaints?status=PENDING`, kP, "অভিযোগ — নতুন")}
        {can(me, "POSTS") && S(`${ADMIN}/posts?status=PENDING`, pP, "দুঃসময়ের গল্প — অপেক্ষমাণ")}
        {can(me, "CONTRIBUTIONS") && S(`${ADMIN}/contributions?status=APPROVED`, cA, "অনুমোদিত তথ্য")}
        {can(me, "POSTS") && S(`${ADMIN}/posts?status=APPROVED`, pA, "প্রকাশিত কার্যক্রম")}
        {can(me, "COMPLAINTS") && S(`${ADMIN}/complaints`, kAll, "মোট অভিযোগ")}
        {S(`${ADMIN}/media`, media, "মিডিয়া ফাইল")}
      </div>
      {me.super && (
        <div className={a.section}>
          <h2>দল — গত ৭ দিনের কাজ</h2>
          <table className={a.table}>
            <thead><tr><th>নাম</th><th>ভূমিকা</th><th>অবস্থা</th><th>৭ দিনে কাজ</th><th>শেষ প্রবেশ</th></tr></thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.id}>
                  <td><a href={`${ADMIN}/users/${u.id}`}>{u.name}</a><br /><span className={a.muted}>{u.email}</span></td>
                  <td>{ROLES.label(u.role)}</td>
                  <td>{u.active ? "সক্রিয়" : <b style={{ color: "oklch(0.5 0.2 27)" }}>নিষ্ক্রিয়</b>}</td>
                  <td><a href={`${ADMIN}/audit?user=${u.id}`}>{u._count.audit}</a></td>
                  <td className={a.muted}>{u.lastLoginAt?.toLocaleString("en-GB") ?? "কখনো না"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={a.section}>
        <h2>{me.super ? "সাম্প্রতিক কাজ (সবার)" : "আমার সাম্প্রতিক কাজ"}</h2>
        <table className={a.table}>
          <thead><tr><th>সময়</th><th>কে</th><th>কাজ</th><th>বিষয়</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}><td className={a.muted}>{l.createdAt.toLocaleString("en-GB")}</td><td>{l.actorName ?? "—"}</td><td>{l.action}</td><td className={a.mono}>{l.entityType} {l.entityId?.slice(0, 12)}</td></tr>
            ))}
          </tbody>
        </table>
        <a className={`${a.btn} ${a.ghost}`} href={`${ADMIN}/audit`} style={{ justifySelf: "start" }}>পুরো লগ বই →</a>
      </div>
    </>
  );
}
