"use client";
import LangToggle from "@/components/ui/LangToggle";
import { home } from "@/i18n/home";
import { openGive } from "./bus";

export default function Nav({ lang }: { lang: "bn" | "en" }) {
  const t = (k: keyof typeof home) => home[k][lang === "en" ? 1 : 0];
  const give = (k: "bb" | "sh") => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openGive(k, e.currentTarget);
  };
  return (
    <nav id="nav" aria-label={lang === "en" ? "Main" : "প্রধান"}>
      <a className="logo" href="#top">
        <i />
        <span>{t("brand")}</span>
      </a>
      <div className="links">
        <a href="#give-bb" data-give="bb" className="gv" onClick={give("bb")}>
          <span>{t("navBB")}</span>
          <em aria-hidden="true">+</em>
        </a>
        <a href="#give-sh" data-give="sh" className="gv" onClick={give("sh")}>
          <span>{t("navSH")}</span>
          <em aria-hidden="true">+</em>
        </a>
        <a href="/report">{t("navReport")}</a>
        <a href="/dusshomoy">{t("navHard")}</a>
      </div>
      <details className="mobile-nav">
        <summary aria-label={lang === "en" ? "Navigation menu" : "নেভিগেশন মেনু"}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </summary>
        <div onClick={(e) => {
          if ((e.target as Element).closest("a")) e.currentTarget.closest("details")?.removeAttribute("open");
        }}>
          <a href="#history">{lang === "en" ? "History" : "ইতিহাস"}</a>
          <a href="#dev">{lang === "en" ? "Development archive" : "উন্নয়ন আর্কাইভ"}</a>
          <a href="#atlas">{lang === "en" ? "Explore the map" : "মানচিত্র দেখুন"}</a>
          <a href="/contributions">{lang === "en" ? "Published contributions" : "প্রকাশিত অবদান"}</a>
          <a href="/report">{t("navReport")}</a>
          <a href="/report/status">{lang === "en" ? "Track a report" : "অভিযোগের অবস্থা"}</a>
          <a href="/dusshomoy">{t("navHard")}</a>
        </div>
      </details>
      <LangToggle lang={lang} />
      <a className="btn sm light" href="#contribute" data-choose="">
        <span>{t("navSubmit")}</span>
        <span className="ar">→</span>
      </a>
    </nav>
  );
}
