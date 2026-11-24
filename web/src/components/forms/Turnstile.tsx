"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    __tsLoad?: Promise<void>;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

function load() {
  if (window.turnstile) return Promise.resolve();
  return (window.__tsLoad ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("turnstile"));
    document.head.appendChild(s);
  }));
}

/** Cloudflare Turnstile widget. Renders nothing when no site key is configured (dev). */
export default function Turnstile({ onToken, lang = "bn", theme = "light" }: { onToken: (t: string | null) => void; lang?: "bn" | "en"; theme?: "light" | "dark" }) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !el.current) return;
    let id: string | undefined;
    let dead = false;
    load()
      .then(() => {
        if (dead || !el.current || !window.turnstile) return;
        id = window.turnstile.render(el.current, {
          sitekey: SITE_KEY,
          language: lang === "en" ? "en" : "bn",
          theme,
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      dead = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [lang, theme]);

  if (!SITE_KEY) return null;
  return <div ref={el} style={{ minHeight: 65 }} />;
}

export const captchaRequired = !!SITE_KEY;
