"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { bnd } from "@/lib/bn";
import { HOLES } from "./holes";

/**
 * The homepage motion engine — a faithful port of the inline <script> in Homepage v2.html.
 * It drives the server-rendered markup by class names (no React state), so the layout is
 * identical to the prototype. Everything is torn down on unmount.
 */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const ICO = {
  play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  mute: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>',
  snd: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
};
const HERO_CLIPS = ["9gyFK7cQGu0", "EqLHavO0HpQ"];

export default function HomeEngine({ lang }: { lang: "bn" | "en" }) {
  const L = useRef(lang);
  L.current = lang;
  const api = useRef<{ onLang?: () => void }>({});

  useEffect(() => {
    api.current.onLang?.();
  }, [lang]);

  useEffect(() => {
    const apiRef = api.current;
    const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
    const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
    const clamp = (v: number, a = 0, b = 1) => (Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : a);
    const ss = (t: number) => t * t * (3 - 2 * t);
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const num = (n: number | string) => (L.current === "en" ? String(n) : bnd(n));
    const body = document.body;

    const timers: ReturnType<typeof setInterval>[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const offs: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions | boolean) => {
      addEventListener(t, f as EventListener, o);
      offs.push(() => removeEventListener(t, f as EventListener, o));
    };
    const every = (f: () => void, ms: number) => timers.push(setInterval(f, ms));
    const later = (f: () => void, ms: number) => timeouts.push(setTimeout(f, ms));
    let dead = false;

    body.classList.add("lock");

    // ───────── layout cache ─────────
    let raf = 0, LV = 0;
    const LC = new WeakMap<Element, { v: number; t: number; h: number; x: any }>();
    const R = (el: Element) => {
      let c = LC.get(el);
      if (!c || c.v !== LV) {
        const b = el.getBoundingClientRect();
        c = { v: LV, t: b.top + scrollY, h: b.height, x: {} };
        LC.set(el, c);
      }
      const top = c.t - scrollY;
      return { top, bottom: top + c.h, height: c.h, x: c.x };
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const relayout = () => {
      LV++;
      req();
    };

    // ───────── chapters ─────────
    const STEP = () => (innerWidth < 860 ? 30 : 42);
    const chaps = $$(".chap").map((el) => ({
      el, a: -1, lis: $$("li", el), list: $(".ev-list", el)!, wheel: $(".wheel", el)!, figs: $$("figure", el), bar: $(".chap-no b", el)!, ghost: $(".ghost", el)!,
    }));

    // ───────── road ─────────
    const road = $("#road")!;
    const rd = {
      base: $<SVGPathElement>(".rbase")!, live: $<SVGPathElement>(".rlive")!, mark: $<SVGCircleElement>(".rmark")!,
      total: 0, pts: [] as number[][], ys: [] as number[],
      items: $$(".rd").map((el) => ({ el, dot: $(".rd-dot", el)!, par: $(".rd-par", el)!, i: 0 })),
    };
    function buildRoad() {
      if (!road) return;
      const Rr = road.getBoundingClientRect(), h = road.offsetHeight;
      if (!h || !rd.items.length) return;
      const pts = rd.items.map((it) => {
        const r = it.dot.getBoundingClientRect();
        return [r.left + r.width / 2 - Rr.left, r.top + r.height / 2 - Rr.top];
      });
      const all = [[pts[0][0], 0], ...pts, [pts[pts.length - 1][0], h]];
      let d = "M" + all[0];
      for (let i = 1; i < all.length; i++) {
        const a = all[i - 1], b = all[i], dy = (b[1] - a[1]) * 0.55;
        d += `C${a[0]},${a[1] + dy} ${b[0]},${b[1] - dy} ${b[0]},${b[1]}`;
      }
      rd.base.setAttribute("d", d);
      rd.live.setAttribute("d", d);
      rd.total = rd.base.getTotalLength();
      rd.live.style.strokeDasharray = String(rd.total);
      rd.live.style.strokeDashoffset = String(rd.total);
      rd.pts = pts;
      const K = 600;
      rd.ys = Array.from({ length: K + 1 }, (_, k) => rd.base.getPointAtLength((rd.total * k) / K).y);
    }
    const cycle = (box: Element, credit?: Element | null) => {
      const g = $$("img", box);
      if (g.length < 2) return;
      const i = (g.findIndex((e) => e.classList.contains("show")) + 1) % g.length;
      g.forEach((e, k) => e.classList.toggle("show", k === i));
      if (credit) credit.textContent = (g[i] as HTMLElement).dataset.cr || "";
    };
    every(() => rd.items.forEach((it) => it.el.classList.contains("act") && cycle(it.par, $(".rd-cr", it.el))), 3400);

    // ───────── films ─────────
    let SND = false, ytReady = false;
    const ytQ: (() => void)[] = [];
    const ytLoad = () => {
      if (window.YT?.Player) {
        ytReady = true;
        return;
      }
      if (document.getElementById("yt-api")) return;
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        ytReady = true;
        ytQ.splice(0).forEach((fn) => fn());
      };
      const s = document.createElement("script");
      s.id = "yt-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    };
    type Pl = { play: () => void; pause: () => void; seek: (s: number) => void; cur: () => number; dur: () => number; mute: (m: boolean) => void; playing: () => boolean; destroy?: () => void };
    const films = $$(".film").map((el, ix) => ({
      el, ix, fr: $(".film-fr", el)!, md: $(".film-md", el)!, tx: $(".film-tx", el)!, n: $(".film-n", el)!,
      bar: $(".vc-bar i", el), t: $(".vc-t", el), pb: $(".pb", el), yt: el.dataset.yt, v: el.dataset.v,
      pl: null as Pl | null, m: true, up: false, drag: false, cp: "", made: false,
    }));
    const fmt = (s: number) => {
      s = Math.max(0, Math.floor(s || 0));
      return num(Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"));
    };
    function updSnd() {
      $$(".vcx .snd").forEach((b) => {
        b.classList.toggle("off", !SND);
        const en = L.current === "en";
        b.innerHTML = (SND ? ICO.snd : ICO.mute) + "<span>" + (SND ? (en ? "Sound on" : "শব্দ চালু") : en ? "Tap for sound" : "শব্দ শুনুন") + "</span>";
        b.setAttribute("aria-label", SND ? (en ? "Mute" : "শব্দ বন্ধ") : en ? "Turn sound on" : "শব্দ চালু করুন");
      });
    }
    $$(".vcx .pb").forEach((b) => (b.innerHTML = ICO.pause));
    updSnd();
    function mkPlayer(f: (typeof films)[number]) {
      if (f.made) return;
      f.made = true;
      const box = $(".yt", f.md);
      if (!box) return;
      if (f.v) {
        const v = document.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto"; v.src = f.v;
        v.setAttribute("playsinline", "");
        box.innerHTML = "";
        box.appendChild(v);
        v.addEventListener("playing", () => f.el.classList.add("vplay"));
        v.addEventListener("error", () => f.el.classList.add("verr"));
        f.pl = { play: () => void v.play().catch(() => {}), pause: () => v.pause(), seek: (s) => (v.currentTime = clamp(s, 0, v.duration || 1e5)), cur: () => v.currentTime || 0, dur: () => v.duration || 0, mute: (m) => (v.muted = m), playing: () => !v.paused, destroy: () => { v.pause(); v.removeAttribute("src"); v.load(); } };
        return;
      }
      const go = () => {
        if (dead) return;
        const p = new window.YT.Player(box.firstElementChild, {
          videoId: f.yt, host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 0, mute: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, showinfo: 0, playsinline: 1, iv_load_policy: 3, fs: 0, cc_load_policy: 0, loop: 1, playlist: f.yt, origin: location.origin },
          events: {
            onReady: () => {
              p.mute();
              f.m = true;
              f.pl = { play: () => p.playVideo(), pause: () => p.pauseVideo(), seek: (s) => p.seekTo(clamp(s, 0, p.getDuration() || 1e5), true), cur: () => p.getCurrentTime() || 0, dur: () => p.getDuration() || 0, mute: (m) => (m ? p.mute() : (p.unMute(), p.setVolume(100))), playing: () => [1, 3].includes(p.getPlayerState()), destroy: () => p.destroy() };
            },
            onStateChange: (e: any) => {
              if (e.data === 1) f.el.classList.add("vplay");
              if (e.data === 0) { p.seekTo(0, true); p.playVideo(); }
            },
            onError: () => f.el.classList.add("verr"),
          },
        });
        f.pl = f.pl ?? ({ destroy: () => p.destroy?.() } as unknown as Pl);
      };
      if (ytReady) go();
      else { ytQ.push(go); ytLoad(); }
    }
    films.forEach((f) => {
      const vc = $(".vcx", f.el);
      if (!vc) return;
      const click = (e: Event) => {
        const b = (e.target as Element).closest("button") as HTMLElement | null, p = f.pl;
        if (!b || !p || !p.play) return;
        const a = b.dataset.a;
        if (a === "play") { f.up = !f.up; if (f.up) p.pause(); else p.play(); if (f.pb) f.pb.innerHTML = f.up ? ICO.play : ICO.pause; }
        if (a === "back") p.seek(p.cur() - 10);
        if (a === "fwd") p.seek(p.cur() + 10);
        if (a === "snd") { SND = !SND; p.mute(!SND); f.m = !SND; if (SND) { f.up = false; p.play(); } updSnd(); }
      };
      vc.addEventListener("click", click);
      offs.push(() => vc.removeEventListener("click", click));
      const bar = $(".vc-bar", f.el)!;
      const sk = (e: PointerEvent) => {
        const p = f.pl;
        if (!p || !p.seek) return;
        const r = bar.getBoundingClientRect(), k = clamp((e.clientX - r.left) / r.width);
        p.seek(k * p.dur());
        if (f.bar) f.bar.style.width = k * 100 + "%";
      };
      bar.onpointerdown = (e) => { bar.setPointerCapture(e.pointerId); f.drag = true; sk(e); };
      bar.onpointermove = (e) => f.drag && sk(e);
      bar.onpointerup = bar.onpointercancel = () => (f.drag = false);
      bar.onkeydown = (e) => { const p = f.pl; if (!p?.seek) return; if (e.key === "ArrowRight") p.seek(p.cur() + 5); if (e.key === "ArrowLeft") p.seek(p.cur() - 5); };
    });
    every(() => {
      const vh = innerHeight;
      let act: (typeof films)[number] | null = null;
      films.forEach((f) => {
        const r = f.el.getBoundingClientRect();
        if ((f.yt || f.v) && r.top < vh * 2.2 && r.bottom > -vh) mkPlayer(f);
        if (r.top < vh * 0.5 && r.bottom > vh * 0.5) act = f;
      });
      films.forEach((f) => {
        const isOn = f === act;
        f.el.classList.toggle("vlive", isOn);
        const p = f.pl;
        if (!p || !p.play) return;
        if (isOn && !f.up && !document.hidden) { if (!p.playing()) p.play(); }
        else if (p.playing() && (!isOn || document.hidden)) p.pause();
        const m = !(isOn && SND);
        if (f.m !== m) { p.mute(m); f.m = m; }
        if (isOn && !f.drag && f.bar && f.t) {
          const d = p.dur(), c = p.cur();
          f.bar.style.width = (d ? (c / d) * 100 : 0) + "%";
          f.t.textContent = fmt(c) + " / " + fmt(d);
          f.bar.parentElement?.setAttribute("aria-valuenow", String(Math.round(d ? (c / d) * 100 : 0)));
        }
      });
    }, 250);
    every(() => films.forEach((f) => {
      const r = f.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      cycle(f.md, $(".film-cr", f.el));
    }), 4200);

    // ───────── memorial ─────────
    const m75 = { el: $("#m75"), holes: $$(".hole").map((el, i) => ({ el, t: HOLES[i]?.[3] ?? 0, drip: $(".drip", el)!, stain: $(".stain", el)! })) };

    // ───────── scroll engine ─────────
    let SH = 0, SHv = -1;
    const bar = $("#bar"), nav = $("#nav"), hpar = $("#hpar"), hc = $("#hc");
    function tick() {
      raf = 0;
      const vh = innerHeight, sy = scrollY;
      if (SHv !== LV) { SH = document.documentElement.scrollHeight; SHv = LV; }
      if (bar) bar.style.transform = `scaleX(${clamp(sy / (SH - vh))})`;
      nav?.classList.toggle("sc", sy > vh * 0.85);
      const hp0 = clamp(sy / vh);
      if (hp0 < 1 && !reduce && hpar && hc) {
        hpar.style.transform = `translate3d(0,${hp0 * 10}%,0) scale(${1 + hp0 * 0.12})`;
        hc.style.opacity = String(1 - hp0 * 1.5);
        hc.style.transform = `translate3d(0,${-hp0 * 90}px,0)`;
      }
      chaps.forEach((c) => {
        const r = R(c.el);
        if (r.bottom < 0 || r.top > vh) return;
        if (!r.x.lt) r.x.lt = c.lis.map((l) => l.offsetTop);
        const p = clamp(-r.top / (r.height - vh)), n = c.lis.length, a = Math.round(p * (n - 1));
        if (a !== c.a) {
          c.a = a;
          c.lis.forEach((l, k) => l.classList.toggle("on", k === a));
          c.list.style.transform = `translateY(${6 - (r.x.lt[a] ?? 0)}px)`;
        }
        const m = c.figs.length, f = p * (m - 1);
        c.wheel.style.transform = `rotate(${-f * STEP()}deg)`;
        const ai = Math.round(f);
        c.figs.forEach((g, k) => g.classList.toggle("on", k === ai));
        c.bar.style.transform = `scaleX(${p})`;
        if (!reduce) c.ghost.style.transform = `translate3d(0,${(0.5 - p) * 160}px,0)`;
      });
      if (!rd.total) buildRoad();
      if (rd.total) {
        const RR = R(road);
        if (RR.bottom > 0 && RR.top < vh) {
          const y = vh * 0.6 - RR.top;
          let k = 0;
          const Y = rd.ys;
          while (k < Y.length - 1 && Y[k] < y) k++;
          const len = (rd.total * k) / (Y.length - 1);
          rd.live.style.strokeDashoffset = String(rd.total - len);
          const pt = rd.base.getPointAtLength(len);
          rd.mark.setAttribute("cx", String(pt.x));
          rd.mark.setAttribute("cy", String(pt.y));
          rd.items.forEach((it, i) => {
            it.el.classList.toggle("act", rd.pts[i][1] <= y + vh * 0.14);
            const r = R(it.el);
            if (r.bottom > 0 && r.top < vh && !reduce) {
              const c = (r.top + r.height / 2 - vh / 2) / vh;
              it.par.style.transform = `translate3d(0,${c * -80}px,0) scale(${1.06 + Math.abs(c) * 0.16})`;
            }
          });
        }
      }
      films.forEach((f) => {
        const r = R(f.el);
        if (r.bottom < 0 || r.top > vh) return;
        const m = innerWidth < 860, p0 = reduce ? 1 : ss(clamp((vh - r.top) / vh)), q = clamp(-r.top / vh), p = f.yt || f.v ? p0 : Math.min(p0, 0.6);
        const cp = p >= 0.999 ? "none" : `inset(${((m ? 24 : 18) * (1 - p)).toFixed(2)}% ${((m ? 6 : 14) * (1 - p)).toFixed(2)}% ${((m ? 24 : 18) * (1 - p)).toFixed(2)}% ${((m ? 6 : 14) * (1 - p)).toFixed(2)}% round ${(36 * (1 - p)).toFixed(1)}px)`;
        if (f.cp !== cp) { f.fr.style.clipPath = cp; f.cp = cp; }
        if (!reduce) {
          f.md.style.transform = `scale(${1.3 - p * 0.3 + q * 0.08}) translate3d(0,${q * -3}%,0)`;
          f.tx.style.transform = `translate3d(0,${(1 - p) * 120 - q * 60}px,0)`;
          f.tx.style.opacity = String(clamp(p * 1.6 - 0.6));
          f.n.style.transform = `translate3d(${(1 - p) * 200}px,0,0)`;
        }
      });
      const yp = $("#ypin");
      if (yp) {
        const yr = R(yp);
        if (yr.bottom > 0 && yr.top < vh && !reduce) {
          const yl = $("#yline")!, tr = $("#ytrack")!;
          if (!yr.x.st) { yr.x.st = parseFloat(getComputedStyle(yl).top) || 96; yr.x.mx = Math.max(0, tr.scrollWidth - innerWidth); yr.x.oh = yl.offsetHeight; }
          tr.style.transform = `translate3d(${-yr.x.mx * clamp((yr.x.st - yr.top) / Math.max(1, yr.height - yr.x.oh))}px,0,0)`;
        }
      }
      const fb = $("#fbig");
      if (fb?.parentElement) {
        const fr2 = R(fb.parentElement);
        if (fr2.top < vh && !reduce) fb.style.transform = `translate3d(0,${clamp((fr2.top - vh * 0.55) / vh) * 120 * clamp((SH - vh - sy) / 300)}px,0)`;
      }
      if (m75.el) {
        const r = R(m75.el);
        if (r.bottom > 0 && r.top < vh) {
          const p = clamp(-r.top / (r.height - vh));
          m75.holes.forEach((h) => {
            const k = clamp((p - h.t) / 0.3);
            h.el.classList.toggle("on", p > h.t);
            h.drip.style.transform = `scaleY(${k})`;
            h.stain.style.opacity = String(clamp(k * 2));
          });
          const md = $("#mdark"), ms = $("#msay");
          if (md) md.style.opacity = String(clamp((p - 0.66) / 0.16));
          if (ms) { ms.style.opacity = String(clamp((p - 0.8) / 0.1)); ms.style.transform = `translate3d(0,${(1 - clamp((p - 0.8) / 0.1)) * 40}px,0)`; }
        }
      }
      const a24 = $("#a24"), b = $("#brk");
      if (a24 && b) {
        const ar = R(a24);
        const r = ar.bottom > 0 && ar.top < vh ? b.getBoundingClientRect() : { bottom: -1, top: 0 };
        if (r.bottom > 0 && r.top < vh && !reduce) {
          const k = clamp(1 - (r.top - vh * 0.2) / (vh * 0.6)) * Math.min(18, innerWidth * 0.02);
          (b.firstElementChild as HTMLElement).style.transform = `translate3d(${-k}px,0,0)`;
          (b.lastElementChild as HTMLElement).style.transform = `translate3d(${k}px,0,0) rotate(${k * 0.05}deg)`;
        }
      }
      const con = $("#contribute");
      if (con) {
        const cr = R(con);
        if (cr.top < vh && cr.bottom > 0 && !reduce) {
          const mm = (vh - cr.top) * 0.25;
          const q1 = $("#mq1"), q2 = $("#mq2");
          if (q1) q1.style.transform = `translate3d(${-mm}px,0,0)`;
          if (q2) q2.style.transform = `translate3d(${mm - 700}px,0,0)`;
        }
      }
    }
    on("scroll", req, { passive: true });
    on("resize", () => { chaps.forEach((c) => (c.a = -1)); buildRoad(); relayout(); });
    on("load", () => { buildRoad(); relayout(); });
    on("home:relayout" as keyof WindowEventMap, () => { buildRoad(); relayout(); });
    const ro = new ResizeObserver(() => { buildRoad(); relayout(); });
    ro.observe(document.body);
    if (road) ro.observe(road);
    offs.push(() => ro.disconnect());

    // ───────── smooth inertial wheel scrolling (desktop mouse / trackpad) ─────────
    if (!reduce && matchMedia("(hover:hover) and (pointer:fine)").matches) {
      let cur = scrollY, tgt = scrollY, running = false, last = 0;
      const max = () => document.documentElement.scrollHeight - innerHeight;
      const canScroll = (el: Element | null, dy: number) => {
        for (; el && el !== body && el !== document.documentElement; el = el.parentElement) {
          const s = getComputedStyle(el);
          if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
            if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
          }
        }
        return false;
      };
      const loop = (now: number) => {
        if (dead) return;
        const dt = Math.min(64, now - (last || now - 16.7));
        last = now;
        cur += (tgt - cur) * (1 - Math.pow(1 - 0.09, dt / 16.7));
        if (Math.abs(tgt - cur) < 0.4) { cur = tgt; running = false; }
        scrollTo(0, cur);
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        tick();
        if (running) requestAnimationFrame(loop);
        else last = 0;
      };
      const go = (t: number) => {
        tgt = clamp(t, 0, max());
        if (!running) { running = true; cur = scrollY; requestAnimationFrame(loop); }
      };
      on("wheel", (e: WheelEvent) => {
        if (e.defaultPrevented || e.ctrlKey || body.classList.contains("lock")) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        const dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
        if (canScroll(e.target as Element, dy)) return;
        e.preventDefault();
        if (!running) tgt = scrollY;
        go(tgt + dy);
      }, { passive: false });
      on("scroll", () => { if (!running) cur = tgt = scrollY; }, { passive: true });
      on("keydown", () => { if (running) { running = false; tgt = cur = scrollY; } });
      const anchor = (e: MouseEvent) => {
        const a = (e.target as Element).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
        if (!a || e.defaultPrevented) return;
        const id = a.getAttribute("href")!;
        const t = id === "#" || id === "#top" ? body : document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        go(t === body ? 0 : t.getBoundingClientRect().top + scrollY - (id === "#top" ? 0 : 70));
        if (t instanceof HTMLElement && t !== body) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
      };
      document.addEventListener("click", anchor);
      offs.push(() => document.removeEventListener("click", anchor));
    }

    // ───────── reveal + counters + magnetic ─────────
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          el.classList.add("in");
          io.unobserve(el);
          $$("[data-count]", el).forEach((c) => {
            const to = +(c.dataset.count || 0), t0 = performance.now();
            const st = (now: number) => {
              const k = clamp((now - t0) / 1400);
              c.textContent = num(Math.round(to * ss(k)));
              if (k < 1) requestAnimationFrame(st);
              else c.classList.add("done");
            };
            requestAnimationFrame(st);
          });
        }),
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    $$(".rv").forEach((e) => io.observe(e));
    $$(".steps li, .a24 li, .term").forEach((e) => io.observe(e));
    offs.push(() => io.disconnect());
    if (!reduce && matchMedia("(hover:hover)").matches)
      $$(".mag").forEach((b) => {
        b.onpointermove = (e) => {
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
        };
        b.onpointerleave = () => (b.style.transform = "");
      });

    // ───────── hero: image slides (fallback) + muted YouTube clips ─────────
    const slides = $$(".slide"), caps = $$("#caps span"), dots = $$("#dots i");
    let sl = 0;
    every(() => {
      if (scrollY > innerHeight || !slides.length || document.hidden) return;
      sl = (sl + 1) % slides.length;
      [slides, caps, dots].forEach((g) => g.forEach((e, k) => e.classList.toggle("on", k === sl % g.length)));
    }, 5200);

    const hvid = $("#hvid");
    const heroSlots: { d: HTMLDivElement; i: HTMLDivElement; p: any; ok: boolean; cb: (() => void) | null; tk: number; id?: string }[] = [];
    if (hvid && !reduce) {
      const CLIP = 8000, bad = new Set<string>(), dur: Record<string, number> = {};
      let lastId = "", cur: (typeof heroSlots)[number] | null = null, paused = false;
      for (let k = 0; k < 2; k++) {
        const d = document.createElement("div");
        d.className = "vs";
        const i = document.createElement("div");
        d.appendChild(i);
        hvid.appendChild(d);
        heroSlots.push({ d, i, p: null, ok: false, cb: null, tk: 0 });
      }
      const pick = () => {
        const c = HERO_CLIPS.filter((v) => !bad.has(v) && v !== lastId);
        const c2 = c.length ? c : HERO_CLIPS.filter((v) => !bad.has(v));
        return c2.length ? c2[(Math.random() * c2.length) | 0] : null;
      };
      const at = (id: string) => Math.max(3, Math.random() * ((dur[id] || 70) - 14));
      const load = (s: (typeof heroSlots)[number], cb: () => void) => {
        if (dead) return;
        const id = pick();
        if (!id) return;
        lastId = id; s.id = id; s.cb = cb; s.ok = false;
        const tk = ++s.tk;
        later(() => { if (s.tk === tk && !s.ok) { bad.add(id); load(s, cb); } }, 10000);
        if (s.p?.loadVideoById) { s.p.loadVideoById({ videoId: id, startSeconds: at(id) }); return; }
        s.p = new window.YT.Player(s.i, {
          videoId: id, host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0, cc_load_policy: 0, start: Math.floor(at(id)), origin: location.origin },
          events: {
            onReady: (e: any) => { e.target.mute(); e.target.playVideo(); },
            onStateChange: (e: any) => {
              if (e.data !== 1 || s.ok) return;
              s.ok = true;
              const d = s.p.getDuration();
              if (d) { dur[s.id!] = d; if (s.p.getCurrentTime() > d - 10) s.p.seekTo(at(s.id!), true); }
              later(() => s.cb?.(), 600);
            },
            onError: () => { bad.add(s.id!); load(s, s.cb!); },
          },
        });
      };
      const show = (s: (typeof heroSlots)[number]) => {
        const prev = cur;
        cur = s;
        s.d.classList.add("on");
        if (prev && prev !== s) { prev.d.classList.remove("on"); later(() => { try { prev.p.pauseVideo(); } catch {} }, 1900); }
        later(next, CLIP);
      };
      const next = () => {
        if (dead) return;
        if (scrollY > innerHeight || document.hidden) {
          if (cur && !paused) { paused = true; try { cur.p.pauseVideo(); } catch {} }
          later(next, 1500);
          return;
        }
        if (paused && cur) { paused = false; try { cur.p.playVideo(); } catch {} }
        const n = cur === heroSlots[0] ? heroSlots[1] : heroSlots[0];
        load(n, () => show(n));
      };
      // lazy: start after first paint, only if the connection isn't flagged save-data
      const saveData = (navigator as any).connection?.saveData;
      if (!saveData)
        later(() => {
          ytLoad();
          const go = () => load(heroSlots[0], () => show(heroSlots[0]));
          if (ytReady) go(); else ytQ.push(go);
        }, 1400);
    }

    // ───────── preloader: shutters lift, then everything flies in ─────────
    {
      let n = 0, loaded = document.readyState === "complete", fin = false;
      const el = $("#prn");
      const go = () => {
        if (fin) return;
        fin = true;
        body.classList.add("lift");
        later(() => { body.classList.remove("lock"); body.classList.add("ready"); req(); }, 650);
        later(() => $("#pre")?.remove(), 2200);
      };
      if (reduce) go();
      else {
        const iv = setInterval(() => {
          n = Math.min(100, n + (loaded ? 7 : 3));
          if (el) el.textContent = num(n);
          if (n >= 100) { clearInterval(iv); go(); }
        }, 40);
        timers.push(iv);
        on("load", () => (loaded = true));
        later(() => (loaded = true), 2500);
        later(go, 5000);
      }
    }

    apiRef.onLang = () => {
      $$("[data-count].done").forEach((e) => (e.textContent = num(e.dataset.count || 0)));
      chaps.forEach((c) => (c.a = -1));
      updSnd();
      relayout();
    };

    buildRoad();
    tick();

    return () => {
      dead = true;
      timers.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
      offs.forEach((f) => f());
      if (raf) cancelAnimationFrame(raf);
      films.forEach((f) => { try { f.pl?.destroy?.(); } catch {} });
      heroSlots.forEach((s) => { try { s.p?.destroy?.(); } catch {} s.d.remove(); });
      body.classList.remove("lock", "lift", "ready");
      apiRef.onLang = undefined;
    };
  }, []);

  return null;
}
