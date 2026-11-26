import { ADMIN } from "@/lib/admin-path";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVITY_TYPES, LEVELS, ORGS } from "@/lib/labels";
import { DIVISIONS } from "@/lib/geo";
import { MediaGrid, Pill, Saved, StatusButtons, Top } from "@/components/admin/ui";
import { updatePost } from "../../../actions";
import a from "../../../admin.module.css";

export default async function Post({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("POSTS");
  const { id } = await params;
  const p = await db.activityPost.findUnique({ where: { id } });
  if (!p) notFound();
  const media = await db.mediaAsset.findMany({ where: { ownerType: "POST", ownerId: p.id }, orderBy: { sort: "asc" } });
  const back = `${ADMIN}/posts/${p.id}`;
  return (
    <>
      <Top title={p.title} sub={`${ORGS.label(p.org)} · ${p.createdAt.toLocaleString("en-GB")}`}>
        <Pill s={p.status} />
        {p.status === "APPROVED" && <a className={`${a.btn} ${a.ghost}`} href={`/dusshomoy/${p.id}`} target="_blank">সাইটে দেখুন ↗</a>}
      </Top>
      <Saved on={(await searchParams).saved} />
      <div className={a.grid2}>
        <form action={updatePost} className={`${a.card} ${a.form}`}>
          <input type="hidden" name="id" value={p.id} />
          <label>শিরোনাম<input className={a.input} name="title" defaultValue={p.title} required maxLength={300} /></label>
          <div className={a.row}>
            <label>সংগঠন<select className={a.input} name="org" defaultValue={p.org}>{ORGS.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select></label>
            <label>ধরন<select className={a.input} name="activityType" defaultValue={p.activityType}>{ACTIVITY_TYPES.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select></label>
            <label>স্তর<select className={a.input} name="level" defaultValue={p.level ?? ""}><option value="">—</option>{LEVELS.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select></label>
          </div>
          <div className={a.row}>
            <label>বিভাগ<select className={a.input} name="division" defaultValue={p.division ?? ""}><option value="">—</option>{DIVISIONS.map((d) => <option key={d.code} value={d.code}>{d.bn}</option>)}</select></label>
            <label>জেলা<input className={a.input} name="district" defaultValue={p.district} required /></label>
            <label>থানা<input className={a.input} name="thana" defaultValue={p.thana} required /></label>
          </div>
          <div className={a.row}>
            <label>স্থান<input className={a.input} name="place" defaultValue={p.place ?? ""} /></label>
            <label>অংশগ্রহণকারী<input className={a.input} name="participants" type="number" defaultValue={p.participants ?? ""} /></label>
            <label>তারিখ<input className={a.input} disabled defaultValue={p.date?.toISOString().slice(0, 10) ?? ""} /></label>
          </div>
          <label>বিবরণ<textarea className={a.textarea} name="description" defaultValue={p.description ?? ""} /></label>
          <div className={a.muted}>লিংক: {p.links.map((l) => <div key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow">{l}</a></div>)}</div>
          <div className={a.row}>
            <label>নাম<input className={a.input} name="name" defaultValue={p.name ?? ""} /></label>
            <label>পদ<input className={a.input} name="role" defaultValue={p.role ?? ""} /></label>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="anonymous" defaultChecked={p.anonymous} /> নাম প্রকাশ করা হবে না</label>
          <label>পর্যালোচনার নোট<textarea className={a.textarea} name="reviewNote" defaultValue={p.reviewNote ?? ""} /></label>
          <button className={a.btn}>সংরক্ষণ</button>
        </form>
        <div>
          <div className={`${a.card} ${a.section}`}>
            <h2>সিদ্ধান্ত</h2>
            <StatusButtons kind="post" id={p.id} current={p.status} back={back} />
          </div>
          <div className={`${a.card} ${a.section}`}>
            <h2>ছবি ({media.length})</h2>
            <p className={a.muted}>মুখ বা সংবেদনশীল কিছু থাকলে “লুকান” চাপুন — প্রকাশ্য পাতায় দেখাবে না।</p>
            <MediaGrid items={media} back={back} canDelete={me.super} />
          </div>
        </div>
      </div>
    </>
  );
}
