"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { give as G } from "@/i18n/home";
import { CONTRIBUTION_TYPES } from "@/lib/labels";
import { contributionSchema, type ContributionInput } from "@/lib/validation";
import { submitContribution } from "@/app/actions/public";
import { useUploads } from "@/components/forms/useUploads";
import Turnstile, { captchaRequired } from "@/components/forms/Turnstile";
import { useModal } from "./useModal";
import type { GiveKey, GivePre } from "./bus";

type Who = "NAME" | "ALIAS" | "ANON";
const blank = { year: "", date: "", place: "", title: "", body: "", src: "", vlink: "", name: "", contact: "" };

export default function GiveModal({ lang }: { lang: "bn" | "en" }) {
  const t = (k: keyof typeof G) => G[k][lang === "en" ? 1 : 0];
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [K, setK] = useState<GiveKey>("bb");
  const [st, setSt] = useState(0);
  const [back, setBack] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [f, setF] = useState(blank);
  const [who, setWho] = useState<Who>("ANON");
  const [ok, setOk] = useState(false);
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [capKey, setCapKey] = useState(0); // Turnstile tokens are single-use: re-mount after every attempt
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });
  const [over, setOver] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLFormElement>(null);
  const up = useUploads("contribution");
  const STEPS = 4;

  const close = useCallback(() => {
    setShow(false);
    setTimeout(() => {
      setOpen(false);
      setRef("");
    }, 700);
  }, []);
  useModal(open, panel, close);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ k: GiveKey; rect: DOMRect | null; pre?: GivePre }>).detail;
      setK(d.k);
      setF({ ...blank, year: d.pre?.y ?? "" });
      setTypes(d.pre?.t ?? []);
      setWho("ANON");
      setOk(false);
      setErrs({});
      setMsg("");
      setRef("");
      setCaptcha(null);
      up.reset();
      setSt(0);
      setOpen(true);
      requestAnimationFrame(() => {
        const pb = panel.current?.getBoundingClientRect();
        const r = d.rect;
        setOrigin(r && pb ? { x: `${r.left + r.width / 2 - pb.left}px`, y: `${r.top + r.height / 2 - pb.top}px` } : { x: "50%", y: "50%" });
        requestAnimationFrame(() => setShow(true));
      });
    };
    window.addEventListener("give:open", onOpen);
    return () => window.removeEventListener("give:open", onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // focus first field of the step (desktop only, like the prototype)
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      const el = body.current?.querySelector<HTMLElement>(".gf-st.on input:not([type=radio]):not([type=checkbox]):not([hidden]), .gf-st.on textarea");
      if (el && matchMedia("(pointer:fine)").matches) el.focus({ preventScroll: true });
      if (body.current) body.current.scrollTop = 0;
    }, 350);
    return () => clearTimeout(id);
  }, [st, open]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setErrs((s) => ({ ...s, [k]: false }));
  };
  const go = (n: number, isBack = false) => {
    setBack(isBack);
    setSt(n);
    setMsg("");
  };
  const fail = (m: string, fields: string[] = []) => {
    setMsg(m);
    setErrs((s) => ({ ...s, ...Object.fromEntries(fields.map((x) => [x, true])) }));
    return false;
  };
  const isUrl = (v: string) => !v || /^https?:\/\/\S+$/i.test(v.trim());

  const valid = () => {
    if (st === 0) {
      if (!types.length) return fail(t("eType"));
      const y = +f.year;
      if (!f.year.trim() || y < 1900 || y > new Date().getFullYear()) return fail(t("eYear"), ["year"]);
    }
    if (st === 1) {
      const miss = [!f.title.trim() && "title", !f.body.trim() && "body"].filter(Boolean) as string[];
      if (miss.length) return fail(t("eBody"), miss);
      if (!isUrl(f.src)) return fail(t("eUrl"), ["src"]);
    }
    if (st === 2) {
      if (!isUrl(f.vlink)) return fail(t("eUrl"), ["vlink"]);
      if (up.busy) return fail(t("eWait"));
    }
    if (st === 3) {
      if (who !== "ANON" && !f.name.trim()) return fail(t("eName"), ["name"]);
      if (!ok) return fail(t("eOk"));
      if (captchaRequired && !captcha) return fail(t("eCaptcha"));
    }
    return true;
  };

  const next = async () => {
    if (!valid()) return;
    if (st < STEPS - 1) return go(st + 1);
    if (up.busy) return fail(t("eWait"));
    const input = {
      subject: (K === "bb" ? "BB" : "SH") as "BB" | "SH",
      types: types as ContributionInput["types"],
      year: f.year,
      date: f.date,
      place: f.place,
      title: f.title,
      description: f.body,
      sourceUrl: f.src,
      videoLink: f.vlink,
      attribution: who,
      name: who === "ANON" ? "" : f.name,
      contact: f.contact,
      consent: ok as true,
      uploads: up.refs,
      captcha: captcha ?? undefined,
    };
    const p = contributionSchema.safeParse(input);
    if (!p.success) return fail(t("eServer"));
    setBusy(true);
    try {
      const r = await submitContribution(input);
      if (r.ok) setRef(r.ref);
      else {
        setCaptcha(null);
        setCapKey((k) => k + 1);
        fail(r.error === "rate" ? t("eRate") : r.error === "captcha" ? t("eCaptcha") : r.error === "upload" ? t("eUpload") : t("eServer"));
      }
    } catch {
      setCaptcha(null);
      setCapKey((k) => k + 1);
      fail(t("eServer"));
    } finally {
      setBusy(false);
    }
  };

  const fld = (k: keyof typeof blank, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`fld${errs[k] ? " err" : ""}`}>
      <input name={k} placeholder=" " value={f[k]} onChange={set(k)} aria-invalid={!!errs[k]} {...props} />
      <span>{label}</span>
    </label>
  );

  const stepCls = (i: number) => `gf-st${i === st ? " on" : ""}${back ? " back" : ""}`;
  const done = !!ref;

  return (
    <div id="gf" className={`${open ? "open" : ""} ${show ? "show" : ""}`} role="dialog" aria-modal="true" aria-labelledby="gf-t" hidden={!open}>
      <div className="scrim" onClick={close} />
      <div
        className={`gf-p${K === "sh" ? " sh" : ""}${done ? " fin" : ""}`}
        id="gfp"
        ref={panel}
        style={{ "--ox": origin.x, "--oy": origin.y } as React.CSSProperties}
      >
        <aside className="gf-side">
          <span className="k">{t("k")}</span>
          <h3 id="gf-t">{K === "bb" ? t("nameBB") : t("nameSH")}</h3>
          <ol className="gf-steps">
            {(["s1", "s2", "s3", "s4"] as const).map((s, i) => (
              <li key={s} className={`${i === st ? "on" : ""}${i < st || done ? " done" : ""}`} aria-current={i === st ? "step" : undefined}>
                {t(s)}
              </li>
            ))}
          </ol>
          <small>{t("side")}</small>
        </aside>
        <div className="gf-main">
          <div className="gf-bar">
            <i style={{ width: `${((st + 1) / STEPS) * 100}%` }} />
          </div>
          <button className="gf-x" type="button" aria-label={t("close")} onClick={close}>
            ×
          </button>

          <form className="gf-body" ref={body} onSubmit={(e) => e.preventDefault()} noValidate>
            <div className={stepCls(0)}>
              <h4>{t("st1h")}</h4>
              <div>
                <span className="lab">{t("typeLab")}</span>
                <div className="chips">
                  {CONTRIBUTION_TYPES.list.map(([c, bn, en]) => (
                    <button
                      key={c}
                      type="button"
                      className={types.includes(c) ? "on" : ""}
                      aria-pressed={types.includes(c)}
                      onClick={() => setTypes((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))}
                    >
                      <span>{lang === "en" ? en : bn}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="row2">
                {fld("year", t("year"), { type: "number", inputMode: "numeric", required: true })}
                {fld("date", t("date"))}
              </div>
              {fld("place", t("place"))}
            </div>

            <div className={stepCls(1)}>
              <h4>{t("st2h")}</h4>
              {fld("title", t("title"), { required: true, maxLength: 300 })}
              <label className={`fld${errs.body ? " err" : ""}`}>
                <textarea name="body" placeholder=" " required value={f.body} onChange={set("body")} aria-invalid={!!errs.body} maxLength={20000} />
                <span>{t("body")}</span>
              </label>
              {fld("src", t("src"), { type: "url" })}
            </div>

            <div className={stepCls(2)}>
              <h4>{t("st3h")}</h4>
              <p>{t("st3p")}</p>
              <label
                className={`drop${over ? " over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  up.add(e.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  multiple
                  accept={up.accept}
                  hidden
                  onChange={(e) => {
                    up.add(e.target.files);
                    e.target.value = "";
                  }}
                />
                <b>{t("drop")}</b>
                <span>{t("dropSub")}</span>
              </label>
              <div className="thumbs">
                {up.items.map((x) => (
                  <div key={x.key} style={{ opacity: x.status === "error" ? 0.45 : 1 }}>
                    {x.type.startsWith("image") ? (
                      <img src={x.preview} alt="" />
                    ) : x.type.startsWith("video") ? (
                      <video src={x.preview} muted />
                    ) : (
                      <span className="doc">PDF</span>
                    )}
                    <span>
                      {x.status === "uploading" ? `${Math.round(x.progress * 100)}% · ` : x.status === "error" ? "⚠ " : ""}
                      {x.name}
                    </span>
                    <button type="button" aria-label={t("remove")} onClick={() => up.remove(x.key)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {fld("vlink", t("vlink"), { type: "url" })}
            </div>

            <div className={stepCls(3)}>
              <h4>{t("st4h")}</h4>
              <div className="radio" role="radiogroup">
                {(
                  [
                    ["NAME", t("wName"), t("wNameS")],
                    ["ALIAS", t("wAlias"), ""],
                    ["ANON", t("wAnon"), t("wAnonS")],
                  ] as const
                ).map(([v, l, s]) => (
                  <label key={v}>
                    <input type="radio" name="who" value={v} checked={who === v} onChange={() => setWho(v)} />
                    <span>
                      <span>{l}</span>
                      {s && <small>{s}</small>}
                    </span>
                  </label>
                ))}
              </div>
              {who !== "ANON" && fld("name", t("name"), { maxLength: 120 })}
              {fld("contact", t("contact"), { maxLength: 200, autoComplete: "off" })}
              <label className="chk">
                <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
                <span>{t("ok")}</span>
              </label>
              {open && st === 3 && <Turnstile key={capKey} onToken={setCaptcha} lang={lang} />}
            </div>
          </form>

          <div className="gf-foot">
            <button className="btn line sm" type="button" style={{ visibility: st ? "visible" : "hidden" }} onClick={() => st && go(st - 1, true)}>
              <span>{t("back")}</span>
              <span className="ar">←</span>
            </button>
            <span className="msg" role="alert" aria-live="assertive">
              {msg}
            </span>
            <button className="btn sm" type="button" onClick={next} disabled={busy}>
              <span>{busy ? t("sending") : st === STEPS - 1 ? t("submit") : t("nextBtn")}</span>
              <span className="ar">→</span>
            </button>
          </div>

          <div className="gf-done" aria-live="polite">
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="36" />
              <path d="M24 41l11 11 22-24" />
            </svg>
            <h4>{t("doneH")}</h4>
            <p>{t("doneP")}</p>
            <code>{ref}</code>
            <button className="btn line sm" type="button" onClick={close}>
              <span>{t("close")}</span>
              <span className="ar">×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
