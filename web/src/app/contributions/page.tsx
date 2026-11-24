import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getLang } from "@/lib/i18n";
import { CONTRIBUTION_TYPES, SUBJECTS } from "@/lib/labels";
import { num } from "@/lib/bn";
import { pageNumber } from "@/lib/pagination";
import SiteHeader from "@/components/forms/SiteHeader";
import s from "@/components/forms/forms.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "প্রকাশিত অবদান",
  description: "সম্পাদকীয় যাচাইয়ের পর প্রকাশিত নাগরিকের অবদান — বঙ্গবন্ধু ও শেখ হাসিনা সম্পর্কিত তথ্য, ছবি ও দলিল।",
};

const SIZE = 24;

/**
 * Public archive of APPROVED contributions only.
 * Never shows contact details. Shows only images (EXIF-stripped) — video / PDF are not
 * published here because their metadata is not stripped.
 */
export default async function Contributions({ searchParams }: { searchParams: Promise<{ s?: string; page?: string }> }) {
  const lang = await getLang();
  const en = lang === "en";
  const sp = await searchParams;
  const subject = sp.s === "BB" || sp.s === "SH" ? sp.s : undefined;
  const page = pageNumber(sp.page);
  const where: Prisma.ContributionWhereInput = { status: "APPROVED", ...(subject ? { subject } : {}) };
  const [rows, total, bb, sh] = await Promise.all([
    db.contribution.findMany({ where, orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }], take: SIZE, skip: (page - 1) * SIZE }),
    db.contribution.count({ where }),
    db.contribution.count({ where: { status: "APPROVED", subject: "BB" } }),
    db.contribution.count({ where: { status: "APPROVED", subject: "SH" } }),
  ]);
  const media = await db.mediaAsset.findMany({
    where: { ownerType: "CONTRIBUTION", ownerId: { in: rows.map((r) => r.id) }, kind: "IMAGE", state: "READY", hidden: false },
    orderBy: { sort: "asc" },
    select: { id: true, ownerId: true },
  });
  const by = (r: (typeof rows)[number]) =>
    r.attribution === "ANON" || !r.name ? (en ? "Anonymous" : "বেনামে") : r.attribution === "ALIAS" ? `${r.name} (${en ? "pseudonym" : "ছদ্মনাম"})` : r.name;
  const chip = (on: boolean) => `${s.chip} ${s.pill} ${on ? s.on : ""}`;
  const last = Math.max(1, Math.ceil(total / SIZE));
  const href = (p: number) => `/contributions?${new URLSearchParams({ ...(subject ? { s: subject } : {}), page: String(p) })}`;

  return (
    <div className={s.page}>
      <SiteHeader lang={lang} right={<a href="/#contribute" className={s.darkBtn}>{en ? "Contribute" : "তথ্য দিন"}</a>} />
      <section className={`${s.hero} ${s.gut}`} style={{ paddingBottom: 40 }}>
        <div style={{ flex: "1 1 560px", maxWidth: 780 }}>
          <div className={s.eyebrow}>{en ? "Public contribution portal" : "নাগরিক অবদান পোর্টাল"}</div>
          <h1 className={s.h1}>{en ? "Published contributions" : "প্রকাশিত অবদান"}</h1>
          <p className={s.lead}>
            {en
              ? "Information, photographs and documents sent by citizens — published after editorial review, with their sources."
              : "নাগরিকদের পাঠানো তথ্য, ছবি ও দলিল — সম্পাদকীয় যাচাইয়ের পর, উৎসসহ প্রকাশিত।"}
          </p>
        </div>
        <div className={s.stats}>
          <div><b>{num(bb, lang)}</b><span>{SUBJECTS.label("BB", lang)}</span></div>
          <div><b>{num(sh, lang)}</b><span>{SUBJECTS.label("SH", lang)}</span></div>
        </div>
      </section>
      <section className={`${s.feed} ${s.gut}`}>
        <div className={s.filters}>
          <a href="/contributions" className={chip(!subject)} style={{ textDecoration: "none" }}>{en ? "All" : "সব"}<small>{num(bb + sh, lang)}</small></a>
          <a href="/contributions?s=BB" className={chip(subject === "BB")} style={{ textDecoration: "none" }}>{SUBJECTS.label("BB", lang)}<small>{num(bb, lang)}</small></a>
          <a href="/contributions?s=SH" className={chip(subject === "SH")} style={{ textDecoration: "none" }}>{SUBJECTS.label("SH", lang)}<small>{num(sh, lang)}</small></a>
        </div>
        {!rows.length && (
          <div className={s.empty}>
            <b>{en ? "Nothing published yet" : "এখনো কিছু প্রকাশিত হয়নি"}</b>
            <p>{en ? "Contributions appear here after editorial review." : "সম্পাদকীয় যাচাইয়ের পর অবদান এখানে দেখা যাবে।"}</p>
            <a href="/#contribute" className={s.btnDark}>{en ? "Contribute →" : "তথ্য দিন →"}</a>
          </div>
        )}
        <div className={s.grid}>
          {rows.map((r) => {
            const im = media.filter((m) => m.ownerId === r.id);
            return (
              <article key={r.id} className={s.post} style={{ cursor: "default" }}>
                {im[0] && (
                  <div className={s.postImg}>
                    <img src={`/api/media/${im[0].id}?v=thumb`} alt="" loading="lazy" decoding="async" />
                    {im.length > 1 && <span className={s.more}>+{num(im.length - 1, lang)}</span>}
                  </div>
                )}
                <div className={s.postBody}>
                  <div className={s.tags}>
                    <span className={s.tagOrg}>{SUBJECTS.label(r.subject, lang)}</span>
                    {r.types.map((t) => <span key={t} className={s.tag}>{CONTRIBUTION_TYPES.label(t, lang)}</span>)}
                  </div>
                  <h3>{r.title}</h3>
                  <p style={{ WebkitLineClamp: 6 }}>{r.description}</p>
                  {r.sourceUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow ugc" style={{ fontSize: 14, wordBreak: "break-all" }}>{u}</a>
                  ))}
                  <div className={s.postMeta}>
                    <b>{[num(r.year, lang), r.date, r.place].filter(Boolean).join(" · ")}</b>
                    <span>{by(r)} · {r.ref}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {last > 1 && (
          <div className={s.loadMore} style={{ gap: 10 }}>
            {page > 1 && <a className={s.btnLine} href={href(page - 1)}>← {en ? "Newer" : "আগের"}</a>}
            <span className={s.sub} style={{ alignSelf: "center" }}>{num(page, lang)} / {num(last, lang)}</span>
            {page < last && <a className={s.btnLine} href={href(page + 1)}>{en ? "Older" : "পরের"} →</a>}
          </div>
        )}
      </section>
    </div>
  );
}
