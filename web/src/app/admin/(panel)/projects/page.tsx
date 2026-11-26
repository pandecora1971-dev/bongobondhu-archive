import { ADMIN } from "@/lib/admin-path";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { Top } from "@/components/admin/ui";
import a from "../../admin.module.css";

export default async function Projects() {
  await requireAdmin("CONTENT");
  const [rows, media] = await Promise.all([
    db.project.findMany({ orderBy: { order: "asc" } }),
    db.mediaAsset.findMany({ where: { ownerType: "PROJECT", state: "READY" }, orderBy: { sort: "asc" } }),
  ]);
  return (
    <>
      <Top title="৬০টি প্রকল্প" sub="শিরোনাম, তথ্য ও ছবি সম্পাদনা" />
      <table className={a.table}>
        <thead><tr><th>#</th><th></th><th>শিরোনাম</th><th>ছবি</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const m = media.filter((x) => x.ownerId === r.id);
            const vis = m.filter((x) => !x.hidden);
            return (
              <tr key={r.id}>
                <td>{r.order + 1}</td>
                <td style={{ width: 80 }}>{vis[0] && <img src={mediaUrl(vis[0], "thumb")} alt="" referrerPolicy="no-referrer" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 3 }} />}</td>
                <td><a href={`${ADMIN}/projects/${r.id}`}>{r.titleBn}</a><br /><span className={a.muted}>{r.titleEn}</span></td>
                <td className={a.muted}>{vis.length} {m.some((x) => !x.key) && "· বাইরের লিংক"} {!vis.length && <b style={{ color: "oklch(0.5 0.2 27)" }}>ছবি নেই</b>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
