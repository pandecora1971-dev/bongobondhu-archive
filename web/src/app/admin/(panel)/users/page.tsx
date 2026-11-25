import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS, ROLES } from "@/lib/labels";
import { Saved, Top } from "@/components/admin/ui";
import { createUser } from "../../actions";
import PermFields from "./PermFields";
import a from "../../admin.module.css";

const ERR: Record<string, string> = { invalid: "তথ্য সঠিক নয় — পাসওয়ার্ড কমপক্ষে ১২ অক্ষর, অক্ষর ও সংখ্যা দুটোই থাকতে হবে।", exists: "এই ইমেইল আগে থেকেই আছে।" };

/** SUPER ADMIN ONLY: every account, its role, permissions and recent activity. */
export default async function Users({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin("SUPER");
  const sp = await searchParams;
  const since = new Date(Date.now() - 30 * 864e5);
  const users = await db.adminUser.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { audit: { where: { createdAt: { gte: since } } } } } },
  });
  return (
    <>
      <Top title="সুপার অ্যাডমিন ও মডারেটর" sub="শুধু সুপার অ্যাডমিন এই পাতা দেখতে ও পরিবর্তন করতে পারেন।" />
      <Saved on={sp.saved} text={sp.saved === "deleted" ? "অ্যাকাউন্টটি মুছে ফেলা হয়েছে। তার লগ রেকর্ড রয়ে গেছে।" : undefined} />
      {sp.error && <div className={a.warn}>{ERR[sp.error] ?? sp.error}</div>}
      <table className={a.table}>
        <thead><tr><th>নাম / ইমেইল</th><th>ভূমিকা</th><th>অনুমতি</th><th>অবস্থা</th><th>৩০ দিনে কাজ</th><th>শেষ প্রবেশ</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><a href={`/admin/users/${u.id}`}>{u.name}</a><br /><span className={a.muted}>{u.email}</span></td>
              <td><span className={`${a.role} ${u.role === "SUPER_ADMIN" ? a.roleSuper : ""}`}>{ROLES.label(u.role)}</span></td>
              <td className={a.muted} style={{ fontSize: 13 }}>{u.role === "SUPER_ADMIN" ? "সব" : u.permissions.map((p) => PERMISSIONS.label(p)).join(", ") || "কিছুই না"}</td>
              <td>{u.active ? "সক্রিয়" : <b style={{ color: "oklch(0.5 0.2 27)" }}>নিষ্ক্রিয়</b>}</td>
              <td><a href={`/admin/audit?user=${u.id}`}>{u._count.audit}</a></td>
              <td className={a.muted}>{u.lastLoginAt?.toLocaleString("en-GB") ?? "কখনো না"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form action={createUser} className={`${a.card} ${a.form}`} style={{ marginTop: 18, maxWidth: 760 }}>
        <h2 style={{ fontSize: 18 }}>নতুন সুপার অ্যাডমিন বা মডারেটর</h2>
        <div className={a.row}>
          <label>নাম<input className={a.input} name="name" required maxLength={120} /></label>
          <label>ইমেইল<input className={a.input} type="email" name="email" required autoComplete="off" /></label>
          <label>প্রাথমিক পাসওয়ার্ড (≥১২, অক্ষর + সংখ্যা)<input className={a.input} type="password" name="password" minLength={12} required autoComplete="new-password" /></label>
        </div>
        <PermFields />
        <button className={a.btn}>তৈরি করুন</button>
        <p className={a.muted}>পাসওয়ার্ডটি নিরাপদ উপায়ে জানান; প্রথম প্রবেশের পর “আমার অ্যাকাউন্ট” থেকে বদলে নিতে বলুন।</p>
      </form>
    </>
  );
}
