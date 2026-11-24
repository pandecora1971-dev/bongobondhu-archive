import type { Metadata } from "next";
import { getLang, translator } from "@/lib/i18n";
import { report } from "@/i18n/forms";
import SiteHeader from "@/components/forms/SiteHeader";
import ReportWizard from "@/components/forms/ReportWizard";
import s from "@/components/forms/forms.module.css";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // image processing in the submit action
export const metadata: Metadata = { title: "বেনামে অভিযোগ জানান", robots: { index: false } };

export default async function ReportPage() {
  const lang = await getLang();
  const t = translator(report, lang);
  return (
    <div className={s.page}>
      <SiteHeader lang={lang} />
      <section className={`${s.hero} ${s.gut}`}>
        <div style={{ flex: "1 1 520px", maxWidth: 760 }}>
          <div className={s.eyebrow}>{t("eyebrow")}</div>
          <h1 className={s.h1}>
            {t("h1a")}
            <em>{t("h1em")}</em>
            {t("h1b")}
          </h1>
          <p className={s.lead}>{t("lead")}</p>
        </div>
        <ul className={s.points}>
          <li>{t("p1")}</li>
          <li>{t("p2")}</li>
          <li>{t("p3")}</li>
        </ul>
      </section>
      <div className={s.gut}>
        <div className={s.sos} role="note">{t("sos")}</div>
      </div>
      <ReportWizard lang={lang} />
    </div>
  );
}
