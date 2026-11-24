import type { CSSProperties } from "react";

// 15 August 1975 memorial: bullet holes. Same seeded RNG as the prototype → identical shapes, SSR-safe.
// [left%, top%, size px, scroll threshold, drip length, drip width, drip offset]
export const HOLES: [number, number, number, number, number, number, number][] = [
  [18, 24, 110, 0.05, 260, 9, 0], [72, 17, 84, 0.12, 340, 7, 6], [45, 70, 130, 0.2, 200, 10, -8], [86, 56, 96, 0.28, 280, 8, 4],
  [9, 68, 78, 0.34, 190, 6, 0], [61, 36, 66, 0.4, 300, 6, -5], [31, 42, 90, 0.46, 230, 8, 7],
];

export function memorialHoles() {
  let sd = 7;
  const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const jag = (a: number, b: number, n: number) =>
    Array.from({ length: n }, (_, k) => {
      const t = (k / n) * 6.283, r = a + rnd() * (b - a);
      return (Math.cos(t) * r).toFixed(1) + "," + (Math.sin(t) * r).toFixed(1);
    }).join(" ");

  return HOLES.map((h, i) => {
    const cracks = Array.from({ length: 7 }, () => {
      const t = rnd() * 6.283, r = 30 + rnd() * 18, m = 14 + rnd() * 8, j = t + (rnd() - 0.5) * 0.5;
      return `M${(Math.cos(t) * 10).toFixed(1)},${(Math.sin(t) * 10).toFixed(1)}L${(Math.cos(j) * m).toFixed(1)},${(Math.sin(j) * m).toFixed(1)}L${(Math.cos(t) * r).toFixed(1)},${(Math.sin(t) * r).toFixed(1)}`;
    });
    const p1 = jag(17, 25, 14), p2 = jag(10, 15, 12), p3 = jag(6, 10, 10);
    const style = { left: `${h[0]}%`, top: `${h[1]}%`, "--s": `${h[2]}px`, "--l": `${h[4]}px`, "--w": `${h[5]}px`, "--o": `${h[6]}px` } as CSSProperties;
    return (
      <div key={i} className="hole" style={style} data-t={h[3]} aria-hidden="true">
        <svg viewBox="-50 -50 100 100">
          {cracks.map((d, k) => (
            <path key={k} d={d} fill="none" stroke="#5b5148" strokeWidth=".7" />
          ))}
          <polygon points={p1} fill="#d3c8b6" />
          <polygon points={p2} fill="#3a302b" />
          <polygon points={p3} fill="#0c0a0d" />
        </svg>
        <i className="stain" />
        <i className="drip" />
      </div>
    );
  });
}
