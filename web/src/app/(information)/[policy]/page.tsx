import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/forms/SiteHeader";
import { getLang } from "@/lib/i18n";
import s from "@/components/forms/forms.module.css";

type Pair = [string, string];
type Policy = { title: Pair; intro: Pair; sections: { title: Pair; text: Pair }[] };
const pages: Record<string, Policy> = {
  privacy: {
    title: ["গোপনীয়তা নীতি", "Privacy policy"],
    intro: ["কোন তথ্য সংগ্রহ হয়, কে তা দেখতে পারেন এবং প্রকাশের আগে কীভাবে যাচাই হয়।", "What we collect, who can access it, and how publication is reviewed."],
    sections: [
      { title: ["আপনার পাঠানো তথ্য", "Information you submit"], text: ["অবদান, অভিযোগ বা কার্যক্রমের বিবরণ এবং সংযুক্ত ফাইল সংরক্ষণ করা হয়। নাম ও যোগাযোগের তথ্য ঐচ্ছিক। প্রয়োজনের অতিরিক্ত ব্যক্তিগত তথ্য পাঠাবেন না।", "We store contribution, report and activity details and their attachments. Names and contact details are optional. Submit only the personal information needed for your record."] },
      { title: ["ব্যক্তিগত অভিযোগ", "Private reports"], text: ["অভিযোগ ও সংশ্লিষ্ট প্রমাণ জনসমক্ষে প্রকাশ করা হয় না। অনুমতিপ্রাপ্ত প্রশাসকরা তা পর্যালোচনা করেন। যোগাযোগের তথ্য ও ভুক্তভোগীর নাম এনক্রিপ্ট করে সংরক্ষণ করা হয়; অনুমোদিত ব্যক্তিগত তথ্য দেখার ঘটনাও লগে থাকে।", "Reports and their evidence are not published. Administrators with the relevant permissions review them. Contact details and victim names are encrypted at rest, and access to protected personal information is logged."] },
      { title: ["ছবি ও অন্যান্য ফাইল", "Images and other files"], text: ["সার্ভারে প্রক্রিয়াকৃত ছবির EXIF ও GPS তথ্য সরানো হয়। ভিডিও, অডিও ও PDF-এর মেটাডেটা স্বয়ংক্রিয়ভাবে সরানো হয় না। পাঠানোর আগে ফাইলের দৃশ্যমান ও গোপন ব্যক্তিগত তথ্য পরীক্ষা করুন।", "Processed images have EXIF and GPS metadata removed. Video, audio and PDF metadata is not automatically removed. Review both visible content and embedded personal information before uploading."] },
      { title: ["কুকি ও বাইরের সেবা", "Cookies and external services"], text: ["ভাষা পছন্দ এবং প্রশাসকের সেশনের জন্য কুকি ব্যবহৃত হয়। অপব্যবহার ঠেকাতে IP-এর পরিবর্তে স্বল্পমেয়াদি সল্টযুক্ত হ্যাশ ব্যবহৃত হয়। হোস্টিং, CAPTCHA ও এমবেড করা ভিডিওর সেবাদাতাদের নিজস্ব নীতি প্রযোজ্য; সম্পূর্ণ পরিচয় গোপন থাকার নিশ্চয়তা দেওয়া হয় না।", "Cookies remember language preferences and administrator sessions. Abuse protection uses short-lived salted hashes rather than storing raw IP addresses in the application. Hosting, CAPTCHA and embedded video providers have their own policies; complete anonymity cannot be guaranteed."] },
      { title: ["সংশোধন বা অপসারণের অনুরোধ", "Corrections or removal requests"], text: ["অবদান ফর্মে সংশ্লিষ্ট প্রকাশিত পাতার লিংক এবং অনুরোধের কারণ লিখে পাঠান। ব্যক্তিগত অভিযোগের অনুসরণে ট্র্যাকিং কোড ও গোপন কী ব্যবহার করুন; প্রকাশ্য অবদানে এই কী পাঠাবেন না।", "Use the contribution form to send the published page URL and explain a correction or removal request. For a private report, use its tracking code and secret key on the status page. Never include that key in a public contribution."] },
    ],
  },
  editorial: {
    title: ["সম্পাদনা ও যাচাই নীতি", "Editorial policy"],
    intro: ["উৎস, প্রেক্ষাপট এবং প্রমাণের ভিত্তিতে আর্কাইভ গড়ে তোলার নীতি।", "An archive built around sources, context and evidence."],
    sections: [
      { title: ["প্রকাশের আগে পর্যালোচনা", "Review before publication"], text: ["সকল জনসাধারণের জমা প্রথমে পর্যালোচনাধীন থাকে। প্রশাসকের অনুমোদনের পর অবদান ও কার্যক্রম প্রকাশিত হতে পারে। অভিযোগ কখনো প্রকাশ্য ফিডে যায় না।", "Every public submission starts pending review. Contributions and activity posts may be published after administrator approval. Complaints never enter a public feed."] },
      { title: ["উৎস ও প্রেক্ষাপট", "Sources and context"], text: ["সম্ভব হলে মূল নথি, প্রকাশনার তারিখ ও উৎসের লিংক যুক্ত করুন। ছবি ও ভিডিওর স্থান, সময় এবং মালিকানা যাচাইযোগ্য হওয়া দরকার। কোনো অবদানের অনুমোদন তার প্রতিটি দাবির স্বাধীন সত্যতা নিশ্চিত করে না।", "Include primary documents, publication dates and source links where available. Photo and video location, date and ownership should be verifiable. Approval of a contribution does not independently establish every claim it contains."] },
      { title: ["অভিযোগ ও বিচারিক সিদ্ধান্ত", "Allegations and legal findings"], text: ["কারও বিরুদ্ধে পাঠানো বিবরণ একটি অভিযোগ; আদালতের সিদ্ধান্তের বিকল্প নয়। অপ্রয়োজনীয় ব্যক্তিগত পরিচয়, হুমকি এবং যাচাইহীন মানহানিকর তথ্য প্রকাশ করা উচিত নয়।", "A submitted allegation is not a judicial finding. Unnecessary personal identifiers, threats and unverified defamatory claims should not be published."] },
      { title: ["সংশোধন", "Corrections"], text: ["ভুল বা অসম্পূর্ণ তথ্য পেলে অবদান ফর্মে পাতার লিংক, ভুলের বিবরণ এবং সহায়ক উৎস দিন। পর্যালোচনার ভিত্তিতে তথ্য সংশোধন, প্রত্যাহার বা আড়াল করা যেতে পারে।", "Report errors through the contribution form with the page URL, a description of the error and supporting sources. Review may result in a correction, withdrawal or redaction."] },
    ],
  },
  about: {
    title: ["আর্কাইভ পরিচিতি", "About the archive"],
    intro: ["বঙ্গবন্ধু ও বাংলাদেশ: ইতিহাস, উন্নয়ন এবং নাগরিকদের পাঠানো নথির একটি ডিজিটাল আর্কাইভ।", "Bongobondhu & Bangladesh: a digital archive of history, development and citizen-submitted records."],
    sections: [
      { title: ["কী আছে এখানে", "What you can explore"], text: ["ইতিহাসের সময়রেখা, উন্নয়ন প্রকল্প, ভিডিও, মানচিত্র এবং পর্যালোচনার পর প্রকাশিত নাগরিক অবদান এখানে খুঁজে পাওয়া যায়। বাংলা ও ইংরেজি দুই ভাষায় সাইট ব্যবহার করা যায়।", "Explore historical timelines, development projects, films, a Bangladesh map and reviewed public contributions. The site is available in Bangla and English."] },
      { title: ["আপনার অবদান", "Your contribution"], text: ["তথ্য, ছবি বা নথি পাঠাতে হোমপেজের অবদান ফর্ম ব্যবহার করুন। সম্ভব হলে উৎস যুক্ত করুন এবং প্রকাশের অনুমতি আছে এমন ফাইল পাঠান।", "Use the homepage contribution form to submit information, photographs or documents. Include sources where possible and upload only material you have permission to share."] },
      { title: ["জরুরি সেবা নয়", "Not an emergency service"], text: ["এই আর্কাইভের অভিযোগ ফর্ম জরুরি সেবা বা আনুষ্ঠানিক আইনি অভিযোগের বিকল্প নয়। কোনো তাৎক্ষণিক বিপদে স্থানীয় জরুরি সেবার সহায়তা নিন।", "The archive report form is not an emergency service or a substitute for a formal legal complaint. In immediate danger, contact local emergency services."] },
    ],
  },
  terms: {
    title: ["ব্যবহারের শর্ত", "Terms of use"],
    intro: ["আর্কাইভ দেখা এবং তথ্য পাঠানোর সাধারণ শর্ত।", "General conditions for browsing and submitting material."],
    sections: [
      { title: ["দায়িত্বশীল ব্যবহার", "Responsible use"], text: ["ইচ্ছাকৃত মিথ্যা তথ্য, হুমকি, স্প্যাম বা অনুমতিবিহীন ব্যক্তিগত তথ্য পাঠাবেন না। আপনার পাঠানো ফাইল শেয়ার করার অধিকার আপনার থাকতে হবে।", "Do not submit deliberately false information, threats, spam or unauthorized personal information. You must have the right to share uploaded material."] },
      { title: ["প্রকাশ ও পর্যালোচনা", "Publication and review"], text: ["জমা দেওয়া মানেই প্রকাশ নয়। সম্পাদকেরা অবদান প্রত্যাখ্যান, সংশোধন, আড়াল বা প্রত্যাহার করতে পারেন। কোনো বিচারিক সিদ্ধান্তের বিকল্প হিসেবে এই সাইটের তথ্য ব্যবহার করবেন না।", "Submission does not guarantee publication. Editors may reject, correct, redact or withdraw material. Do not treat archive content as a substitute for a judicial finding."] },
      { title: ["কপিরাইট ও বাইরের লিংক", "Copyright and external links"], text: ["ছবি, নথি ও ভিডিওর অধিকার সংশ্লিষ্ট অধিকারীর। প্রকাশিত হওয়া মানেই অবাধ পুনর্ব্যবহারের অনুমতি নয়। পুনর্ব্যবহারের আগে মূল উৎসের লাইসেন্স দেখুন। বাইরের সাইটের বিষয়বস্তু তাদের নিজস্ব নিয়ন্ত্রণে থাকে।", "Photographs, documents and films remain subject to their owners’ rights. Publication here does not grant unrestricted reuse. Check the original source license before reuse. External websites control their own content."] },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ policy: string }> }): Promise<Metadata> {
  const slug = (await params).policy;
  const page = Object.hasOwn(pages, slug) ? pages[slug] : undefined;
  if (!page) return {};
  const en = (await getLang()) === "en";
  return { title: page.title[en ? 1 : 0], description: page.intro[en ? 1 : 0] };
}

export default async function InformationPage({ params }: { params: Promise<{ policy: string }> }) {
  const slug = (await params).policy;
  const page = Object.hasOwn(pages, slug) ? pages[slug] : undefined;
  if (!page) notFound();
  const lang = await getLang();
  const i = lang === "en" ? 1 : 0;
  return <div className={s.page}>
    <SiteHeader lang={lang} />
    <main id="main-content" className={s.gut} style={{ paddingTop: 56, paddingBottom: 80 }}>
      <article style={{ maxWidth: 780, margin: "0 auto" }}>
        <p className={s.eyebrow}>{lang === "en" ? "Bongobondhu & Bangladesh" : "বঙ্গবন্ধু ও বাংলাদেশ"}</p>
        <h1 className={s.h1}>{page.title[i]}</h1>
        <p className={s.lead}>{page.intro[i]}</p>
        {page.sections.map((section, k) => <section key={k} style={{ marginTop: 36, paddingTop: 28, borderTop: "1px solid #ddd7cb" }}>
          <h2 className={s.h2}>{section.title[i]}</h2>
          <p style={{ marginTop: 14, color: "#4a473f" }}>{section.text[i]}</p>
        </section>)}
        <nav aria-label={lang === "en" ? "Archive policies" : "আর্কাইভের নীতিমালা"} style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", marginTop: 48, paddingTop: 24, borderTop: "1px solid #ddd7cb" }}>
          {Object.entries(pages).map(([path, p]) => <a key={path} href={`/${path}`} aria-current={path === slug ? "page" : undefined}>{p.title[i]}</a>)}
        </nav>
      </article>
    </main>
  </div>;
}
