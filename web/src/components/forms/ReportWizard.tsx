"use client";
import { useRef, useState } from "react";
import s from "./forms.module.css";
import { report as R, common as C } from "@/i18n/forms";
import { CASE_FILED, CRIMES, HARMS, HOW_KNOWN, ID_MODES, VICTIMS, WITNESS } from "@/lib/labels";
import { DIVISIONS, districtsOf } from "@/lib/geo";
import { bnd } from "@/lib/bn";
import { complaintSchema, type ComplaintInput } from "@/lib/validation";
import { submitComplaint } from "@/app/actions/public";
import { useUploads, type UploadItem } from "./useUploads";
import Turnstile, { captchaRequired } from "./Turnstile";

type Acc = { name: string; role: string; org: string; description: string; how: string; fb: string; photoUrl: string };
const blankAcc = (): Acc => ({ name: "", role: "", org: "", description: "", how: "", fb: "", photoUrl: "" });
const blankF = { date: "", division: "", district: "", thana: "", desc: "", vcount: "", vname: "", links: "", witness: "", caseFiled: "", contact: "" };

export default function ReportWizard({ lang }: { lang: "bn" | "en" }) {
  const en = lang === "en";
  const t = (k: keyof typeof R) => R[k][en ? 1 : 0];
  const c = (k: keyof typeof C) => C[k][en ? 1 : 0];
  const n = (x: number | string) => (en ? String(x) : bnd(x));

  const [step, setStep] = useState(0);
  const [crimes, setCrimes] = useState<string[]>([]);
  const [harms, setHarms] = useState<string[]>([]);
  const [victim, setVictim] = useState<string | null>(null);
  const [acc, setAcc] = useState<Acc[]>([blankAcc()]);
  const [accKeys, setAccKeys] = useState<Record<number, string | undefined>>({});
  const [f, setF] = useState(blankF);
  const [idMode, setIdMode] = useState<"ANON" | "CONTACT">("ANON");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; secret: string } | null>(null);
  const [over, setOver] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [capKey, setCapKey] = useState(0); // Turnstile tokens are single-use
  const [copied, setCopied] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const ev = useUploads("complaint");
  const accUp = useUploads("accused", 20);

  const accPhoto = (i: number): UploadItem | undefined => accUp.items.find((x) => x.key === accKeys[i]);

  const set = (k: keyof typeof blankF) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setF((x) => ({ ...x, [k]: v, ...(k === "division" ? { district: "" } : {}) }));
    setErr("");
  };
  const tog = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    setErr("");
  };
  const setA = (i: number, k: keyof Acc, v: string) => setAcc((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const valid = () => {
    if (!crimes.length) { setErr(t("eCrime")); setStep(0); return false; }
    if (!f.desc.trim()) { setErr(t("eDesc")); setStep(0); return false; }
    return true;
  };
  const go = (to: number) => {
    if (done) return;
    if (to > step && !valid()) return;
    setStep(to);
    setErr("");
    const el = form.current;
    if (el && el.getBoundingClientRect().top < 0) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: "smooth" });
  };

  const submit = async () => {
    if (!valid()) return;
    if (!ok) return setErr(t("eOk"));
    if (ev.busy || accUp.busy) return setErr(c("eWait"));
    if (ev.failed || accUp.failed) return setErr(c("eUpload"));
    if (captchaRequired && !captcha) return setErr(c("eCaptcha"));
    const input: ComplaintInput = {
      crimes: crimes as ComplaintInput["crimes"],
      harms: harms as ComplaintInput["harms"],
      victimType: (victim ?? undefined) as ComplaintInput["victimType"],
      victimCount: f.vcount || undefined,
      victimName: f.vname,
      date: f.date,
      division: (f.division || undefined) as ComplaintInput["division"],
      district: f.district,
      thana: f.thana,
      description: f.desc,
      accused: acc.map((a, i) => ({
        name: a.name, role: a.role, org: a.org, description: a.description,
        how: (a.how || undefined) as NonNullable<ComplaintInput["accused"]>[number]["how"],
        facebookUrl: a.fb, photoUrl: a.photoUrl, photo: accPhoto(i)?.ref,
      })),
      uploads: ev.refs,
      links: f.links,
      witness: (f.witness || undefined) as ComplaintInput["witness"],
      caseFiled: (f.caseFiled || undefined) as ComplaintInput["caseFiled"],
      idMode,
      contact: idMode === "CONTACT" ? f.contact : "",
      ok: true,
      captcha: captcha ?? undefined,
    };
    const p = complaintSchema.safeParse(input);
    if (!p.success) {
      const fb = p.error.issues.some((i) => i.path.includes("facebookUrl"));
      return setErr(fb ? t("eFb") : c("eInvalid"));
    }
    setBusy(true);
    try {
      const r = await submitComplaint(input);
      if (r.ok) {
        setDone({ code: r.code, secret: r.secret });
        scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setCaptcha(null);
        setCapKey((k) => k + 1);
        setErr(r.error === "rate" ? c("eRate") : r.error === "captcha" ? c("eCaptcha") : r.error === "upload" ? c("eUpload") : r.error === "invalid" ? c("eInvalid") : c("eServer"));
      }
    } catch {
      setCaptcha(null);
      setCapKey((k) => k + 1);
      setErr(c("eServer"));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    form.current?.reset();
    setStep(0); setCrimes([]); setHarms([]); setVictim(null); setAcc([blankAcc()]); setAccKeys({}); setF(blankF);
    setIdMode("ANON"); setOk(false); setErr(""); setDone(null); setCaptcha(null); ev.reset(); accUp.reset();
  };

  const LBL = [t("s0"), t("s1"), t("s2"), t("s3"), t("s4")];
  const Head = ({ i, h, p }: { i: number; h: string; p?: string }) => (
    <div>
      <div className={s.stepNo}>{t("stepOf").replace("{n}", n(i + 1))}</div>
      <h2 className={s.h2}>{h}</h2>
      {p && <p className={s.sub}>{p}</p>}
    </div>
  );
  const Sel = ({ name, label, opts }: { name: keyof typeof blankF; label: string; opts: readonly (readonly [string, string, string])[] }) => (
    <label className={s.field}>
      <span className={s.lbl}>{label}</span>
      <select className={s.select} value={f[name]} onChange={set(name)}>
        <option value="">{c("pick")}</option>
        {opts.map(([v, bn, e]) => (
          <option key={v} value={v}>{en ? e : bn}</option>
        ))}
      </select>
    </label>
  );

  return (
    <main className={`${s.main} ${s.gut}`}>
      <aside className={s.aside}>
        <div className={s.prog}>
          <i style={{ width: `${((done ? 5 : step + 1) / 5) * 100}%` }} />
        </div>
        <ol className={s.steps}>
          {LBL.map((label, i) => {
            const on = i === step && !done, dn = i < step || !!done;
            return (
              <li key={i}>
                <button type="button" className={on ? s.on : dn ? s.dn : ""} onClick={() => go(i)} aria-current={on ? "step" : undefined}>
                  <b>{dn && !on ? "✓" : n(i + 1)}</b>
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <form ref={form} className={s.card} onSubmit={(e) => e.preventDefault()} noValidate>
        {!done ? (
          <>
            <div className={s.cardIn}>
              {step === 0 && (
                <div className={s.step}>
                  {Head({ i: 0, h: t("h0") })}
                  <div>
                    <div className={s.lab}>{t("crimes")} <em>{t("multi")}</em></div>
                    <div className={s.crimes}>
                      {CRIMES.list.map(([v, bn, e]) => {
                        const on = crimes.includes(v);
                        return (
                          <button key={v} type="button" className={`${s.crime} ${on ? s.on : ""}`} aria-pressed={on} onClick={() => tog(crimes, setCrimes, v)}>
                            <span className={s.box} aria-hidden="true">{on ? "✓" : ""}</span>
                            <span>{en ? e : bn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className={s.row}>
                    <label className={s.field}>
                      <span className={s.lbl}>{t("date")}</span>
                      <input className={s.input} type="date" value={f.date} max={new Date().toISOString().slice(0, 10)} onChange={set("date")} />
                    </label>
                    {Sel({ name: "division", label: t("division"), opts: DIVISIONS.filter((d) => d.code !== "ABROAD").map((d) => [d.code, d.bn, d.en] as const) })}
                  </div>
                  <div className={s.row}>
                    <label className={s.field}>
                      <span className={s.lbl}>{t("district")}</span>
                      <select className={s.select} value={f.district} onChange={set("district")}>
                        <option value="">{c("pick")}</option>
                        {districtsOf(f.division || null).map((d) => (
                          <option key={d[0]} value={d[0]}>{en ? d[1] : d[0]}</option>
                        ))}
                      </select>
                    </label>
                    <label className={s.field}>
                      <span className={s.lbl}>{t("area")}</span>
                      <input className={s.input} value={f.thana} maxLength={120} onChange={set("thana")} />
                    </label>
                  </div>
                  <label className={s.field} style={{ flex: "none" }}>
                    <span className={s.lbl}>{t("desc")}</span>
                    <textarea className={s.textarea} rows={6} placeholder={t("descPh")} value={f.desc} maxLength={30000} onChange={set("desc")} />
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className={s.step}>
                  {Head({ i: 1, h: t("h1") })}
                  <div className={s.radios} role="radiogroup">
                    {VICTIMS.list.map(([v, bn, e]) => (
                      <button key={v} type="button" role="radio" aria-checked={victim === v} className={`${s.radio} ${victim === v ? s.on : ""}`} onClick={() => setVictim(v)}>
                        <span className={s.dot} />
                        {en ? e : bn}
                      </button>
                    ))}
                  </div>
                  <div className={s.row}>
                    <label className={s.field}>
                      <span className={s.lbl}>{t("vcount")}</span>
                      <input className={s.input} type="number" min={1} inputMode="numeric" value={f.vcount} onChange={set("vcount")} />
                    </label>
                    <label className={`${s.field} ${s.w2}`}>
                      <span className={s.lbl}>{t("vname")} <em>{c("optional")}</em></span>
                      <input className={s.input} value={f.vname} maxLength={300} onChange={set("vname")} autoComplete="off" />
                    </label>
                  </div>
                  <div>
                    <div className={s.lab}>{t("harms")}</div>
                    <div className={s.chips}>
                      {HARMS.list.map(([v, bn, e]) => (
                        <button key={v} type="button" aria-pressed={harms.includes(v)} className={`${s.chip} ${harms.includes(v) ? s.on : ""}`} onClick={() => tog(harms, setHarms, v)}>
                          {en ? e : bn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className={s.step} style={{ gap: 26 }}>
                  {Head({ i: 2, h: t("h2"), p: t("h2p") })}
                  {acc.map((a, i) => {
                    const ph = accPhoto(i);
                    const src = ph?.preview || a.photoUrl;
                    return (
                      <div key={i} className={s.acc}>
                        <div className={s.accHd}>
                          <b>{t("accused")} {n(i + 1)}</b>
                          {acc.length > 1 && (
                            <button type="button" className={s.linkBtn} onClick={() => {
                              if (ph) accUp.remove(ph.key);
                              setAcc((x) => x.filter((_, j) => j !== i));
                              setAccKeys((m) => Object.fromEntries(Object.entries(m).filter(([k]) => +k !== i).map(([k, v]) => [+k > i ? +k - 1 : +k, v])));
                            }}>{c("remove")}</button>
                          )}
                        </div>
                        <label className={s.field}>
                          <span className={s.lbl}>{t("accName")}</span>
                          <input className={s.input} value={a.name} maxLength={200} onChange={(e) => setA(i, "name", e.target.value)} />
                        </label>
                        <div className={s.row} style={{ gap: 20 }}>
                          <label className={`${s.field} ${s.w18}`}>
                            <span className={s.lbl}>{t("accRole")}</span>
                            <input className={s.input} value={a.role} placeholder={t("accRolePh")} maxLength={200} onChange={(e) => setA(i, "role", e.target.value)} />
                          </label>
                          <label className={`${s.field} ${s.w18}`}>
                            <span className={s.lbl}>{t("accOrg")}</span>
                            <input className={s.input} value={a.org} maxLength={200} onChange={(e) => setA(i, "org", e.target.value)} />
                          </label>
                        </div>
                        <div className={s.row} style={{ gap: 20, alignItems: "flex-end" }}>
                          <label className={s.photoPick}>
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (!file) return;
                                if (ph) accUp.remove(ph.key);
                                const [key] = accUp.add([file]);
                                setAccKeys((m) => ({ ...m, [i]: key }));
                              }}
                            />
                            {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : <span>{t("accPhoto")}</span>}
                            {ph?.status === "uploading" && <i style={{ position: "absolute", left: 0, bottom: 0, height: 4, width: `${ph.progress * 100}%`, background: "oklch(0.52 0.16 28)" }} />}
                          </label>
                          <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 16 }}>
                            <label className={s.field}>
                              <span className={s.lbl}>{t("accFb")}</span>
                              <input className={s.input} type="url" value={a.fb} placeholder="https://facebook.com/..." maxLength={1000} onChange={(e) => setA(i, "fb", e.target.value)} />
                            </label>
                            <label className={s.field}>
                              <span className={s.lbl}>{t("accPhotoUrl")} <em>{t("accPhotoUrlHint")}</em></span>
                              <input className={s.input} type="url" value={a.photoUrl} placeholder="https://..." maxLength={1000} onChange={(e) => setA(i, "photoUrl", e.target.value)} />
                            </label>
                          </div>
                        </div>
                        <label className={s.field}>
                          <span className={s.lbl}>{t("accDesc")} <em>{c("optional")}</em></span>
                          <textarea className={`${s.textarea} ${s.sm}`} rows={2} value={a.description} maxLength={4000} onChange={(e) => setA(i, "description", e.target.value)} />
                        </label>
                        <label className={s.field}>
                          <span className={s.lbl}>{t("accHow")}</span>
                          <select className={s.select} value={a.how} onChange={(e) => setA(i, "how", e.target.value)}>
                            <option value="">{c("pick")}</option>
                            {HOW_KNOWN.list.map(([v, bn, e]) => <option key={v} value={v}>{en ? e : bn}</option>)}
                          </select>
                        </label>
                      </div>
                    );
                  })}
                  {acc.length < 20 && (
                    <button type="button" className={s.addBtn} onClick={() => setAcc((x) => [...x, blankAcc()])}>{t("addAcc")}</button>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className={s.step} style={{ gap: 28 }}>
                  {Head({ i: 3, h: t("h3"), p: t("h3p") })}
                  <label
                    className={`${s.drop} ${over ? s.over : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                    onDragLeave={() => setOver(false)}
                    onDrop={(e) => { e.preventDefault(); setOver(false); ev.add(e.dataTransfer.files); }}
                  >
                    <input type="file" multiple accept={ev.accept} hidden onChange={(e) => { ev.add(e.target.files); e.target.value = ""; }} />
                    <b>{t("drop")}</b>
                    <span>{t("dropSub")}</span>
                  </label>
                  {ev.items.length > 0 && (
                    <div className={s.files}>
                      {ev.items.map((x) => (
                        <div key={x.key} className={s.file}>
                          <span>{x.name}</span>
                          <i>{x.status === "uploading" ? `${n(Math.round(x.progress * 100))}%` : x.status === "error" ? "⚠" : "✓"}</i>
                          <button type="button" aria-label={c("remove")} onClick={() => ev.remove(x.key)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className={s.field}>
                    <span className={s.lbl}>{t("links")}</span>
                    <textarea className={`${s.textarea} ${s.sm}`} rows={3} placeholder={t("linksPh")} value={f.links} onChange={set("links")} />
                  </label>
                  <div className={s.row}>
                    {Sel({ name: "witness", label: t("witness"), opts: WITNESS.list })}
                    {Sel({ name: "caseFiled", label: t("caseFiled"), opts: CASE_FILED.list })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className={s.step} style={{ gap: 26 }}>
                  {Head({ i: 4, h: t("h4") })}
                  <div className={s.radios} role="radiogroup">
                    {ID_MODES.list.map(([v, bn, e]) => (
                      <button key={v} type="button" role="radio" aria-checked={idMode === v} className={`${s.radio} ${s.top} ${idMode === v ? s.on : ""}`} onClick={() => setIdMode(v)}>
                        <span className={s.dot} />
                        <span>
                          <b>{en ? e : bn}</b>
                          <small>{v === "ANON" ? t("anonSub") : t("contactSub")}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {idMode === "CONTACT" && (
                    <label className={s.field} style={{ animation: "up .4s" }}>
                      <span className={s.lbl}>{t("contact")}</span>
                      <input className={s.input} value={f.contact} maxLength={300} autoComplete="off" onChange={set("contact")} />
                    </label>
                  )}
                  <label className={s.check}>
                    <input type="checkbox" checked={ok} onChange={(e) => { setOk(e.target.checked); setErr(""); }} />
                    <span>{t("ok")}</span>
                  </label>
                  <Turnstile key={capKey} onToken={setCaptcha} lang={lang} />
                </div>
              )}
            </div>
            <div className={s.foot}>
              <button type="button" className={s.btnLine} style={{ visibility: step ? "visible" : "hidden" }} onClick={() => go(Math.max(0, step - 1))}>
                {t("back")}
              </button>
              <span className={s.errMsg} role="alert">{err}</span>
              <button type="button" className={s.btnDark} disabled={busy} onClick={() => (step === 4 ? submit() : go(step + 1))}>
                {busy ? c("sending") : step === 4 ? t("submit") : t("next")} →
              </button>
            </div>
          </>
        ) : (
          <div className={s.done} aria-live="polite">
            <svg width="76" height="76" viewBox="0 0 80 80" fill="none" stroke="oklch(0.52 0.16 28)" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <circle cx="40" cy="40" r="36" />
              <path d="M24 41l11 11 22-24" />
            </svg>
            <h2 className={s.h2} style={{ fontSize: "clamp(28px,3.4vw,40px)" }}>{t("doneH")}</h2>
            <p>{t("doneP")}</p>
            <div className={s.codes}>
              <div className={s.code}><small>{t("code")}</small><b>{done.code}</b></div>
              <div className={s.code}><small>{t("secret")}</small><b>{done.secret}</b></div>
            </div>
            <div className={s.btns}>
              <button type="button" className={s.btnLine} onClick={() => {
                navigator.clipboard?.writeText(`${t("code")}: ${done.code}\n${t("secret")}: ${done.secret}`).then(() => setCopied(true)).catch(() => {});
              }}>{copied ? t("copied") : t("copy")}</button>
              <button type="button" className={s.btnLine} onClick={reset}>{t("another")}</button>
              <a href="/report/status" className={s.btnLine}>{t("statusLink")}</a>
              <a href="/" className={s.btnDark}>{t("homeBtn")}</a>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
