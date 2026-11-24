"use client";
import { useEffect, useRef, useState } from "react";

type Place = { k: "h" | "d"; ll: [number, number]; y: [string, string]; b: string; e: string; db: string; de: string };
type Labels = { divs: Record<string, [string, string]>; dist: Record<string, string> };
type Text = Record<"note" | "hist" | "dev" | "pick" | "whole" | "fail" | "bay" | "india" | "myanmar", string>;

const W = 600, H = 720, S = 2.6;
const TINT = ["oklch(0.9 0.05 195)", "oklch(0.91 0.05 295)", "oklch(0.92 0.06 85)", "oklch(0.91 0.05 355)", "oklch(0.91 0.05 250)", "oklch(0.92 0.06 150)", "oklch(0.91 0.06 35)", "oklch(0.92 0.05 110)"];
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Bangladesh atlas — GeoJSON + d3-geo are loaded only when the section approaches the viewport. */
export default function Atlas({ places, labels, lang, text }: { places: Place[]; labels: Labels; lang: "bn" | "en"; text: Text }) {
  const en = lang === "en";
  const [cur, setCur] = useState(-1);
  const [state, setState] = useState<"idle" | "ready" | "fail">("idle");
  const [svg, setSvg] = useState("");
  const geo = useRef<{ xy: [number, number][]; d: number[] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const win = useRef<HTMLDivElement>(null);

  // lazy build
  useEffect(() => {
    const el = win.current;
    if (!el) return;
    let done = false;
    const build = async () => {
      if (done) return;
      done = true;
      try {
        const [d3, a1, a2, nb] = await Promise.all([
          import("d3-geo"),
          fetch("/map/bd-adm1.json").then((r) => r.json()),
          fetch("/map/bd-adm2.json").then((r) => r.json()),
          fetch("/map/neighbors.json").then((r) => r.json()).catch(() => ({ features: [] })),
        ]);
        type F = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, { n: string }>;
        const rew = (fc: { features: F[] }) => {
          fc.features.forEach((f) =>
            (f.geometry.coordinates as GeoJSON.Position[][][]).forEach((p) => {
              if (d3.geoArea({ type: "Polygon", coordinates: p as unknown as GeoJSON.Position[][] }) > 2 * Math.PI) (p as unknown as GeoJSON.Position[][]).forEach((r) => r.reverse());
            }),
          );
          return fc;
        };
        rew(a1);
        rew(a2);
        const proj = d3.geoMercator().fitExtent([[26, 26], [W - 26, H - 26]], a1);
        const path = d3.geoPath(proj);
        if ("digits" in path) (path as unknown as { digits: (n: number) => void }).digits(1);
        const F1 = a1.features as F[], F2 = a2.features as F[];
        const dv = F2.map((f) => {
          const c = d3.geoCentroid(f);
          return Math.max(0, F1.findIndex((v) => d3.geoContains(v, c)));
        });
        const dIdx = (ll: [number, number]) => {
          let k = F2.findIndex((f) => d3.geoContains(f, ll));
          if (k < 0) {
            let m = 1e9;
            F2.forEach((f, j) => {
              const d = d3.geoDistance(d3.geoCentroid(f), ll);
              if (d < m) { m = d; k = j; }
            });
          }
          return k;
        };
        const G: [string, [number, number]][] = [["bay", [90.7, 21.2]], ["india", [87.7, 24.5]], ["india", [91.65, 23.75]], ["india", [90.6, 25.75]], ["myanmar", [92.8, 21.0]]];
        const xy = places.map((p) => proj(p.ll) as [number, number]);
        const html =
          '<g id="az"><g class="nb">' +
          (nb.features as F[]).map((f) => `<path d="${path(f)}"/>`).join("") +
          "</g>" +
          F2.map((f, i) => `<path class="dp" style="--t:${TINT[dv[i]]}" d="${path(f)}"/>`).join("") +
          F1.map((f) => `<path class="dv" d="${path(f)}"/>`).join("") +
          '<g class="geo">' + G.map(([k, ll]) => { const q = proj(ll)!; return `<text x="${q[0]}" y="${q[1]}" data-g="${k}"></text>`; }).join("") + "</g>" +
          '<g class="dl">' + F2.map((f) => { const c = path.centroid(f); return `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" data-n="${esc(f.properties.n)}"></text>`; }).join("") + "</g>" +
          '<g class="vl">' + F1.map((f) => { const c = path.centroid(f); return `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" data-v="${esc(f.properties.n)}"></text>`; }).join("") + "</g>" +
          xy.map((q, i) => `<g class="pp ${places[i].k}" data-i="${i}" role="button" tabindex="-1" aria-label="${esc(places[i].b)}"><g transform="translate(${q[0].toFixed(1)},${q[1].toFixed(1)})"><circle class="ring" r="5"/><circle r="5"/></g></g>`).join("") +
          "</g>";
        geo.current = { xy, d: places.map((p) => dIdx(p.ll)) };
        setSvg(html);
        setState("ready");
      } catch {
        setState("fail");
      }
    };
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (io.disconnect(), build()), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [places]);

  // labels follow the language (set as text so they never contain markup)
  useEffect(() => {
    const s = svgRef.current;
    if (!s || state !== "ready") return;
    s.querySelectorAll<SVGTextElement>("[data-g]").forEach((t) => (t.textContent = text[t.dataset.g as keyof Text]));
    s.querySelectorAll<SVGTextElement>("[data-n]").forEach((t) => (t.textContent = en ? t.dataset.n! : labels.dist[t.dataset.n!] || t.dataset.n!));
    s.querySelectorAll<SVGTextElement>("[data-v]").forEach((t) => {
      const v = labels.divs[t.dataset.v!] || [t.dataset.v!, t.dataset.v!];
      t.textContent = en ? v[1] : v[0];
    });
  }, [state, en, labels, text, svg]);

  // selection → fly
  useEffect(() => {
    const s = svgRef.current, g = geo.current;
    if (!s || !g || state !== "ready") return;
    const z = s.querySelector<SVGGElement>("#az");
    const q = cur >= 0 ? g.xy[cur] : null;
    if (z) z.style.transform = q ? `translate(${W / 2 - q[0] * S}px,${H / 2 - q[1] * S}px) scale(${S})` : "none";
    s.classList.toggle("zoomed", !!q);
    s.querySelectorAll(".dp").forEach((d, k) => d.classList.toggle("hot", !!q && k === g.d[cur]));
    s.querySelectorAll(".pp").forEach((d, k) => d.classList.toggle("cur", k === cur));
  }, [cur, state, svg]);

  const pick = (i: number) => setCur((c) => (c === i ? -1 : i));
  const P = cur >= 0 ? places[cur] : null;

  return (
    <div className="atl">
      <div className="mapwin rv drop" ref={win}>
        <div className="mapnote">{text.note}</div>
        {state === "fail" ? (
          <p style={{ padding: "60px 20px", color: "var(--mute)" }}>{text.fail}</p>
        ) : (
          <svg
            id="asvg"
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={en ? "Bangladesh map" : "বাংলাদেশের মানচিত্র"}
            onClick={(e) => {
              const g = (e.target as Element).closest(".pp") as SVGGElement | null;
              if (g) setCur(+g.dataset.i!);
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        <div className="attr">geoBoundaries · Natural Earth</div>
      </div>
      <div className="rv r">
        <h4>{text.hist}</h4>
        <div className="pl" id="plh">
          {places.map((p, i) => p.k === "h" && (
            <button key={i} type="button" className={i === cur ? "on" : ""} aria-pressed={i === cur} onClick={() => pick(i)}>
              {en ? p.e : p.b}
            </button>
          ))}
        </div>
        <h4>{text.dev}</h4>
        <div className="pl" id="pld">
          {places.map((p, i) => p.k === "d" && (
            <button key={i} type="button" className={i === cur ? "on" : ""} aria-pressed={i === cur} onClick={() => pick(i)}>
              {en ? p.e : p.b}
            </button>
          ))}
        </div>
        <div className="adet" id="adet" aria-live="polite" style={{ "--c": P && P.k === "d" ? "var(--violet)" : "var(--coral)" } as React.CSSProperties}>
          {P ? (
            <>
              <span className="tag">{en ? P.y[1] : P.y[0]}</span>
              <h3>{en ? P.e : P.b}</h3>
              <p>{en ? P.de : P.db}</p>
              <button className="btn sm" type="button" onClick={() => setCur(-1)}>
                <span>{text.whole}</span>
                <span className="ar">→</span>
              </button>
            </>
          ) : (
            <p>{text.pick}</p>
          )}
        </div>
      </div>
    </div>
  );
}
