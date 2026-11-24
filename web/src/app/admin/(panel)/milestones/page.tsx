import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROJECT_STATUS } from "@/lib/labels";
import { MediaGrid, Saved, Top } from "@/components/admin/ui";
import AdminUpload from "@/components/admin/AdminUpload";
import { saveMilestone } from "../../actions";
import a from "../../admin.module.css";

export default async function Milestones({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("CONTENT");
  const [rows, media] = await Promise.all([
    db.milestone.findMany({ orderBy: [{ roadOrder: "asc" }, { order: "asc" }] }),
    db.mediaAsset.findMany({ where: { ownerType: "MILESTONE" }, orderBy: { sort: "asc" } }),
  ]);
  return (
    <>
      <Top title="উন্নয়ন পথ ও অ্যাটলাস" sub="রোডম্যাপের ক্রম, অবস্থা, স্থানাঙ্ক ও ছবি" />
      <Saved on={(await searchParams).saved} />
      {rows.map((m) => (
        <div key={m.id} id={`m-${m.id}`} className={`${a.card} ${a.grid2}`} style={{ marginBottom: 18 }}>
          <form action={saveMilestone} className={a.form}>
            <input type="hidden" name="id" value={m.id} />
            <div className={a.row}>
              <label>পথে ক্রম (ফাঁকা = লুকানো)<input className={a.input} name="roadOrder" type="number" defaultValue={m.roadOrder ?? ""} /></label>
              <label>পথে সাল<input className={a.input} name="roadYearBn" defaultValue={m.roadYearBn ?? ""} placeholder="ফাঁকা = চলমান" /></label>
              <label>অবস্থা<select className={a.input} name="status" defaultValue={m.status}>{PROJECT_STATUS.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select></label>
              <label>দ্রাঘিমা (lng)<input className={a.input} name="lng" defaultValue={m.lng ?? ""} /></label>
              <label>অক্ষাংশ (lat)<input className={a.input} name="lat" defaultValue={m.lat ?? ""} /></label>
            </div>
            <div className={a.row}>
              <label>শিরোনাম<input className={a.input} name="titleBn" defaultValue={m.titleBn} required /></label>
              <label>Title<input className={a.input} name="titleEn" defaultValue={m.titleEn} required /></label>
            </div>
            <div className={a.row}>
              <label>স্থান<input className={a.input} name="placeBn" defaultValue={m.placeBn} /></label>
              <label>Place<input className={a.input} name="placeEn" defaultValue={m.placeEn} /></label>
              <label>সময়<input className={a.input} name="whenBn" defaultValue={m.whenBn} /></label>
              <label>When<input className={a.input} name="whenEn" defaultValue={m.whenEn} /></label>
            </div>
            <div className={a.row}>
              <label>বিবরণ<textarea className={a.textarea} name="descBn" defaultValue={m.descBn} /></label>
              <label>Description<textarea className={a.textarea} name="descEn" defaultValue={m.descEn} /></label>
            </div>
            <button className={a.btn}>সংরক্ষণ</button>
          </form>
          <div className={a.section}>
            <MediaGrid items={media.filter((x) => x.ownerId === m.id)} back={`/admin/milestones#m-${m.id}`} canDelete={me.super} />
            <AdminUpload ownerType="MILESTONE" ownerId={m.id} back="/admin/milestones" />
          </div>
        </div>
      ))}
    </>
  );
}
