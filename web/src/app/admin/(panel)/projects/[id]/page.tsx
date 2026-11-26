import { ADMIN } from "@/lib/admin-path";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MediaGrid, Saved, Top } from "@/components/admin/ui";
import AdminUpload from "@/components/admin/AdminUpload";
import { saveProject } from "../../../actions";
import a from "../../../admin.module.css";

export default async function Project({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("CONTENT");
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id } });
  if (!p) notFound();
  const media = await db.mediaAsset.findMany({ where: { ownerType: "PROJECT", ownerId: p.id }, orderBy: { sort: "asc" } });
  const back = `${ADMIN}/projects/${p.id}`;
  return (
    <>
      <Top title={`${p.order + 1}. ${p.titleBn}`} sub={p.titleEn}><a className={`${a.btn} ${a.ghost}`} href={`${ADMIN}/projects`}>← তালিকা</a></Top>
      <Saved on={(await searchParams).saved} />
      <div className={a.grid2}>
        <form action={saveProject} className={`${a.card} ${a.form}`}>
          <input type="hidden" name="id" value={p.id} />
          <label>শিরোনাম (বাংলা)<input className={a.input} name="titleBn" defaultValue={p.titleBn} required /></label>
          <label>Title (English)<input className={a.input} name="titleEn" defaultValue={p.titleEn} required /></label>
          <div className={a.row}>
            <label>খাত<input className={a.input} name="sector" defaultValue={p.sector ?? ""} /></label>
            <label>স্থান<input className={a.input} name="place" defaultValue={p.place ?? ""} /></label>
            <label>সাল<input className={a.input} name="year" defaultValue={p.year ?? ""} /></label>
            <label>ব্যয়<input className={a.input} name="cost" defaultValue={p.cost ?? ""} /></label>
          </div>
          <label>নোট (বাংলা)<textarea className={a.textarea} name="noteBn" defaultValue={p.noteBn ?? ""} /></label>
          <label>Note (English)<textarea className={a.textarea} name="noteEn" defaultValue={p.noteEn ?? ""} /></label>
          <button className={a.btn}>সংরক্ষণ</button>
        </form>
        <div className={`${a.card} ${a.section}`}>
          <h2>ছবি</h2>
          <p className={a.muted}>প্রথম দৃশ্যমান ছবিটি কার্ডে দেখায়; হোভারে বাকিগুলো ঘোরে। মরা লিংক “লুকান” বা “মুছুন”।</p>
          <MediaGrid items={media} back={back} canDelete={me.super} />
          <AdminUpload ownerType="PROJECT" ownerId={p.id} back={back} />
        </div>
      </div>
    </>
  );
}
