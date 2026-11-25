import type { Prisma } from "@prisma/client";
import { can, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { nameIndex } from "@/lib/crypto";
import { CRIMES, PROGRESS } from "@/lib/labels";
import { DIVISIONS, divisionLabel } from "@/lib/geo";
import { Pager, Pill, Top } from "@/components/admin/ui";
import a from "../../admin.module.css";

const SIZE = 40;

export default async function Complaints({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin("COMPLAINTS");
  const sp = await searchParams;
  const page = Math.max(1, +(sp.page || 1));
  const where: Prisma.ComplaintWhereInput = {
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.progress ? { progress: sp.progress as never } : {}),
    ...(sp.crime ? { crimes: { has: sp.crime as never } } : {}),
    ...(sp.division ? { division: sp.division as never } : {}),
    // description and accused details are encrypted: search covers code, area and the accused's exact full name
    ...(sp.q ? { OR: [{ code: { contains: sp.q.toUpperCase() } }, { district: { contains: sp.q } }, { thana: { contains: sp.q, mode: "insensitive" } }, { accused: { some: { nameIdx: nameIndex(sp.q) ?? "-" } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.complaint.findMany({ where, orderBy: { createdAt: "desc" }, take: SIZE, skip: (page - 1) * SIZE, include: { _count: { select: { accused: true } } } }),
    db.complaint.count({ where }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  return (
    <>
      <Top title="অভিযোগ" sub="গোপনীয় — কখনো প্রকাশ্য নয়। শুধু অনুমোদিত যাচাইকারীরা দেখতে পান।">
        {can(me, "EXPORT") && <a className={`${a.btn} ${a.ghost}`} href={`/api/admin/export?type=complaints${sp.status ? `&status=${sp.status}` : ""}`}>CSV</a>}
        {me.super && <a className={`${a.btn} ${a.ghost}`} href={`/api/admin/export?type=complaints&pii=1${sp.status ? `&status=${sp.status}` : ""}`}>CSV (যোগাযোগসহ)</a>}
      </Top>
      <form className={a.filters}>
        <select name="status" defaultValue={sp.status ?? ""}><option value="">সব অবস্থা</option><option value="PENDING">নতুন</option><option value="APPROVED">যাচাইকৃত</option><option value="REJECTED">বাতিল</option><option value="ARCHIVED">আর্কাইভ</option></select>
        <select name="progress" defaultValue={sp.progress ?? ""}><option value="">সব ধাপ</option>{PROGRESS.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select>
        <select name="crime" defaultValue={sp.crime ?? ""}><option value="">সব অপরাধ</option>{CRIMES.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select>
        <select name="division" defaultValue={sp.division ?? ""}><option value="">সব বিভাগ</option>{DIVISIONS.map((d) => <option key={d.code} value={d.code}>{d.bn}</option>)}</select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="কোড, এলাকা বা অভিযুক্তের পুরো নাম…" title="নিরাপত্তার জন্য বিবরণ এনক্রিপ্ট করা থাকে; অভিযুক্তকে খুঁজতে পুরো নাম হুবহু লিখুন" />
        <button className={a.btn}>খুঁজুন</button>
      </form>
      <table className={a.table}>
        <thead><tr><th>কোড</th><th>অপরাধ</th><th>এলাকা</th><th>অভিযুক্ত</th><th>ধাপ</th><th>অবস্থা</th><th>জমা</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={a.mono}><a href={`/admin/complaints/${r.id}`}>{r.code}</a></td>
              <td>{r.crimes.map((c) => CRIMES.label(c)).join(", ")}</td>
              <td className={a.muted}>{[r.thana, r.district, divisionLabel(r.division)].filter(Boolean).join(", ") || "—"}</td>
              <td>{r._count.accused}</td>
              <td className={a.muted}>{PROGRESS.label(r.progress)}</td>
              <td><Pill s={r.status} /></td>
              <td className={a.muted}>{r.createdAt.toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className={a.muted}>কিছু পাওয়া যায়নি।</td></tr>}
        </tbody>
      </table>
      <Pager page={page} total={total} size={SIZE} base={`/admin/complaints?${qs}`} />
    </>
  );
}
