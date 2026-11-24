"use client";
import { useState } from "react";
import s from "./forms.module.css";
import { status as S, common as C } from "@/i18n/forms";
import { PROGRESS } from "@/lib/labels";
import { fmtDate } from "@/lib/bn";
import { addFollowup, lookupStatus, type StatusView } from "@/app/actions/public";
import Turnstile, { captchaRequired } from "./Turnstile";

export default function StatusLookup({ lang }: { lang: "bn" | "en" }) {
  const en = lang === "en";
  const t = (k: keyof typeof S) => S[k][en ? 1 : 0];
  const c = (k: keyof typeof C) => C[k][en ? 1 : 0];
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [view, setView] = useState<StatusView | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [capKey, setCapKey] = useState(0);

  const fail = (e: string) => setErr(e === "notfound" ? t("notFound") : e === "invalid" ? t("invalid") : e === "rate" ? c("eRate") : e === "captcha" ? c("eCaptcha") : c("eServer"));

  const look = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await lookupStatus({ code, secret });
      if (r.ok) setView(r.view);
      else fail(r.error);
    } catch {
      fail("server");
    } finally {
      setBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    if (captchaRequired && !captcha) return setErr(c("eCaptcha"));
    setBusy(true);
    setErr("");
    try {
      const r = await addFollowup({ code, secret, message: msg, captcha: captcha ?? undefined });
      setCaptcha(null);
      setCapKey((k) => k + 1); // token used either way
      if (r.ok) {
        setView(r.view);
        setMsg("");
        setNote(t("added"));
      } else fail(r.error);
    } catch {
      fail("server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`${s.main} ${s.gut}`}>
      <div className={s.card} style={{ maxWidth: 760, flex: "1 1 520px" }}>
        {!view ? (
          <form className={s.cardIn} onSubmit={look}>
            <div className={s.step}>
              <div className={s.row}>
                <label className={s.field}>
                  <span className={s.lbl}>{t("code")}</span>
                  <input className={s.input} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={9} required style={{ letterSpacing: ".08em" }} />
                </label>
                <label className={s.field}>
                  <span className={s.lbl}>{t("secret")}</span>
                  <input className={s.input} value={secret} onChange={(e) => setSecret(e.target.value.toUpperCase())} type="password" autoComplete="off" spellCheck={false} maxLength={6} required style={{ letterSpacing: ".12em" }} />
                </label>
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <button className={s.btnDark} disabled={busy}>{busy ? c("sending") : t("check")}</button>
                <span className={s.errMsg} role="alert">{err}</span>
              </div>
            </div>
          </form>
        ) : (
          <div className={s.cardIn}>
            <div className={s.step} style={{ gap: 24 }}>
              <div>
                <div className={s.stepNo}>{t("code")}: {view.code}</div>
                <h2 className={s.h2}>{t("current")}: <span className={s.badge}>{PROGRESS.label(view.progress as never, lang)}</span></h2>
                <p className={s.sub}>{t("submitted")}: {fmtDate(view.createdAt, lang)} · {t("updated")}: {fmtDate(view.updatedAt, lang)}</p>
              </div>
              <div>
                <div className={s.lab}>{t("history")}</div>
                <ol className={s.timeline}>
                  {view.updates.map((u, i) => (
                    <li key={i} className={u.fromPublic ? "" : s.pub}>
                      <small>{fmtDate(u.at, lang)} · {u.fromPublic ? t("you") : t("reviewer")}{u.progress ? ` · ${PROGRESS.label(u.progress as never, lang)}` : ""}</small>
                      <span style={{ whiteSpace: "pre-wrap" }}>{u.message}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: "1px solid #ddd7cb" }}>
                <label className={s.field}>
                  <span className={s.lbl}>{t("addH")}</span>
                  <textarea className={s.textarea} rows={4} value={msg} maxLength={10000} placeholder={t("addPh")} onChange={(e) => { setMsg(e.target.value); setNote(""); }} />
                </label>
                <Turnstile key={capKey} onToken={setCaptcha} lang={lang} />
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <button className={s.btnDark} disabled={busy || !msg.trim()}>{busy ? c("sending") : t("addBtn")}</button>
                  <span className={s.errMsg} role="alert">{err || <span style={{ color: "oklch(0.42 0.1 160)" }}>{note}</span>}</span>
                </div>
              </form>
              <a href="/report" className={s.btnLine} style={{ alignSelf: "flex-start" }}>{t("newReport")}</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
