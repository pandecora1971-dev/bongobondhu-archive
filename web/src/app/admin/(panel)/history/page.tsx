import { ADMIN } from "@/lib/admin-path";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Top } from "@/components/admin/ui";
import a from "../../admin.module.css";

export default async function History() {
  await requireAdmin("CONTENT");
  const rows = await db.historyChapter.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { events: true } } } });
  return (
    <>
      <Top title="ইতিহাস — অধ্যায় ও ঘটনা" sub="১৯৪৮–১৯৭৫" />
      <table className={a.table}>
        <thead><tr><th>#</th><th>সময়কাল</th><th>শিরোনাম</th><th>ঘটনা</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{r.order + 1}</td><td>{r.yearBn}</td><td><a href={`${ADMIN}/history/${r.id}`}>{r.titleBn}</a></td><td>{r._count.events}</td></tr>)}</tbody>
      </table>
    </>
  );
}
