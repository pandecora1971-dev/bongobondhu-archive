"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import s from "@/components/forms/forms.module.css";
import { hard as H } from "@/i18n/forms";
import { ACTIVITY_TYPES, LEVELS, ORGS } from "@/lib/labels";
import { DIVISIONS, divisionLabel, districtLabel } from "@/lib/geo";
import { fmtDate, num } from "@/lib/bn";
import type { FeedQuery, PostCard } from "@/lib/posts";

type Stats = { total: number; places: number; orgs: { org: string; n: number }[]; districts: { division: string | null; district: string; n: number }[] };

export default function Feed({ lang, query, initial, stats }: { lang: "bn" | "en"; query: FeedQuery; initial: { posts: PostCard[]; next: string | null }; stats: Stats }) {
  const en = lang === "en";
  const t = (k: keyof typeof H) => H[k][en ? 1 : 0];
  const n = (x: number | string) => num(x, lang);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [posts, setPosts] = useState(initial.posts);
  const [next, setNext] = useState(initial.next);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<PostCard | null>(null);
  const [cur, setCur] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosts(initial.posts);
    setNext(initial.next);
  }, [initial]);

  const nav = (patch: Partial<FeedQuery>) => {
    const q = { ...query, ...patch, cursor: undefined };
    if (patch.division !== undefined) q.district = undefined;
    const sp = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
    start(() => router.push(`/dusshomoy${sp.size ? "?" + sp : ""}#feed`, { scroll: false }));
  };

  const more = async () => {
    if (!next || loading) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams(Object.entries({ ...query, cursor: next }).filter(([, v]) => v) as [string, string][]);
      const r = await fetch(`/api/posts?${sp}`);
      if (r.ok) {
        const j = (await r.json()) as { posts: PostCard[]; next: string | null };
        setPosts((p) => [...p, ...j.posts.filter((x) => !p.some((y) => y.id === x.id))]);
        setNext(j.next);
      }
    } finally {
      setLoading(false);
    }
  };

  // infinite scroll (the button stays as a keyboard / no-IO fallback)
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const io = new IntersectionObserver((es) => es[0].isIntersecting && more(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, query]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setCur((c) => Math.min(open.images.length - 1, c + 1));
      if (e.key === "ArrowLeft") setCur((c) => Math.max(0, c - 1));
    };
    addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [open]);

  const place = (p: PostCard) => [p.thana, districtLabel(p.district, lang)].filter(Boolean).join(", ");
  const chip = (on: boolean) => `${s.chip} ${s.pill} ${on ? s.on : ""}`;
  const dists = stats.districts.filter((d) => !query.division || d.division === query.division);
  const filtered = !!(query.org || query.division || query.district || query.q);

  return (
    <section className={`${s.feed} ${s.gut}`} id="feed" style={{ scrollMarginTop: 80 }}>
      <div className={s.filters} aria-busy={pending}>
        <button type="button" className={chip(!query.org)} onClick={() => nav({ org: undefined })}>
          {t("all")}<small>{n(stats.total)}</small>
        </button>
        {stats.orgs.map((o) => (
          <button key={o.org} type="button" className={chip(query.org === o.org)} aria-pressed={query.org === o.org} onClick={() => nav({ org: o.org })}>
            {ORGS.label(o.org as never, lang)}<small>{n(o.n)}</small>
          </button>
        ))}
        <span className={s.spacer} />
        <select className={s.select} aria-label={t("allDiv")} value={query.division ?? ""} onChange={(e) => nav({ division: e.target.value || undefined })}>
          <option value="">{t("allDiv")}</option>
          {DIVISIONS.map((d) => <option key={d.code} value={d.code}>{en ? d.en : d.bn}</option>)}
        </select>
        <select className={s.select} aria-label={t("allDist")} value={query.district ?? ""} onChange={(e) => nav({ district: e.target.value || undefined })}>
          <option value="">{t("allDist")}</option>
          {[...new Set(dists.map((d) => d.district))].sort((a, b) => a.localeCompare(b, "bn")).map((d) => (
            <option key={d} value={d}>{districtLabel(d, lang)}</option>
          ))}
        </select>
      </div>

      {posts.length === 0 && (
        <div className={s.empty}>
          <b>{filtered ? t("emptyF") : t("emptyH")}</b>
          <p>{t("emptyP")}</p>
          <a href="#post" className={s.btnDark}>{t("emptyBtn")}</a>
        </div>
      )}

      <div className={s.grid} style={{ opacity: pending ? 0.5 : 1, transition: "opacity .2s" }}>
        {posts.map((p) => (
          <article key={p.id}>
            <a
              href={`/dusshomoy/${p.id}`}
              className={s.post}
              style={{ height: "100%" }}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                setCur(0);
                setOpen(p);
              }}
            >
              {p.images.length > 0 && (
                <div className={s.postImg}>
                  <img src={p.images[0].thumb} alt="" loading="lazy" decoding="async" />
                  {p.images.length > 1 && <span className={s.more}>+{n(p.images.length - 1)}</span>}
                </div>
              )}
              <div className={s.postBody}>
                <div className={s.tags}>
                  <span className={s.tagOrg}>{ORGS.label(p.org as never, lang)}</span>
                  <span className={s.tag}>{ACTIVITY_TYPES.label(p.activityType as never, lang)}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <div className={s.postMeta}>
                  <b>{place(p)}</b>
                  <span>{fmtDate(p.date, lang)}</span>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>
      <div ref={sentinel} />
      {next && (
        <div className={s.loadMore}>
          <button type="button" className={s.btnLine} onClick={more} disabled={loading}>{loading ? t("loading") : t("loadMore")}</button>
        </div>
      )}

      {open && (
        <div className={s.scrim} onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-labelledby="dk-t">
          <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
            {open.images.length > 0 && (
              <div className={s.gallery}>
                <img src={open.images[cur].full} alt="" />
              </div>
            )}
            {open.images.length > 1 && (
              <div className={s.thumbs}>
                {open.images.map((im, i) => (
                  <button key={im.id} type="button" className={i === cur ? s.on : ""} aria-label={`${n(i + 1)}`} onClick={() => setCur(i)}>
                    <img src={im.thumb} alt="" />
                  </button>
                ))}
              </div>
            )}
            <div className={s.sheetBody}>
              <div className={s.tags}>
                <span className={s.tagOrg}>{ORGS.label(open.org as never, lang)}</span>
                <span className={s.tag}>{ACTIVITY_TYPES.label(open.activityType as never, lang)}</span>
                <span className={s.tag}>{open.level ? LEVELS.label(open.level as never, lang) : t("noLevel")}</span>
              </div>
              <h2 id="dk-t">{open.title}</h2>
              <div className={s.meta}>
                {[open.place, place(open), divisionLabel(open.division, lang), fmtDate(open.date, lang), open.participants ? t("about").replace("{n}", n(open.participants)) : ""].filter(Boolean).join(" · ")}
              </div>
              {open.description && <p className={s.desc}>{open.description}</p>}
              {open.links.length > 0 && (
                <div className={s.links}>
                  {open.links.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow ugc">{l}</a>)}
                </div>
              )}
              <div className={s.by}>{open.by ? t("by") + open.by : t("byAnon")}</div>
              <div className={s.btns}>
                <button type="button" className={s.btnLine} onClick={() => setOpen(null)} autoFocus>{t("close")}</button>
                <a href={`/dusshomoy/${open.id}`} className={s.btnDark}>{t("open")}</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
