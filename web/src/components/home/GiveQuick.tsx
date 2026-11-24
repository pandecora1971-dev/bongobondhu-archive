"use client";
import { useRef, useState } from "react";
import { CONTRIBUTION_TYPES } from "@/lib/labels";
import { home } from "@/i18n/home";
import { openGive } from "./bus";

/** "এখান থেকে শুরু করুন" — year stepper + type chips, then opens the full form pre-filled. */
export default function GiveQuick({ k, lang, min, max, start }: { k: "bb" | "sh"; lang: "bn" | "en"; min: number; max: number; start: number }) {
  const t = (x: keyof typeof home) => home[x][lang === "en" ? 1 : 0];
  const [year, setYear] = useState(String(start));
  const [sel, setSel] = useState<string[]>([]);
  const btn = useRef<HTMLButtonElement>(null);
  const step = (d: number) => setYear(String(Math.min(max, Math.max(min, (+year || min) + d))));
  const tog = (c: string) => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  return (
    <div className="qs rv r" data-k={k}>
      <h4>{t("qsH")}</h4>
      <div>
        <span className="lab" id={`qy-${k}`}>{t("qsYear")}</span>
        <div className="yr">
          <button type="button" aria-label="−" onClick={() => step(-1)}>−</button>
          <input type="number" inputMode="numeric" min={min} max={max} value={year} aria-labelledby={`qy-${k}`} onChange={(e) => setYear(e.target.value)} />
          <button type="button" aria-label="+" onClick={() => step(1)}>+</button>
        </div>
      </div>
      <div>
        <span className="lab">{t("qsWhat")}</span>
        <div className="chips">
          {CONTRIBUTION_TYPES.list.map(([c, bn, en]) => (
            <button key={c} type="button" className={sel.includes(c) ? "on" : ""} aria-pressed={sel.includes(c)} onClick={() => tog(c)}>
              <span>{lang === "en" ? en : bn}</span>
            </button>
          ))}
        </div>
      </div>
      <button ref={btn} type="button" className="btn" onClick={() => openGive(k, btn.current, { y: year, t: sel })}>
        <span>{t("next")}</span>
        <span className="ar">→</span>
      </button>
    </div>
  );
}
