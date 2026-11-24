import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MediaGrid, Saved, Top } from "@/components/admin/ui";
import AdminUpload from "@/components/admin/AdminUpload";
import { deleteEvent, saveChapter, saveEvent } from "../../../actions";
import a from "../../../admin.module.css";

export default async function Chapter({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("CONTENT");
  const { id } = await params;
  const c = await db.historyChapter.findUnique({ where: { id }, include: { events: { orderBy: { order: "asc" } } } });
  if (!c) notFound();
  const media = await db.mediaAsset.findMany({ where: { ownerType: "CHAPTER", ownerId: c.id }, orderBy: { sort: "asc" } });
  const back = `/admin/history/${c.id}`;
  const Ev = ({ e, i }: { e?: (typeof c.events)[number]; i: number }) => (
    <form action={saveEvent} className={a.form} style={{ borderTop: "1px solid #eee9df", paddingTop: 12 }}>
      <input type="hidden" name="chapterId" value={c.id} />
      <input type="hidden" name="eventId" value={e?.id ?? ""} />
      <div className={a.row}>
        <label>ক্রম<input className={a.input} name="order" type="number" defaultValue={e?.order ?? i} /></label>
        <label>তারিখ<input className={a.input} name="dateBn" defaultValue={e?.dateBn} required /></label>
        <label>Date<input className={a.input} name="dateEn" defaultValue={e?.dateEn} /></label>
      </div>
      <div className={a.row}>
        <label>ঘটনা<textarea className={a.textarea} style={{ minHeight: 70 }} name="textBn" defaultValue={e?.textBn} required /></label>
        <label>Event<textarea className={a.textarea} style={{ minHeight: 70 }} name="textEn" defaultValue={e?.textEn} /></label>
      </div>
      <div className={a.actions}>
        <button className={`${a.btn} ${a.sm}`}>{e ? "সংরক্ষণ" : "+ নতুন ঘটনা যোগ"}</button>
        {e && <button className={`${a.btn} ${a.bad} ${a.sm}`} formAction={deleteEvent}>মুছুন</button>}
      </div>
    </form>
  );
  return (
    <>
      <Top title={c.titleBn} sub={c.yearBn}><a className={`${a.btn} ${a.ghost}`} href="/admin/history">← অধ্যায়</a></Top>
      <Saved on={(await searchParams).saved} />
      <div className={a.grid2}>
        <div>
          <form action={saveChapter} className={`${a.card} ${a.form}`}>
            <input type="hidden" name="id" value={c.id} />
            <div className={a.row}>
              <label>সময়কাল<input className={a.input} name="yearBn" defaultValue={c.yearBn} /></label>
              <label>Years<input className={a.input} name="yearEn" defaultValue={c.yearEn} /></label>
            </div>
            <div className={a.row}>
              <label>শিরোনাম<input className={a.input} name="titleBn" defaultValue={c.titleBn} required /></label>
              <label>Title<input className={a.input} name="titleEn" defaultValue={c.titleEn} required /></label>
            </div>
            <div className={a.row}>
              <label>বিবরণ<textarea className={a.textarea} name="descBn" defaultValue={c.descBn} /></label>
              <label>Description<textarea className={a.textarea} name="descEn" defaultValue={c.descEn} /></label>
            </div>
            <button className={a.btn}>অধ্যায় সংরক্ষণ</button>
          </form>
          <div className={`${a.card} ${a.section}`} style={{ marginTop: 18 }}>
            <h2>ঘটনা ({c.events.length})</h2>
            {c.events.map((e, i) => <Ev key={e.id} e={e} i={i} />)}
            <Ev i={c.events.length} />
          </div>
        </div>
        <div className={`${a.card} ${a.section}`}>
          <h2>চাকার ছবি</h2>
          <MediaGrid items={media} back={back} canDelete={me.super} />
          <AdminUpload ownerType="CHAPTER" ownerId={c.id} back={back} />
        </div>
      </div>
    </>
  );
}
