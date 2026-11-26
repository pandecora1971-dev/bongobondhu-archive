import { ADMIN } from "@/lib/admin-path";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BLOCKS, type BlockKey } from "@/lib/content";
import { MediaGrid, Saved, Top } from "@/components/admin/ui";
import AdminUpload from "@/components/admin/AdminUpload";
import { refreshCache, saveBlock } from "../../actions";
import a from "../../admin.module.css";

const SLOTS: [string, string][] = [
  ["hero", "হিরো স্লাইড (পটভূমি)"],
  ["dom", "চারটি ক্ষেত্রের কার্ড (ক্রম ০,১,৩)"],
  ["pm", "প্রধানমন্ত্রীর প্রতিকৃতি"],
];

export default async function Content({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; key?: string }> }) {
  const me = await requireAdmin("CONTENT");
  const sp = await searchParams;
  const [blocks, site] = await Promise.all([db.contentBlock.findMany(), db.mediaAsset.findMany({ where: { ownerType: "SITE" }, orderBy: [{ slot: "asc" }, { sort: "asc" }] })]);
  return (
    <>
      <Top title="অন্যান্য কনটেন্ট" sub="হোমপেজের বাকি অংশ — JSON হিসেবে সম্পাদনা; সংরক্ষণের আগে কাঠামো যাচাই হয়">
        <form action={refreshCache}><button className={`${a.btn} ${a.ghost}`}>ক্যাশ রিফ্রেশ করুন</button></form>
      </Top>
      <Saved on={sp.saved} />
      {sp.error && <div className={a.warn}>“{sp.key}” সংরক্ষণ হয়নি: {sp.error === "json" ? "JSON সঠিক নয়" : "কাঠামো মেলেনি — আগের রূপ দেখে একই গঠন রাখুন"}।</div>}

      <div className={`${a.card} ${a.section}`}>
        <h2>সাইটের ছবি</h2>
        {SLOTS.map(([slot, label]) => (
          <div key={slot} className={a.section}>
            <b>{label}</b>
            <MediaGrid items={site.filter((m) => m.slot === slot)} back={`${ADMIN}/content`} canDelete={me.super} />
            <AdminUpload ownerType="SITE" slot={slot} back={`${ADMIN}/content`} label={`${label} — যোগ করুন`} />
          </div>
        ))}
        <details className={a.json}>
          <summary>১৫ আগস্ট ১৯৭৫ — স্মরণে: প্রতিকৃতি (slot v75-গ্রুপ-ক্রম, যেমন v75-0-4 = শেখ রাসেল)</summary>
          <MediaGrid items={site.filter((m) => m.slot?.startsWith("v75-"))} back={`${ADMIN}/content`} canDelete={me.super} />
          <V75Upload />
        </details>
      </div>

      {(Object.keys(BLOCKS) as BlockKey[]).map((k) => {
        const b = blocks.find((x) => x.key === k);
        return (
          <form key={k} id={`b-${k}`} action={saveBlock} className={`${a.card} ${a.form}`} style={{ marginTop: 18 }}>
            <input type="hidden" name="key" value={k} />
            <h2 style={{ fontSize: 18 }}>{BLOCKS[k].title} <span className={a.muted}>({k})</span></h2>
            <textarea className={`${a.textarea} ${a.mono}`} name="json" rows={12} defaultValue={JSON.stringify(b?.data ?? [], null, 1)} spellCheck={false} />
            <button className={a.btn}>সংরক্ষণ</button>
          </form>
        );
      })}
    </>
  );
}

function V75Upload() {
  return (
    <div className={a.section}>
      {[0, 1, 2].map((g) => (
        <details key={g}>
          <summary className={a.muted}>গ্রুপ {g}</summary>
          {Array.from({ length: g === 0 ? 10 : g === 1 ? 2 : 6 }, (_, k) => (
            <div key={k} style={{ marginTop: 8 }}>
              <b className={a.mono}>v75-{g}-{k}</b>
              <AdminUpload ownerType="SITE" slot={`v75-${g}-${k}`} back={`${ADMIN}/content`} label="প্রতিকৃতি যোগ" />
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
