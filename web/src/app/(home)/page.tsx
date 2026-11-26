import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { getHome } from "@/lib/content";
import { getLang, picker, translator } from "@/lib/i18n";
import { home } from "@/i18n/home";
import { bnd, end, pad2 } from "@/lib/bn";
import { PROJECT_STATUS } from "@/lib/labels";
import Pic from "@/components/ui/Pic";
import Placeholder from "@/components/ui/Placeholder";
import Nav from "@/components/home/Nav";
import Chooser from "@/components/home/Chooser";
import GiveModal from "@/components/home/GiveModal";
import GiveQuick from "@/components/home/GiveQuick";
import P60Grid from "@/components/home/P60Grid";
import IndexTabs from "@/components/home/IndexTabs";
import Atlas from "@/components/home/Atlas";
import HomeEngine from "@/components/home/HomeEngine";
import { memorialHoles } from "@/components/home/holes";
import { FOCUS } from "../../../prisma/portraits";
import "@/styles/home.css";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // image processing in the submit action // per-request CSP nonce + language cookie; data itself is cached (getHome)

const HUE = ["var(--violet)", "var(--teal)", "var(--blue)", "var(--coral)", "var(--pink)", "var(--amber)"];
const SC: Record<string, string> = { D: "var(--teal)", P: "var(--amber)", O: "var(--violet)", L: "var(--blue)", A: "var(--coral)" };
const css = (o: Record<string, string | number>) => o as CSSProperties;
const color = (c: string) => (c.startsWith("var(") || c.startsWith("oklch") || c.startsWith("#") ? c : `var(--${c})`);

export default async function HomePage() {
  const [H, lang] = await Promise.all([getHome(), getLang()]);
  const t = translator(home, lang);
  const p = picker(lang);
  const en = lang === "en";
  const n = (s: string | number) => (en ? end(s) : bnd(s));

  if (H.heroImages[0]) preload(H.heroImages[0].src, { as: "image", fetchPriority: "high" });

  const allIdx = H.index.flatMap((c) => c.items).filter((x) => x[2] !== "A");
  const cnt = (k: string) => allIdx.filter((x) => x[2] === k).length;
  const roadItems = H.milestones.filter((m) => m.roadOrder != null).sort((a, b) => a.roadOrder! - b.roadOrder!);
  const places = [
    ...H.stops.map((s) => ({ k: "h" as const, ll: [s.lng, s.lat] as [number, number], y: [s.yBn, s.yEn] as [string, string], b: s.titleBn, e: s.titleEn, db: s.descBn, de: s.descEn })),
    ...H.milestones
      .filter((m) => m.lng != null && m.lat != null)
      .map((m) => ({ k: "d" as const, ll: [m.lng!, m.lat!] as [number, number], y: [m.whenBn, m.whenEn] as [string, string], b: m.titleBn, e: m.titleEn, db: m.descBn, de: m.descEn })),
  ];
  const mqPill = (c: readonly [string, string], i: number) => (
    <span key={i} style={css({ "--c": HUE[i % 6] })}>
      {p(c[0], c[1])}
    </span>
  );
  const give2 = [...H.give.slice(6), ...H.give, ...H.give.slice(0, 6)];

  return (
    <>
      <noscript>
        <style>{`.rv,.fx{opacity:1!important;transform:none!important;clip-path:none!important}#pre{display:none}nav{transform:translate(-50%,0)!important}`}</style>
      </noscript>
      <a className="skip" href="#history">
        {en ? "Skip to content" : "মূল অংশে যান"}
      </a>
      <div id="pre" aria-hidden="true">
        {["violet", "pink", "coral", "amber", "teal"].map((c, k) => (
          <i key={c} style={css({ "--k": k, background: `var(--${c})` })} />
        ))}
        <div className="pc">
          <b>{t("brand")}</b>
          <span id="prn">{n(0)}</span>
        </div>
      </div>
      <div id="bar" />
      <Nav lang={lang} />
      <Chooser lang={lang} />

      <div id="top">
        <header className="hero">
          <div className="hero-bg">
            <div className="hero-par" id="hpar">
              {H.heroImages.map((o, i) => (
                <div key={o.id} className={`slide${i ? "" : " on"}`} role="img" aria-label={o.alt} style={{ backgroundImage: `url('${o.src}')` }} />
              ))}
            </div>
            <div id="hvid" aria-hidden="true" />
          </div>
          <div className="hero-c" id="hc">
            <div className="eyebrow fx" style={css({ "--y": "-60px", "--d": ".5s" })}>
              <b />
              <span>{t("eyebrow")}</span>
            </div>
            <h1>
              <span className="fx" style={css({ "--x": "-22vw", "--d": ".25s" })}>
                {t("h1a")}
              </span>
              <br />
              <span className="fx o" style={css({ "--y": "120px", "--d": ".5s" })}>
                {t("h1o")}
              </span>
              <span className="fx" style={css({ "--x": "24vw", "--d": ".38s" })}>
                {t("h1b")}
              </span>
            </h1>
            <div className="hero-row">
              <div>
                <p className="lead fx" style={css({ "--y": "70px", "--d": ".65s" })}>
                  {t("lead")}
                </p>
                <div className="cta fx" style={css({ "--y": "90px", "--d": ".8s" })}>
                  <a className="btn light glow mag" href="#history">
                    <span>{t("explore")}</span>
                    <span className="ar">→</span>
                  </a>
                  <a className="btn line mag" href="#contribute" data-choose="">
                    <span>{t("contribute")}</span>
                    <span className="ar">→</span>
                  </a>
                </div>
              </div>
              <div className="hero-side fx" style={css({ "--x": "120px", "--d": ".9s" })}>
                <div className="yrs">
                  <div>
                    {n("১৯৪৮–১৯৭৫")}
                    <small>{t("bbArchive")}</small>
                  </div>
                  <div>
                    <span>{n("১৯৯৬–২০০১")}</span>
                    <span>{n("২০০৯–২০২৪")}</span>
                    <small>{t("devArchive")}</small>
                  </div>
                </div>
                <div className="caps" id="caps" aria-live="off">
                  {H.slides.map((s, i) => (
                    <span key={i} className={i ? "" : "on"}>
                      {p(s[0], s[1])}
                    </span>
                  ))}
                </div>
                <div className="dots" id="dots" aria-hidden="true">
                  {H.slides.map((_, i) => (
                    <i key={i} className={i ? "" : "on"} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="cover">
          <div className="wrap">
            <div className="sh shrow">
              <div className="rv">
                <div className="no">{t("domNo")}</div>
                <h2>{t("domH")}</h2>
              </div>
              <form className="search rv r" action="/search" role="search">
                <input type="search" name="q" placeholder={t("searchPh")} aria-label={t("search")} />
                <button className="btn sm">
                  <span>{t("search")}</span>
                  <span className="ar">→</span>
                </button>
              </form>
            </div>
            <div className="doms" id="doms">
              {H.domains.map((d, i) => {
                const o = H.domainImages.find((x) => x.sort === i);
                return (
                  <a key={i} className="dom rv s" href={d.href} style={css({ "--c": [HUE[3], HUE[1], HUE[0], HUE[2]][i] ?? HUE[0], "--d": `${i * 0.12}s` })}>
                    {o && <Pic img={o} sizes="(max-width:980px) 50vw, 25vw" />}
                    <div className="n">{n(pad2(i + 1))}</div>
                    <h3>{p(d.titleBn, d.titleEn)}</h3>
                    <p>{p(d.descBn, d.descEn)}</p>
                    <span className="go" aria-hidden="true">
                      →
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <main>
        <section id="history">
          <div className="wrap">
            <div className="sh rv" style={css({ "--c": "var(--coral)" })}>
              <div className="no">{t("histNo")}</div>
              <h2>{t("histH")}</h2>
              <p>{t("histP")}</p>
            </div>
          </div>
          <div id="chaps">
            {H.chapters.map((c, i) => (
              <section key={c.id} className="chap" style={css({ "--c": HUE[i % 6], "--n": c.events.length })}>
                <div className="chap-in">
                  <div className="ghost">{n(i + 1)}</div>
                  <div className="chap-l">
                    <div className="chap-no">
                      <span>{en ? `Chapter ${pad2(i + 1)} / ${pad2(H.chapters.length)}` : `অধ্যায় ${bnd(pad2(i + 1))} / ${bnd(pad2(H.chapters.length))}`}</span>
                      <i>
                        <b />
                      </i>
                    </div>
                    <div className="chap-year">{p(c.yearBn, c.yearEn)}</div>
                    <h3>{p(c.titleBn, c.titleEn)}</h3>
                    <p>{p(c.descBn, c.descEn)}</p>
                    <div className="ev-win">
                      <ol className="ev-list">
                        {c.events.map((v) => (
                          <li key={v.id}>
                            <b>{p(v.dateBn, v.dateEn)}</b>
                            <span>{p(v.textBn, v.textEn)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  <div className="wheel-box">
                    <div className="wheel">
                      {c.images.map((o, k) => (
                        <figure key={o.id} style={css({ "--k": k })}>
                          <Pic img={o} sizes="(max-width:860px) 170px, 330px" />
                          <figcaption>{o.credit}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div id="m75">
            <div className="m-st" id="mst">
              {memorialHoles()}
              <div className="m-date">
                <b>{t("m75Date")}</b>
                <span>{t("m75Place")}</span>
              </div>
              <div className="m-dark" id="mdark" />
              <div className="m-say" id="msay">
                <h3>{t("m75H")}</h3>
                <p>{t("m75P")}</p>
              </div>
            </div>
          </div>
          <div id="v75">
            <div className="wrap" id="v75w">
              <div className="sh rv" style={css({ "--c": "oklch(0.62 0.2 27)", paddingTop: "60px" })}>
                <div className="no" style={{ color: "oklch(0.75 0.16 27)" }}>
                  {t("v75No")}
                </div>
                <h2>{t("v75H")}</h2>
              </div>
              {H.v75.map((g, gi) => (
                <div key={gi}>
                  <h4 className="rv">{p(g.h[0], g.h[1])}</h4>
                  <div className="vg">
                    {g.p.map((x, k) => {
                      const ph = H.v75Photos[`v75-${gi}-${k}`];
                      return (
                        <div key={k} className={`vc rv s${x[4] ? " kid" : ""}`} style={css({ "--d": `${(k % 6) * 0.1}s` })}>
                          <div className="vp" style={{ borderRadius: "50%", overflow: "hidden" }}>
                            {ph ? <Pic img={ph} sizes="150px" pos={FOCUS[`v75-${gi}-${k}`]} /> : <Placeholder label={t("photo")} round />}
                          </div>
                          <b>{p(x[0], x[1])}</b>
                          <small>{p(x[2], x[3])}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="v-note">{t("v75Note")}</p>
            </div>
          </div>
        </section>

        <section className="give" id="give-bb">
          <div className="wrap give-in">
            <div className="give-l rv">
              <div className="no">{t("giveBBno")}</div>
              <h2>
                {t("giveBBh1")}
                <em>{t("giveBBem")}</em>
                {t("giveBBh2")}
              </h2>
              <p>{t("giveBBp")}</p>
              <GiveSteps t={t} n={n} />
            </div>
            <GiveQuick k="bb" lang={lang} min={1920} max={1975} start={1971} />
          </div>
        </section>

        <section id="dev">
          <div className="wrap">
            <div className="sh rv" style={css({ "--c": "var(--teal)" })}>
              <div className="no">{t("devNo")}</div>
              <h2>{t("devH")}</h2>
              <p>{t("devP")}</p>
            </div>
          </div>

          <div id="road">
            <svg id="rsvg" aria-hidden="true">
              <path className="rbase" />
              <path className="rlive" />
              <circle className="rmark" r="9" />
            </svg>
            {roadItems.map((m, i) => (
              <article key={m.id} className={`rd${i % 2 ? " odd" : ""}`} style={css({ "--c": SC[m.status] })}>
                <div className="rd-ph">
                  <div className="rd-par">
                    {m.images.map((o, k) => (
                      <Pic key={o.id} img={o} className={k ? "" : "show"} sizes="(max-width:860px) 100vw, 52vw" />
                    ))}
                  </div>
                </div>
                <i className="rd-dot" />
                <div className="rd-tx">
                  <div className="rd-yr">{m.roadYearBn ? n(m.roadYearBn) : t("ongoing")}</div>
                  <span className="tag">{PROJECT_STATUS.label(m.status, lang)}</span>
                  <h3>{p(m.titleBn, m.titleEn)}</h3>
                  <div className="meta">
                    <span>{p(m.placeBn, m.placeEn)}</span>
                    <span>{p(m.whenBn, m.whenEn)}</span>
                  </div>
                  <p>{p(m.descBn, m.descEn)}</p>
                  <small className="rd-cr">{m.images[0]?.credit ?? ""}</small>
                </div>
              </article>
            ))}
          </div>

          <div id="reel">
            {H.films.map((f, i) => {
              const hv = !!(f.youtubeId || f.videoUrl);
              return (
                <section
                  key={f.id}
                  className={`film${hv ? " has-yt" : ""}`}
                  style={css({ "--c": color(f.color) })}
                  data-yt={f.youtubeId ?? undefined}
                  data-v={f.videoUrl ?? undefined}
                >
                  <div className="film-st">
                    <div className="film-fr">
                      <div className="film-md">
                        {f.images.length ? (
                          f.images.map((o, k) => <Pic key={o.id} img={o} className={k ? "" : "show"} sizes="100vw" />)
                        ) : (
                          <Placeholder label={`${p(f.titleBn, f.titleEn)} — ${t("photo")}`} />
                        )}
                        {hv && (
                          <div className="yt">
                            <div />
                          </div>
                        )}
                      </div>
                      <div className="film-n">{n(pad2(i + 1))}</div>
                      <div className="film-tx">
                        <span className="k">{t("filmK")}</span>
                        <h3>{p(f.titleBn, f.titleEn)}</h3>
                        <span className="tag">{p(f.subBn, f.subEn)}</span>
                        <p>{p(f.descBn, f.descEn)}</p>
                      </div>
                      <small className="film-cr">{f.images[0]?.credit ?? ""}</small>
                      {hv && (
                        <div className="vcx">
                          <button type="button" data-a="back" aria-label={en ? "Back 10 seconds" : "১০ সেকেন্ড পেছনে"}>
                            {n("−১০")}
                          </button>
                          <button type="button" data-a="play" className="pb" aria-label={en ? "Play / pause" : "চালু / বিরতি"} />
                          <button type="button" data-a="fwd" aria-label={en ? "Forward 10 seconds" : "১০ সেকেন্ড সামনে"}>
                            {n("+১০")}
                          </button>
                          <div className="vc-bar" role="slider" aria-label={en ? "Seek" : "সময়"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} tabIndex={0}>
                            <i />
                          </div>
                          <span className="vc-t">{n("০:০০")}</span>
                          <button type="button" data-a="snd" className="snd off" />
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section id="p60">
            <div className="wrap">
              <div className="sh p6-head">
                <div className="rv">
                  <div className="no">{t("p6No")}</div>
                  <h2>{t("p6H")}</h2>
                  <p>{t("p6P")}</p>
                </div>
              </div>
              <P60Grid
                lang={lang}
                showAll={t("p6All")}
                photoLabel={t("photo")}
                items={H.projects.map((x) => ({
                  id: x.id,
                  title: p(x.titleBn, x.titleEn),
                  photos: x.photos.map((o) => ({ src: o.src, local: o.local, alt: o.alt, caption: o.caption, credit: o.credit, sourceUrl: o.sourceUrl })),
                }))}
              />
            </div>
          </section>

          <div id="pm">
            <div className="wrap">
              <div className="sh rv">
                <div className="no">{t("pmNo")}</div>
                <h2>{t("pmH")}</h2>
                <p>{t("pmP")}</p>
              </div>
              <div className="pm-top">
                <div className="pm-ph rv l">{H.pmPortrait ? <Pic img={H.pmPortrait} sizes="(max-width:860px) 100vw, 40vw" /> : <Placeholder label={t("pmPortrait")} />}</div>
                <div className="terms" id="terms">
                  {H.terms.map((x, i) => (
                    <div key={i} className="term rv r" style={css({ "--c": color(x[5]), "--w": `${(x[4] / 18) * 100}%`, "--d": `${i * 0.08}s` })}>
                      <b>{p(x[0], x[1])}</b>
                      <span>{p(x[2], x[3])}</span>
                      <i />
                    </div>
                  ))}
                </div>
              </div>
              <h3 className="pm-h rv">{t("bySector")}</h3>
              <div className="sect" id="sect">
                {H.index.map((c, i) => (
                  <a key={i} className="rv s" href="#tabs" data-cat={i} style={css({ "--c": HUE[i % 6], "--d": `${i * 0.06}s` })}>
                    <b data-count={c.items.length}>{n(0)}</b>
                    <h4>{p(c.bn, c.en)}</h4>
                    <small>{t("initiatives")}</small>
                  </a>
                ))}
              </div>
              <h3 className="pm-h rv">{t("keyYears")}</h3>
            </div>
            <div className="ypin" id="ypin">
              <div className="yline" id="yline">
                <div className="ytrack" id="ytrack">
                  {H.years.map((y, i) => (
                    <div key={i} className="ycard" style={css({ "--c": HUE[i % 6] })}>
                      <b>{n(y[0])}</b>
                      <h4>{p(y[1], y[2])}</h4>
                      <p>{p(y[3], y[4])}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <section className="give sh2" id="give-sh">
            <div className="wrap give-in">
              <div className="give-l rv">
                <div className="no">{t("giveSHno")}</div>
                <h2>
                  {t("giveSHh1")}
                  <em>{t("giveBBem")}</em>
                  {t("giveSHh2")}
                </h2>
                <p>{t("giveSHp")}</p>
                <GiveSteps t={t} n={n} />
              </div>
              <GiveQuick k="sh" lang={lang} min={1947} max={new Date().getFullYear()} start={2009} />
            </div>
          </section>

          <div className="wrap" style={{ background: "var(--bg)", position: "relative", zIndex: 2 }}>
            <div className="sh rv" style={css({ "--c": "var(--blue)" })}>
              <div className="no">{t("idxNo")}</div>
              <h2>{t("idxH")}</h2>
            </div>
            <div className="stats" id="stats">
              {(
                [
                  [allIdx.length, t("stIndexed"), "var(--blue)"],
                  [cnt("D"), t("stDone"), "var(--teal)"],
                  [cnt("P"), t("stPartial"), "var(--amber)"],
                  [cnt("O"), t("stOngoing"), "var(--violet)"],
                ] as const
              ).map((s, i) => (
                <div key={i} className="rv" style={css({ "--c": s[2], "--d": `${i * 0.08}s` })}>
                  <b data-count={s[0]}>{n(0)}</b>
                  <span>{s[1]}</span>
                </div>
              ))}
            </div>
            <IndexTabs lang={lang} cats={H.index} note={t("idxNote")} />
          </div>
        </section>

        <section id="a24">
          <div className="wrap">
            <div className="sh rv">
              <div className="no">{t("a24No")}</div>
              <h2>{t("a24H")}</h2>
            </div>
            <div className="a24">
              <div className="a24-l">
                <div className="brk" id="brk">
                  <span>{t("a24Brk")}</span>
                  <span aria-hidden="true">{t("a24Brk")}</span>
                </div>
                <p className="rv">{t("a24P")}</p>
              </div>
              <ol id="a24l">
                {H.a24.map((x, i) => (
                  <li key={i} className="rv r" style={css({ "--d": `${i * 0.04}s` })}>
                    <b>{p(x[0], x[1])}</b>
                    <span>{p(x[2], x[3])}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="atlas">
          <div className="wrap">
            <div className="sh rv" style={css({ "--c": "var(--blue)" })}>
              <div className="no">{t("atNo")}</div>
              <h2>{t("atH")}</h2>
              <p>{t("atP")}</p>
            </div>
            <Atlas
              lang={lang}
              places={places}
              labels={H.mapLabels}
              text={{
                note: t("atNote"), hist: t("atHist"), dev: t("atDev"), pick: t("atPick"), whole: t("atWhole"), fail: t("atFail"),
                bay: t("atBay"), india: t("atIndia"), myanmar: t("atMyanmar"),
              }}
            />
          </div>
        </section>

        <section id="incident">
          <div className="wrap">
            <div className="sh rv">
              <div className="no">{t("incNo")}</div>
              <h2>{t("incH")}</h2>
            </div>
            <div className="inc">
              <div className="inc-l rv l">
                <h3>{t("incH3")}</h3>
                <p>{t("incP")}</p>
                <div className="cta">
                  <a className="btn glow mag" href="/report">
                    <span>{t("incSubmit")}</span>
                    <span className="ar">→</span>
                  </a>
                  <a className="btn line mag" href="/report/status" style={{ color: "var(--ink)" }}>
                    <span>{t("incStatus")}</span>
                    <span className="ar">→</span>
                  </a>
                </div>
                <div className="sos">{t("incSos")}</div>
              </div>
              <ol className="steps" id="steps">
                {H.steps.map((s, i) => (
                  <li key={i} className="rv" style={css({ "--d": `${i * 0.05}s` })}>
                    <b>{n(i + 1)}</b>
                    <div>
                      <h4>{p(s[0], s[1])}</h4>
                      <p>{p(s[2], s[3])}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="guar">
              <div className="rv">
                <h4>{t("g1h")}</h4>
                <p>{t("g1p")}</p>
              </div>
              <div className="rv" style={css({ "--d": ".12s" })}>
                <h4>{t("g2h")}</h4>
                <p>{t("g2p")}</p>
              </div>
              <div className="rv" style={css({ "--d": ".24s" })}>
                <h4>{t("g3h")}</h4>
                <p>{t("g3p")}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="contribute">
          <div className="wrap">
            <div className="sh rv" style={css({ "--c": "var(--pink)" })}>
              <div className="no">{t("conNo")}</div>
              <h2>{t("conH")}</h2>
            </div>
          </div>
          <div style={{ overflow: "hidden" }} aria-hidden="true">
            <div className="mq" id="mq1">
              {[...H.give, ...H.give].map(mqPill)}
            </div>
            <div className="mq" id="mq2">
              {give2.map((c, i) => mqPill(c, i + 3))}
            </div>
          </div>
          <div className="wrap">
            <div className="cbox rv s">
              <div>
                <h3>{t("cboxH")}</h3>
                <p>{t("cboxP")}</p>
                <a className="btn light glow mag" href="#contribute" data-choose="">
                  <span>{t("cboxBtn")}</span>
                  <span className="ar">→</span>
                </a>
              </div>
              <div className="stat">
                <div className="rv r">
                  <i />
                  <span>{t("stat1")}</span>
                </div>
                <div className="rv r" style={css({ "--d": ".1s" })}>
                  <i />
                  <span>{t("stat2")}</span>
                </div>
                <div className="rv r" style={css({ "--d": ".2s" })}>
                  <i />
                  <span>{t("stat3")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="f-top">
            <h3 className="rv">{t("fTop")}</h3>
            <div className="cta rv r">
              <a className="btn light glow mag" href="#contribute" data-choose="">
                <span>{t("contribute")}</span>
                <span className="ar">→</span>
              </a>
            </div>
          </div>
          <div className="f-cols">
            <div>
              <a className="logo" href="#top">
                <i />
                <span>{t("brand")}</span>
              </a>
              <p>{t("fAbout")}</p>
            </div>
            <div>
              <h5>{t("fArchive")}</h5>
              <ul>
                <li><a href="#history">{t("fBBh")}</a></li>
                <li><a href="#dev">{t("fDev")}</a></li>
                <li><a href="#pm">{t("fPM")}</a></li>
                <li><a href="#atlas">{t("fAtlas")}</a></li>
              </ul>
            </div>
            <div>
              <h5>{t("fPart")}</h5>
              <ul>
                <li><a href="#contribute" data-choose="">{t("fContrib")}</a></li>
                <li><a href="/contributions">{t("fPublished")}</a></li>
                <li><a href="/report">{t("fReport")}</a></li>
                <li><a href="/report/status">{t("fStatus")}</a></li>
                <li><a href="/dusshomoy">{t("fHard")}</a></li>
              </ul>
            </div>
            <div>
              <h5>{t("fPolicies")}</h5>
              <ul>
                <li><a href="/privacy">{t("fPrivacy")}</a></li>
                <li><a href="/editorial">{t("fEditorial")}</a></li>
                <li><a href="/about">{en ? "About the archive" : "আর্কাইভ পরিচিতি"}</a></li>
                <li><a href="/terms">{en ? "Terms of use" : "ব্যবহারের শর্ত"}</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="f-big rv" id="fbig" aria-hidden="true">
          {t("brand")}
        </div>
        <div className="wrap">
          <div className="f-bot">
            <span>{t("fCredits")}</span>
            <a href="#top">
              <span>{t("backTop")}</span> ↑
            </a>
          </div>
        </div>
      </footer>

      <GiveModal lang={lang} />
      <HomeEngine lang={lang} />
    </>
  );
}

function GiveSteps({ t, n }: { t: (k: keyof typeof home) => string; n: (s: string | number) => string }) {
  return (
    <ul>
      {(["gl1", "gl2", "gl3", "gl4"] as const).map((k, i) => (
        <li key={k}>
          <b>{n(pad2(i + 1))}</b>
          <span>{t(k)}</span>
        </li>
      ))}
    </ul>
  );
}
