import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { getLang, translator } from "@/lib/i18n";
import { hard } from "@/i18n/forms";
import { ACTIVITY_TYPES, LEVELS, ORGS } from "@/lib/labels";
import { divisionLabel, districtLabel } from "@/lib/geo";
import { fmtDate, num } from "@/lib/bn";
import { toCard } from "@/lib/posts";
import SiteHeader from "@/components/forms/SiteHeader";
import Gallery from "@/components/dusshomoy/Gallery";
import s from "@/components/forms/forms.module.css";

export const dynamic = "force-dynamic";

const load = cache(async (id: string) => {
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return null;
  const p = await db.activityPost.findFirst({ where: { id, status: "APPROVED" } });
  if (!p) return null;
  const media = await db.mediaAsset.findMany({ where: { ownerType: "POST", ownerId: p.id, state: "READY", hidden: false }, orderBy: { sort: "asc" }, select: { id: true, width: true, height: true } });
  return { card: toCard(p, media), media };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = await load(id);
  if (!d) return { title: "দুঃসময়ের গল্প" };
  const desc = [ORGS.label(d.card.org as never), d.card.thana, d.card.district, d.card.description.slice(0, 160)].filter(Boolean).join(" · ");
  const img = d.media[0];
  return {
    title: d.card.title,
    description: desc,
    alternates: { canonical: `/dusshomoy/${d.card.id}` },
    openGraph: {
      type: "article",
      title: d.card.title,
      description: desc,
      url: `/dusshomoy/${d.card.id}`,
      images: img ? [{ url: `/api/media/${img.id}`, width: img.width ?? undefined, height: img.height ?? undefined }] : ["/og-default.png"],
    },
    twitter: { card: "summary_large_image", title: d.card.title, description: desc },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, lang] = await Promise.all([load(id), getLang()]);
  if (!d) notFound();
  const p = d.card;
  const t = translator(hard, lang);
  const place = [p.thana, districtLabel(p.district, lang)].filter(Boolean).join(", ");
  return (
    <div className={`${s.page} ${s.green}`}>
      <SiteHeader lang={lang} right={<a href="/dusshomoy" className={s.darkBtn}>{t("title")}</a>} />
      <main className={s.gut} style={{ padding: "48px 0 90px" }}>
        <article className={s.sheet} style={{ margin: "0 auto", animation: "none" }}>
          {p.images.length > 0 && <Gallery images={p.images} />}
          <div className={s.sheetBody}>
            <div className={s.tags}>
              <span className={s.tagOrg}>{ORGS.label(p.org as never, lang)}</span>
              <span className={s.tag}>{ACTIVITY_TYPES.label(p.activityType as never, lang)}</span>
              <span className={s.tag}>{p.level ? LEVELS.label(p.level as never, lang) : t("noLevel")}</span>
            </div>
            <h1 className={s.h2} style={{ fontSize: "clamp(28px,3.4vw,42px)" }}>{p.title}</h1>
            <div className={s.meta}>
              {[p.place, place, divisionLabel(p.division, lang), fmtDate(p.date, lang), p.participants ? t("about").replace("{n}", num(p.participants, lang)) : ""].filter(Boolean).join(" · ")}
            </div>
            {p.description && <p className={s.desc}>{p.description}</p>}
            {p.links.length > 0 && (
              <div className={s.links}>
                {p.links.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow ugc">{l}</a>)}
              </div>
            )}
            <div className={s.by}>{p.by ? t("by") + p.by : t("byAnon")}</div>
            <div className={s.btns}>
              <a href="/dusshomoy" className={s.btnLine}>← {t("title")}</a>
              <a href="/dusshomoy#post" className={s.btnDark}>{t("submitTop")}</a>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
