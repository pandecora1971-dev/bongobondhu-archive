import type { Metadata } from "next";
import { getLang, translator } from "@/lib/i18n";
import { hard } from "@/i18n/forms";
import { num } from "@/lib/bn";
import { feedQuery, getFeed, getFeedStats } from "@/lib/posts";
import SiteHeader from "@/components/forms/SiteHeader";
import Feed from "@/components/dusshomoy/Feed";
import PostForm from "@/components/dusshomoy/PostForm";
import s from "@/components/forms/forms.module.css";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // image processing in the submit action
export const metadata: Metadata = {
  title: "দুঃসময়ের গল্প",
  description: "আওয়ামী লীগ ও সহযোগী সংগঠনের কার্যক্রম — মিটিং, মিছিল, মানববন্ধন, ত্রাণ ও প্রচারণা।",
};

export default async function HardTimesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = feedQuery.parse(Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const [lang, stats, first] = await Promise.all([getLang(), getFeedStats(), getFeed({ ...q, cursor: undefined })]);
  const t = translator(hard, lang);
  return (
    <div className={`${s.page} ${s.green}`}>
      <SiteHeader lang={lang} right={<a href="#post" className={s.darkBtn}>{t("submitTop")}</a>} />
      <section className={`${s.hero} ${s.gut}`} style={{ paddingBottom: 48 }}>
        <div style={{ flex: "1 1 560px", maxWidth: 780 }}>
          <div className={s.eyebrow}>{t("eyebrow")}</div>
          <h1 className={`${s.h1} ${s.h1big}`}>
            {t("h1a")}
            <em>{t("h1em")}</em>
          </h1>
          <p className={s.lead} style={{ marginTop: 20, maxWidth: 640 }}>{t("lead")}</p>
        </div>
        <div className={s.stats}>
          <div><b>{num(stats.total, lang)}</b><span>{t("published")}</span></div>
          <div><b>{num(stats.places, lang)}</b><span>{t("thanas")}</span></div>
        </div>
      </section>
      <Feed lang={lang} query={q} initial={first} stats={stats} />
      <PostForm lang={lang} />
    </div>
  );
}
