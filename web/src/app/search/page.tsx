import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getHome } from "@/lib/content";
import { getLang, picker } from "@/lib/i18n";
import { rateLimit } from "@/lib/ratelimit";
import { ORGS } from "@/lib/labels";
import { num } from "@/lib/bn";
import SiteHeader from "@/components/forms/SiteHeader";
import s from "@/components/forms/forms.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "খুঁজুন", robots: { index: false } };

type Hit = { kind: string; title: string; sub: string; href: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const lang = await getLang();
  const en = lang === "en";
  const p = picker(lang);
  const q = String((await searchParams).q ?? "").trim().slice(0, 100);
  const hits: Hit[] = [];

  if (q.length >= 2 && (await rateLimit("feed")).ok) {
    const has = (...xs: (string | null | undefined)[]) => xs.some((x) => x?.toLowerCase().includes(q.toLowerCase()));
    const H = await getHome();
    H.chapters.forEach((c) => {
      if (has(c.titleBn, c.titleEn, c.yearBn, c.yearEn, c.descBn, c.descEn)) hits.push({ kind: en ? "History" : "ইতিহাস", title: p(c.titleBn, c.titleEn), sub: p(c.yearBn, c.yearEn), href: "/#history" });
      c.events.forEach((e) => has(e.dateBn, e.dateEn, e.textBn, e.textEn) && hits.push({ kind: en ? "Event" : "ঘটনা", title: p(e.textBn, e.textEn), sub: p(e.dateBn, e.dateEn), href: "/#history" }));
    });
    H.milestones.forEach((m) => has(m.titleBn, m.titleEn, m.placeBn, m.placeEn, m.descBn) && hits.push({ kind: en ? "Development" : "উন্নয়ন", title: p(m.titleBn, m.titleEn), sub: p(m.placeBn, m.placeEn), href: "/#dev" }));
    H.projects.forEach((x) => has(x.titleBn, x.titleEn) && hits.push({ kind: en ? "60 projects" : "৬০ প্রকল্প", title: p(x.titleBn, x.titleEn), sub: num(x.order + 1, lang), href: "/#p60" }));
    H.index.forEach((c) => c.items.forEach((it) => has(it[0], it[1], it[3]) && hits.push({ kind: p(c.bn, c.en), title: p(it[0], it[1]), sub: it[3], href: "/#tabs" })));
    const posts = await db.activityPost.findMany({
      where: { status: "APPROVED", OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { district: { contains: q, mode: "insensitive" } }, { thana: { contains: q, mode: "insensitive" } }] },
      orderBy: { publishedAt: "desc" },
      take: 30,
    });
    const contribs = await db.contribution.findMany({
      where: { status: "APPROVED", OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { place: { contains: q, mode: "insensitive" } }] },
      orderBy: { reviewedAt: "desc" },
      take: 30,
      select: { title: true, year: true, place: true, subject: true },
    });
    contribs.forEach((x) => hits.push({ kind: en ? "Contribution" : "নাগরিক অবদান", title: x.title, sub: [num(x.year, lang), x.place].filter(Boolean).join(" · "), href: `/contributions?s=${x.subject}` }));
    posts.forEach((x) => hits.push({ kind: en ? "Hard times" : "দুঃসময়ের গল্প", title: x.title, sub: `${ORGS.label(x.org, lang)} · ${x.thana}, ${x.district}`, href: `/dusshomoy/${x.id}` }));
  }

  return (
    <div className={s.page}>
      <SiteHeader lang={lang} />
      <section className={`${s.hero} ${s.gut}`} style={{ paddingBottom: 24 }}>
        <form action="/search" style={{ flex: "1 1 520px", maxWidth: 760, display: "flex", gap: 12, alignItems: "flex-end" }} role="search">
          <label className={s.field}>
            <span className={s.lbl}>{en ? "Search the archive" : "আর্কাইভে খুঁজুন"}</span>
            <input className={s.input} type="search" name="q" defaultValue={q} placeholder={en ? "Name, year, district or topic" : "নাম, সাল, জেলা বা বিষয়"} autoFocus />
          </label>
          <button className={s.btnDark}>{en ? "Search" : "খুঁজুন"}</button>
        </form>
      </section>
      <main className={s.gut} style={{ paddingBottom: 90 }}>
        {q && <p className={s.sub} style={{ marginBottom: 16 }}>{en ? `${hits.length} results` : `${num(hits.length, lang)}টি ফলাফল`}</p>}
        <ol style={{ listStyle: "none", padding: 0, maxWidth: 900 }}>
          {hits.slice(0, 200).map((h, i) => (
            <li key={i} style={{ borderTop: "1px solid #ddd7cb" }}>
              <a href={h.href} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, padding: "14px 0", textDecoration: "none" }}>
                <span className={s.tag} style={{ alignSelf: "start", justifySelf: "start" }}>{h.kind}</span>
                <span>
                  <b style={{ display: "block", fontWeight: 600 }}>{h.title}</b>
                  <small style={{ color: "#5f5b52" }}>{h.sub}</small>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
