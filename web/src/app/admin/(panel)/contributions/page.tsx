import type { Prisma } from "@prisma/client";
import { can, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONTRIBUTION_TYPES, SUBJECTS } from "@/lib/labels";
import { Pager, Pill, Top } from "@/components/admin/ui";
import a from "../../admin.module.css";

const SIZE = 40;

export default async function Contributions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin("CONTRIBUTIONS");
  const sp = await searchParams;
  const page = Math.max(1, +(sp.page || 1));
  const where: Prisma.ContributionWhereInput = {
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.subject ? { subject: sp.subject as never } : {}),
    ...(sp.q ? { OR: [{ ref: { contains: sp.q, mode: "insensitive" } }, { title: { contains: sp.q, mode: "insensitive" } }, { description: { contains: sp.q, mode: "insensitive" } }, { place: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.contribution.findMany({ where, orderBy: { createdAt: "desc" }, take: SIZE, skip: (page - 1) * SIZE }),
    db.contribution.count({ where }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  return (
    <>
      <Top title="তথ্য জমা (বঙ্গবন্ধু / শেখ হাসিনা)" sub="হোমপেজের BB / SH ফর্ম থেকে আসা জমা">
        {can(me, "EXPORT") && <a className={`${a.btn} ${a.ghost}`} href={`/api/admin/export?type=contributions${sp.status ? `&status=${sp.status}` : ""}`}>CSV ডাউনলোড</a>}
      </Top>
      <form className={a.filters}>
        <select name="status" defaultValue={sp.status ?? ""}><option value="">সব অবস্থা</option><option value="PENDING">অপেক্ষমাণ</option><option value="APPROVED">অনুমোদিত</option><option value="REJECTED">বাতিল</option><option value="ARCHIVED">আর্কাইভ</option></select>
        <select name="subject" defaultValue={sp.subject ?? ""}><option value="">সব বিষয়</option>{SUBJECTS.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="রেফারেন্স, শিরোনাম, স্থান…" />
        <button className={a.btn}>খুঁজুন</button>
      </form>
      <table className={a.table}>
        <thead><tr><th>রেফারেন্স</th><th>শিরোনাম</th><th>ধরন</th><th>সাল</th><th>অবস্থা</th><th>জমা</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={a.mono}><a href={`/admin/contributions/${r.id}`}>{r.ref}</a></td>
              <td><a href={`/admin/contributions/${r.id}`}>{r.title}</a><br /><span className={a.muted}>{SUBJECTS.label(r.subject)} · {r.place}</span></td>
              <td className={a.muted}>{r.types.map((t) => CONTRIBUTION_TYPES.label(t)).join(", ")}</td>
              <td>{r.year}</td>
              <td><Pill s={r.status} /></td>
              <td className={a.muted}>{r.createdAt.toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className={a.muted}>কিছু পাওয়া যায়নি।</td></tr>}
        </tbody>
      </table>
      <Pager page={page} total={total} size={SIZE} base={`/admin/contributions?${qs}`} />
    </>
  );
}
