"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { PROJECT_STATUS } from "@/lib/labels";
import { bnd, end, pad2 } from "@/lib/bn";

const SC: Record<string, string> = { D: "var(--teal)", P: "var(--amber)", O: "var(--violet)", L: "var(--blue)", A: "var(--coral)" };
type Cat = { bn: string; en: string; items: [string, string, "D" | "P" | "O" | "L" | "A", string][] };

/** Full index: sector tabs + directory. The PM "work by sector" cards (a[data-cat]) also switch tabs. */
export default function IndexTabs({ cats, lang, note }: { cats: Cat[]; lang: "bn" | "en"; note: string }) {
  const [cur, setCur] = useState(0);
  const en = lang === "en";

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[data-cat]") as HTMLElement | null;
      if (a) setCur(+a.dataset.cat!);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const c = cats[cur];
  return (
    <>
      <div className="tabs" id="tabs" role="tablist">
        {cats.map((x, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === cur} className={i === cur ? "on" : ""} onClick={() => setCur(i)}>
            {en ? x.en : x.bn}
          </button>
        ))}
      </div>
      <p className="note">{note}</p>
      <div className="dir" id="dir" role="tabpanel" key={`${cur}-${lang}`}>
        {c?.items.map((x, k) => (
          <div key={k} style={{ "--k": k, "--c": SC[x[2]] } as CSSProperties}>
            <small>{en ? pad2(k + 1) : bnd(pad2(k + 1))}</small>
            <span>
              {en ? x[1] : x[0]}
              {x[3] && <em>{en ? end(x[3]) : x[3]}</em>}
            </span>
            <span className="tag">{PROJECT_STATUS.label(x[2], lang)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
