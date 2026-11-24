"use client";
import { useState } from "react";
import s from "@/components/forms/forms.module.css";
import { hard as H, common as C } from "@/i18n/forms";
import { ACTIVITY_TYPES, LEVELS, ORGS } from "@/lib/labels";
import { DIVISIONS, districtsOf } from "@/lib/geo";
import { postSchema, type PostInput } from "@/lib/validation";
import { submitPost } from "@/app/actions/public";
import { useUploads } from "@/components/forms/useUploads";
import Turnstile, { captchaRequired } from "@/components/forms/Turnstile";

const blank = { level: "", date: "", division: "", district: "", thana: "", place: "", people: "", title: "", desc: "", links: "", name: "", role: "" };

export default function PostForm({ lang }: { lang: "bn" | "en" }) {
  const en = lang === "en";
  const t = (k: keyof typeof H) => H[k][en ? 1 : 0];
  const c = (k: keyof typeof C) => C[k][en ? 1 : 0];
  const [org, setOrg] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [f, setF] = useState(blank);
  const [anon, setAnon] = useState(true);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [capKey, setCapKey] = useState(0); // Turnstile tokens are single-use
  const [formKey, setFormKey] = useState(0);
  const up = useUploads("post");

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setF((x) => ({ ...x, [k]: v, ...(k === "division" ? { district: "" } : {}) }));
    setErr("");
  };
  const abroad = f.division === "ABROAD";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (org == null) return setErr(t("eOrg"));
    if (type == null) return setErr(t("eType"));
    if (!f.district.trim() || !f.thana.trim()) return setErr(t("ePlace"));
    if (!f.title.trim()) return setErr(t("eTitle"));
    if (up.busy) return setErr(c("eWait"));
    if (up.failed) return setErr(c("eUpload"));
    if (captchaRequired && !captcha) return setErr(c("eCaptcha"));
    const input: PostInput = {
      org: org as PostInput["org"], activityType: type as PostInput["activityType"], level: (f.level || undefined) as PostInput["level"],
      date: f.date, division: (f.division || undefined) as PostInput["division"], district: f.district, thana: f.thana, place: f.place,
      participants: f.people || undefined, title: f.title, description: f.desc, links: f.links, name: f.name, role: f.role,
      anonymous: anon, uploads: up.refs, captcha: captcha ?? undefined,
    };
    if (!postSchema.safeParse(input).success) return setErr(c("eInvalid"));
    setBusy(true);
    try {
      const r = await submitPost(input);
      if (r.ok) {
        setSent(true);
        setErr("");
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

  const again = () => {
    setSent(false); setOrg(null); setType(null); setF(blank); setAnon(true); setCaptcha(null); up.reset(); setFormKey((k) => k + 1);
  };
  const chip = (on: boolean) => `${s.chip} ${on ? s.on : ""}`;
  const inp = (k: keyof typeof blank, label: React.ReactNode, cls = "", props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`${s.field} ${cls}`}>
      <span className={s.lbl}>{label}</span>
      <input className={s.input} value={f[k]} onChange={set(k)} {...props} />
    </label>
  );

  return (
    <section id="post" className={`${s.postSec} ${s.gut}`}>
      <div className={s.postSecL}>
        <div className={s.eyebrow}>{t("secEyebrow")}</div>
        <h2>{t("secH")}</h2>
        <p>{t("secP")}</p>
      </div>

      <form key={formKey} className={s.postForm} onSubmit={submit} noValidate>
        {!sent ? (
          <>
            <div>
              <div className={s.lab}>{t("org")}</div>
              <div className={s.chips} role="radiogroup">
                {ORGS.list.map(([v, bn, e]) => (
                  <button key={v} type="button" role="radio" aria-checked={org === v} className={chip(org === v)} onClick={() => { setOrg(v); setErr(""); }}>{en ? e : bn}</button>
                ))}
              </div>
            </div>
            <div>
              <div className={s.lab}>{t("type")}</div>
              <div className={s.chips} role="radiogroup">
                {ACTIVITY_TYPES.list.map(([v, bn, e]) => (
                  <button key={v} type="button" role="radio" aria-checked={type === v} className={chip(type === v)} onClick={() => { setType(v); setErr(""); }}>{en ? e : bn}</button>
                ))}
              </div>
            </div>
            <div className={s.row}>
              <label className={s.field}>
                <span className={s.lbl}>{t("level")}</span>
                <select className={s.select} value={f.level} onChange={set("level")}>
                  <option value="">{c("pick")}</option>
                  {LEVELS.list.map(([v, bn, e]) => <option key={v} value={v}>{en ? e : bn}</option>)}
                </select>
              </label>
              {inp("date", t("date"), "", { type: "date", max: new Date().toISOString().slice(0, 10) })}
            </div>
            <div className={s.row}>
              <label className={`${s.field} ${s.w16}`}>
                <span className={s.lbl}>{t("division")}</span>
                <select className={s.select} value={f.division} onChange={set("division")}>
                  <option value="">{c("pick")}</option>
                  {DIVISIONS.map((d) => <option key={d.code} value={d.code}>{en ? d.en : d.bn}</option>)}
                </select>
              </label>
              {abroad ? (
                inp("district", t("districtAbroad"), s.w16, { maxLength: 80 })
              ) : (
                <label className={`${s.field} ${s.w16}`}>
                  <span className={s.lbl}>{t("district")}</span>
                  <select className={s.select} value={f.district} onChange={set("district")} required>
                    <option value="">{c("pick")}</option>
                    {districtsOf(f.division || null).map((d) => <option key={d[0]} value={d[0]}>{en ? d[1] : d[0]}</option>)}
                  </select>
                </label>
              )}
              {inp("thana", t("thana"), s.w16, { placeholder: t("thanaPh"), maxLength: 120, required: true })}
            </div>
            <div className={s.row}>
              {inp("place", t("place"), s.w2, { maxLength: 200 })}
              {inp("people", t("people"), s.w16, { type: "number", min: 1, inputMode: "numeric" })}
            </div>
            <label className={s.field}>
              <span className={s.lbl}>{t("ptitle")}</span>
              <input className={s.input} value={f.title} onChange={set("title")} placeholder={t("ptitlePh")} maxLength={300} required />
            </label>
            <label className={s.field}>
              <span className={s.lbl}>{t("desc")}</span>
              <textarea className={s.textarea} rows={5} value={f.desc} onChange={set("desc")} placeholder={t("descPh")} maxLength={20000} />
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className={s.lbl}>{t("photos")} <em style={{ fontStyle: "normal", fontWeight: 400, color: "#5f5b52" }}>{t("photosMax")}</em></div>
              <div className={s.photos}>
                {up.items.map((x) => (
                  <div key={x.key} className={s.ph} style={{ opacity: x.status === "error" ? 0.4 : 1 }}>
                    <img src={x.preview} alt="" />
                    <button type="button" aria-label={c("remove")} onClick={() => up.remove(x.key)}>×</button>
                    {x.status === "uploading" && <span className={s.pct}><i style={{ width: `${x.progress * 100}%` }} /></span>}
                  </div>
                ))}
                {up.items.length < 6 && (
                  <label
                    className={`${s.phAdd} ${over ? s.over : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                    onDragLeave={() => setOver(false)}
                    onDrop={(e) => { e.preventDefault(); setOver(false); up.add(e.dataTransfer.files); }}
                  >
                    <input type="file" multiple accept="image/*" hidden onChange={(e) => { up.add(e.target.files); e.target.value = ""; }} />
                    <span>{t("addPhoto")}<br />{t("dragHere")}</span>
                  </label>
                )}
              </div>
              <label className={s.field} style={{ marginTop: 6 }}>
                <span className={s.lbl}>{t("links")}</span>
                <textarea className={`${s.textarea} ${s.sm}`} rows={3} value={f.links} onChange={set("links")} placeholder={t("linksPh")} />
              </label>
            </div>

            <div className={s.sep}>
              {inp("name", <>{t("name")} <em style={{ fontStyle: "normal", fontWeight: 400, color: "#5f5b52" }}>{c("optional")}</em></>, "", { maxLength: 120, autoComplete: "off" })}
              {inp("role", <>{t("role")} <em style={{ fontStyle: "normal", fontWeight: 400, color: "#5f5b52" }}>{c("optional")}</em></>, "", { maxLength: 120, placeholder: t("rolePh") })}
            </div>
            <label className={s.check}>
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
              <span>{t("anon")}</span>
            </label>
            <Turnstile key={capKey} onToken={setCaptcha} lang={lang} />
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button type="submit" className={s.btnDark} style={{ minHeight: 52, padding: "0 28px", fontSize: 17 }} disabled={busy}>{busy ? c("sending") : t("submit")}</button>
              <span className={s.errMsg} role="alert">{err}</span>
            </div>
          </>
        ) : (
          <div className={s.sent} aria-live="polite">
            <h3>{t("sentH")}</h3>
            <p>{t("sentP")}</p>
            <div className={s.btns}>
              <button type="button" className={s.btnLine} onClick={again}>{t("again")}</button>
              <a href="#feed" className={s.btnDark}>{t("viewTop")}</a>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
