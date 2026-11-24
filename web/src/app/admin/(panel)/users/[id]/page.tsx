import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/labels";
import { Saved, Top } from "@/components/admin/ui";
import { deleteUser, forceLogout, updateUser } from "../../../actions";
import PermFields from "../PermFields";
import a from "../../../admin.module.css";

const ERR: Record<string, string> = {
  invalid: "তথ্য সঠিক নয় — নতুন পাসওয়ার্ড কমপক্ষে ১২ অক্ষর, অক্ষর ও সংখ্যা দুটোই।",
  self: "নিজের ভূমিকা কমানো, নিজেকে নিষ্ক্রিয় করা বা নিজেকে মুছে ফেলা যায় না।",
  last: "অন্তত একজন সক্রিয় সুপার অ্যাডমিন থাকতেই হবে।",
  confirm: "মুছে ফেলতে ঠিক ইমেইলটি লিখুন।",
};

/** SUPER ADMIN ONLY: edit one account + see everything that person did. */
export default async function User({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const me = await requireAdmin("SUPER");
  const { id } = await params;
  const sp = await searchParams;
  const u = await db.adminUser.findUnique({ where: { id } });
  if (!u) notFound();
  const [logs, total, creator] = await Promise.all([
    db.auditLog.findMany({ where: { adminId: u.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.auditLog.count({ where: { adminId: u.id } }),
    u.createdById ? db.adminUser.findUnique({ where: { id: u.createdById }, select: { name: true } }) : null,
  ]);
  const self = u.id === me.id;
  return (
    <>
      <Top title={u.name} sub={`${u.email} · ${ROLES.label(u.role)}${creator ? ` · তৈরি করেছেন ${creator.name}` : ""} · ${u.createdAt.toLocaleDateString("en-GB")}`}>
        <a className={`${a.btn} ${a.ghost}`} href="/admin/users">← তালিকা</a>
      </Top>
      <Saved on={sp.saved} />
      {sp.error && <div className={a.warn}>{ERR[sp.error] ?? sp.error}</div>}
      <div className={a.grid2}>
        <div>
          <form action={updateUser} className={`${a.card} ${a.form}`}>
            <input type="hidden" name="id" value={u.id} />
            <label>নাম<input className={a.input} name="name" defaultValue={u.name} required maxLength={120} /></label>
            <PermFields role={u.role} perms={u.permissions} />
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="active" defaultChecked={u.active} disabled={self} /> সক্রিয় (টিক তুলে দিলে সঙ্গে সঙ্গে প্রবেশ বন্ধ)
            </label>
            {self && <input type="hidden" name="active" value="on" />}
            <label>নতুন পাসওয়ার্ড (ফাঁকা = অপরিবর্তিত)<input className={a.input} type="password" name="password" autoComplete="new-password" /></label>
            <button className={a.btn}>সংরক্ষণ</button>
            <p className={a.muted}>ভূমিকা, অনুমতি, পাসওয়ার্ড বা সক্রিয়তা বদলালে ওই ব্যক্তি সব ডিভাইস থেকে লগআউট হয়ে যান।</p>
          </form>
          <div className={`${a.card} ${a.section}`} style={{ marginTop: 18 }}>
            <h2>নিরাপত্তা</h2>
            <form action={forceLogout}>
              <input type="hidden" name="id" value={u.id} />
              <button className={`${a.btn} ${a.ghost}`}>সব ডিভাইস থেকে লগআউট করুন</button>
            </form>
            {!self && (
              <form action={deleteUser} className={a.form} style={{ borderTop: "1px solid #eee9df", paddingTop: 12 }}>
                <input type="hidden" name="id" value={u.id} />
                <label>
                  অ্যাকাউন্ট স্থায়ীভাবে মুছতে ইমেইলটি লিখুন: <span className={a.mono}>{u.email}</span>
                  <input className={a.input} name="confirm" autoComplete="off" required />
                </label>
                <button className={`${a.btn} ${a.bad}`}>অ্যাকাউন্ট মুছে ফেলুন</button>
                <p className={a.muted}>সাধারণত “নিষ্ক্রিয়” করাই যথেষ্ট। মুছে ফেললেও তার লগ রেকর্ড থেকে যায়।</p>
              </form>
            )}
          </div>
        </div>
        <div className={`${a.card} ${a.section}`}>
          <h2>এই ব্যক্তির কাজ ({total})</h2>
          <ul className={a.timeline}>
            {logs.map((l) => (
              <li key={l.id}><b>{l.action}</b> · {l.entityType} <span className={a.mono}>{l.entityId?.slice(0, 14)}</span><br /><span className={a.muted}>{l.createdAt.toLocaleString("en-GB")}</span></li>
            ))}
            {!logs.length && <li className={a.muted}>এখনো কোনো কাজ নেই।</li>}
          </ul>
          <a className={`${a.btn} ${a.ghost}`} href={`/admin/audit?user=${u.id}`} style={{ justifySelf: "start" }}>পুরো লগ →</a>
        </div>
      </div>
    </>
  );
}
