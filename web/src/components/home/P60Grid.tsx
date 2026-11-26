"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Pic from "@/components/ui/Pic";
import Placeholder from "@/components/ui/Placeholder";
import { bnd, pad2 } from "@/lib/bn";

type Photo = { src: string; thumb?: string; w?: number | null; h?: number | null; local: boolean; alt: string; caption: string; credit: string; sourceUrl: string };
type Item = { id: string; title: string; photos: Photo[] };

/** 60-project index: 4 cols desktop / 2 mobile, first 12 shown, hover cycles photos (1.4s). */
export default function P60Grid({ items, lang, showAll, photoLabel }: { items: Item[]; lang: "bn" | "en"; showAll: string; photoLabel: string }) {
  const [all, setAll] = useState(false);
  const n = (s: string | number) => (lang === "en" ? String(s) : bnd(s));
  return (
    <>
      <div className="p6g" id="p6g">
        {items.map((p, i) => (
          <Card key={p.id} p={p} i={i} hid={!all && i >= 12} n={n} photoLabel={photoLabel} />
        ))}
      </div>
      {!all && items.length > 12 && (
        <div className="p6more">
          <button className="btn line" id="p6btn" type="button" onClick={() => {
            setAll(true);
            requestAnimationFrame(() => window.dispatchEvent(new Event("home:relayout")));
          }}>
            <span>{showAll}</span>
            <span className="ar">↓</span>
          </button>
        </div>
      )}
    </>
  );
}

function Card({ p, i, hid, n, photoLabel }: { p: Item; i: number; hid: boolean; n: (s: string | number) => string; photoLabel: string }) {
  const [k, setK] = useState(0);
  const [warm, setWarm] = useState(false); // other photos are mounted only once the card is hovered
  const [alive, setAlive] = useState(() => p.photos.map(() => true));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const live = p.photos.map((x, j) => ({ x, j })).filter((o) => alive[o.j]);
  const cur = live.length ? live[k % live.length] : null;
  const step = () => setK((v) => v + 1);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <article
      className="p6c rv"
      data-hid={hid ? "" : undefined}
      style={{ "--d": `${(i % 4) * 0.08}s`, ...(hid ? { display: "none" } : {}) } as CSSProperties}
      onMouseEnter={() => {
        setWarm(true);
        if (live.length < 2) return;
        step();
        timer.current = setInterval(step, 1400);
      }}
      onMouseLeave={() => timer.current && clearInterval(timer.current)}
    >
      <div className="p6f">
        {live.length ? (
          <>
            {p.photos.map((o, j) =>
              alive[j] && !hid && (warm || cur?.j === j) ? (
                <Pic
                  key={j}
                  img={o}
                  className={cur?.j === j ? "show" : ""}
                  sizes="(max-width:860px) 50vw, 25vw"
                  onDead={() => setAlive((a) => a.map((v, q) => (q === j ? false : v)))}
                />
              ) : null,
            )}
            {live.length > 1 && <span className="p6k">{n((k % live.length) + 1)}/{n(live.length)}</span>}
          </>
        ) : (
          <Placeholder label={`${p.title} — ${photoLabel}`} />
        )}
      </div>
      <div className="no6">
        <span>{n(pad2(i + 1))}</span>
      </div>
      <h3>{p.title}</h3>
      <p>{cur?.x.caption ?? ""}</p>
      {cur?.x.sourceUrl && (
        <a className="src" href={cur.x.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
          {cur.x.credit}
        </a>
      )}
    </article>
  );
}

