import { getLang } from "@/lib/i18n";
import SiteHeader from "@/components/forms/SiteHeader";
import s from "@/components/forms/forms.module.css";

export default async function NotFound() {
  const lang = await getLang();
  const en = lang === "en";
  return <div className={s.page}>
    <SiteHeader lang={lang} />
    <main className={s.gut} style={{ paddingTop: 80, paddingBottom: 80 }}>
      <p className={s.eyebrow}>404</p>
      <h1 className={s.h1}>{en ? "Page not found" : "পাতাটি পাওয়া যায়নি"}</h1>
      <p className={s.lead}>{en ? "The address may have changed. Explore the archive or search for a topic." : "ঠিকানাটি পরিবর্তিত হয়ে থাকতে পারে। আর্কাইভ দেখুন অথবা বিষয় লিখে খুঁজুন।"}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 28 }}>
        <a className={s.darkBtn} href="/">{en ? "Explore the archive" : "আর্কাইভ দেখুন"}</a>
        <a className={s.homeLink} href="/search">{en ? "Search" : "অনুসন্ধান"}</a>
      </div>
    </main>
  </div>;
}
