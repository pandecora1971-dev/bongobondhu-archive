import LangToggle from "@/components/ui/LangToggle";
import s from "./forms.module.css";
import { common } from "@/i18n/forms";

export default function SiteHeader({ lang, right }: { lang: "bn" | "en"; right?: React.ReactNode }) {
  const t = (k: keyof typeof common) => common[k][lang === "en" ? 1 : 0];
  return (
    <header className={`${s.header} ${s.gut}`}>
      <a href="/" className={s.brand}>
        <i aria-hidden="true" />
        {t("brand")}
      </a>
      <div className={s.hdrRight}>
        {right}
        <LangToggle lang={lang} className={s.lang} />
        <a href="/" className={s.homeLink}>
          {right ? t("home") : t("backHome")}
        </a>
      </div>
    </header>
  );
}
