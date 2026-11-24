import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MediaGrid, Saved, Top } from "@/components/admin/ui";
import AdminUpload from "@/components/admin/AdminUpload";
import { saveFilm } from "../../actions";
import a from "../../admin.module.css";

export default async function Films({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("CONTENT");
  const [films, media] = await Promise.all([
    db.film.findMany({ orderBy: { order: "asc" } }),
    db.mediaAsset.findMany({ where: { ownerType: "FILM" }, orderBy: { sort: "asc" } }),
  ]);
  return (
    <>
      <Top title="মেগা প্রকল্পের ফিল্ম" sub="YouTube ID বা সরাসরি ভিডিও URL; নিজস্ব ছবি না থাকলে ৬০-প্রকল্পের ছবি দেখায়" />
      <Saved on={(await searchParams).saved} />
      {films.map((f) => (
        <div key={f.id} id={`f-${f.id}`} className={`${a.card} ${a.grid2}`} style={{ marginBottom: 18 }}>
          <form action={saveFilm} className={a.form}>
            <input type="hidden" name="id" value={f.id} />
            <div className={a.row}>
              <label>ক্রম<input className={a.input} name="order" type="number" defaultValue={f.order} /></label>
              <label>রং<select className={a.input} name="color" defaultValue={f.color}>{["amber", "teal", "pink", "violet", "blue", "coral"].map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>YouTube ID<input className={a.input} name="youtubeId" defaultValue={f.youtubeId ?? ""} pattern="[\w-]{11}" /></label>
              <label>৬০-প্রকল্প # (ছবির জন্য)<input className={a.input} name="projectOrder" type="number" defaultValue={f.projectOrder ?? ""} /></label>
            </div>
            <label>ভিডিও URL (https, webm/mp4)<input className={a.input} name="videoUrl" defaultValue={f.videoUrl ?? ""} /></label>
            <div className={a.row}>
              <label>শিরোনাম<input className={a.input} name="titleBn" defaultValue={f.titleBn} required /></label>
              <label>Title<input className={a.input} name="titleEn" defaultValue={f.titleEn} required /></label>
            </div>
            <div className={a.row}>
              <label>ট্যাগ<input className={a.input} name="subBn" defaultValue={f.subBn} /></label>
              <label>Tag<input className={a.input} name="subEn" defaultValue={f.subEn} /></label>
            </div>
            <div className={a.row}>
              <label>বিবরণ<textarea className={a.textarea} name="descBn" defaultValue={f.descBn} /></label>
              <label>Description<textarea className={a.textarea} name="descEn" defaultValue={f.descEn} /></label>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="published" defaultChecked={f.published} /> প্রকাশিত</label>
            <button className={a.btn}>সংরক্ষণ</button>
          </form>
          <div className={a.section}>
            <MediaGrid items={media.filter((m) => m.ownerId === f.id)} back={`/admin/films#f-${f.id}`} canDelete={me.super} />
            <AdminUpload ownerType="FILM" ownerId={f.id} back="/admin/films" />
          </div>
        </div>
      ))}
    </>
  );
}
