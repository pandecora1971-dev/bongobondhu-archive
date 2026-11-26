import { ADMIN } from "@/lib/admin-path";
import type { Prisma } from "@prisma/client";
import { can, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVITY_TYPES, ORGS } from "@/lib/labels";
import { Pager, Pill, Top } from "@/components/admin/ui";
import a from "../../admin.module.css";

const SIZE = 40;

export default async function Posts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin("POSTS");
  const sp = await searchParams;
  const page = Math.max(1, +(sp.page || 1));
  const where: Prisma.ActivityPostWhereInput = {
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.org ? { org: sp.org as never } : {}),
    ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { description: { contains: sp.q, mode: "insensitive" } }, { district: { contains: sp.q } }, { thana: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.activityPost.findMany({ where, orderBy: { createdAt: "desc" }, take: SIZE, skip: (page - 1) * SIZE }),
    db.activityPost.count({ where }),
  ]);
  const thumbs = await db.mediaAsset.findMany({ where: { ownerType: "POST", ownerId: { in: rows.map((r) => r.id) }, sort: 0 }, select: { id: true, ownerId: true } });
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  return (
    <>
      <Top title="দুঃসময়ের গল্প" sub="অনুমোদনের পরই কার্যক্রম /dusshomoy পাতায় প্রকাশিত হয়">
        {can(me, "EXPORT") && <a className={`${a.btn} ${a.ghost}`} href={`/api/admin/export?type=posts${sp.status ? `&status=${sp.status}` : ""}`}>CSV ডাউনলোড</a>}
      </Top>
      <form className={a.filters}>
        <select name="status" defaultValue={sp.status ?? ""}><option value="">সব অবস্থা</option><option value="PENDING">অপেক্ষমাণ</option><option value="APPROVED">প্রকাশিত</option><option value="REJECTED">বাতিল</option><option value="ARCHIVED">আর্কাইভ</option></select>
        <select name="org" defaultValue={sp.org ?? ""}><option value="">সব সংগঠন</option>{ORGS.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="শিরোনাম, থানা, জেলা…" />
        <button className={a.btn}>খুঁজুন</button>
      </form>
      <table className={a.table}>
        <thead><tr><th></th><th>শিরোনাম</th><th>সংগঠন / ধরন</th><th>এলাকা</th><th>অবস্থা</th><th>জমা</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const th = thumbs.find((t) => t.ownerId === r.id);
            return (
              <tr key={r.id}>
                <td style={{ width: 72 }}>{th && <img src={`/api/media/${th.id}?v=thumb`} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 3 }} />}</td>
                <td><a href={`${ADMIN}/posts/${r.id}`}>{r.title}</a></td>
                <td className={a.muted}>{ORGS.label(r.org)} · {ACTIVITY_TYPES.label(r.activityType)}</td>
                <td className={a.muted}>{r.thana}, {r.district}</td>
                <td><Pill s={r.status} /></td>
                <td className={a.muted}>{r.createdAt.toLocaleDateString("en-GB")}</td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={6} className={a.muted}>কিছু পাওয়া যায়নি।</td></tr>}
        </tbody>
      </table>
      <Pager page={page} total={total} size={SIZE} base={`${ADMIN}/posts?${qs}`} />
    </>
  );
}
