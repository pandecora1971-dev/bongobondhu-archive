"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** বাংলা / English. Writes the `lang` cookie and re-renders server components in place. */
export default function LangToggle({ lang, className = "lang" }: { lang: "bn" | "en"; className?: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const set = (l: "bn" | "en") => {
    if (l === lang) return;
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    start(() => router.refresh());
  };
  return (
    <div className={className} role="group" aria-label="Language">
      <button type="button" className={lang === "bn" ? "on" : ""} aria-pressed={lang === "bn"} onClick={() => set("bn")}>
        বাং
      </button>
      <button type="button" className={lang === "en" ? "on" : ""} aria-pressed={lang === "en"} onClick={() => set("en")}>
        EN
      </button>
    </div>
  );
}
