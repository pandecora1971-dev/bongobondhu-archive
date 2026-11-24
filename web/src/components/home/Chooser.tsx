"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { home } from "@/i18n/home";
import { openGive } from "./bus";
import { useModal } from "./useModal";

/** "কী জমা দিতে চান?" — opened by every [data-choose] button on the page. */
export default function Chooser({ lang }: { lang: "bn" | "en" }) {
  const t = (k: keyof typeof home) => home[k][lang === "en" ? 1 : 0];
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const last = useRef<HTMLElement | null>(null);

  const doOpen = useCallback((src: HTMLElement | null) => {
    last.current = src;
    setOpen(true);
    requestAnimationFrame(() => {
      setShow(true);
      box.current?.querySelector<HTMLElement>(".opts a")?.focus();
    });
  }, []);

  const close = useCallback(() => {
    setShow(false);
    setTimeout(() => setOpen(false), 400);
    last.current?.focus();
  }, []);

  useModal(open, box, close);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("[data-choose]") as HTMLElement | null;
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      doOpen(a);
    };
    const onEvt = (e: Event) => doOpen((e as CustomEvent).detail?.src ?? null);
    document.addEventListener("click", onClick, true);
    window.addEventListener("chooser:open", onEvt);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("chooser:open", onEvt);
    };
  }, [doOpen]);

  const go = (k: "bb" | "sh") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShow(false);
    setTimeout(() => setOpen(false), 400);
    setTimeout(() => openGive(k, document.querySelector(`.links [data-give="${k}"]`) ?? document.getElementById(`give-${k}`)), 420);
  };

  return (
    <div id="ch" className={`${open ? "open" : ""} ${show ? "show" : ""}`} role="dialog" aria-modal="true" aria-labelledby="chT" hidden={!open}>
      <div className="scr" onClick={close} />
      <div className="box" ref={box}>
        <div className="hd">
          <div>
            <h3 id="chT">{t("chT")}</h3>
            <p>{t("chSub")}</p>
          </div>
          <button className="x" type="button" aria-label={t("chClose")} onClick={close}>
            ×
          </button>
        </div>
        <div className="opts">
          <a href="#give-bb" onClick={go("bb")} style={{ "--c": "var(--amber)" } as CSSProperties}>
            <b>{t("chBB")}</b>
            <span>{t("chBBs")}</span>
            <i aria-hidden="true">→</i>
          </a>
          <a href="#give-sh" onClick={go("sh")} style={{ "--c": "var(--teal)" } as CSSProperties}>
            <b>{t("chSH")}</b>
            <span>{t("chSHs")}</span>
            <i aria-hidden="true">→</i>
          </a>
          <a href="/report" style={{ "--c": "var(--coral)" } as CSSProperties}>
            <b>{t("chRep")}</b>
            <span>{t("chReps")}</span>
            <i aria-hidden="true">→</i>
          </a>
          <a href="/dusshomoy" style={{ "--c": "var(--violet)" } as CSSProperties}>
            <b>{t("chHard")}</b>
            <span>{t("chHards")}</span>
            <i aria-hidden="true">→</i>
          </a>
        </div>
      </div>
    </div>
  );
}
