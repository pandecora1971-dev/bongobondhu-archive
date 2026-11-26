/**
 * Portraits for the homepage SITE slots that had none:
 *  - "pm"         → the PM portrait section
 *  - "v75-g-k"    → 15 August 1975 memorial cards (group g, person k — same order as V75 in seed.ts)
 *
 * Only images whose source names the exact person were used (Wikimedia Commons, Bangla Wikipedia,
 * Banglapedia, and an Ekushey TV title card captioned with the name). The last two are copyrighted
 * and stay external links — do not copy them into our storage without permission.
 * No verifiable photo was found for: Parveen Jamal Rosy (v75-0-6), Siddiqur Rahman (v75-0-9),
 * Begum Arzu Moni (v75-1-1) and the Serniabat household except Abdur Rab Serniabat (v75-2-1..5);
 * those keep the neutral placeholder until an admin uploads one (/admin/content).
 */
export type Portrait = {
  slot: string;
  /** stable link; Special:FilePath redirects to a resized copy of the current file */
  url: string;
  alt: string;
  credit: string;
  license: string;
  sourceUrl: string;
};

const commons = (file: string, w = 600) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;
const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;
const bnwiki = (file: string, w = 600) => `https://bn.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;
const bnwikiPage = (file: string) => `https://bn.wikipedia.org/wiki/চিত্র:${encodeURIComponent(file)}`;

const c = (slot: string, file: string, alt: string, license: string, w?: number): Portrait => ({
  slot, url: commons(file, w), alt, credit: "Wikimedia Commons", license, sourceUrl: commonsPage(file),
});
const bn = (slot: string, file: string, alt: string): Portrait => ({
  slot, url: bnwiki(file), alt, credit: "বাংলা উইকিপিডিয়া", license: "যথার্থ ব্যবহার (fair use)", sourceUrl: bnwikiPage(file),
});

export const PORTRAITS: Portrait[] = [
  c("pm", "Portrait_of_Sheikh_Hasina.jpg", "শেখ হাসিনার আনুষ্ঠানিক প্রতিকৃতি", "Public domain", 900),
  // ধানমন্ডি ৩২
  c("v75-0-0", "Official_Portrait_of_Bangabandhu_Sheikh_Mujibur_Rahman.jpg", "বঙ্গবন্ধু শেখ মুজিবুর রহমান", "Public domain"),
  c("v75-0-1", "Sheikh_Mujib_and_Begum_Mujib_circa_1955_(cropped).jpg", "বেগম ফজিলাতুন্নেছা মুজিব", "Public domain"),
  c("v75-0-2", "Sheikh-Kamal-222-1167x660.jpg", "শেখ কামাল", "CC BY-SA 4.0"),
  c("v75-0-3", "Sheikh_Jamal_and_Kader_Siddique.jpg", "শেখ জামাল (ডানে)", "GFDL"),
  bn("v75-0-4", "শেখ রাসেল (১৯৬৪-১৯৭৫).jpg", "শেখ রাসেল"),
  c("v75-0-5", "Sultana_Kamal_Khuki.jpg", "সুলতানা কামাল খুকু", "CC0"),
  bn("v75-0-8", "জামিল উদ্দিন আহমেদ.jpg", "কর্নেল জামিল উদ্দিন আহমেদ"),
  {
    slot: "v75-0-7", url: "https://www.ekushey-tv.com/media/imgAll/2020June/S-up-2309020854.jpg", alt: "শেখ আবু নাসের (১৯২৮–১৯৭৫)",
    credit: "একুশে টেলিভিশন", license: "© একুশে টেলিভিশন", sourceUrl: "https://www.ekushey-tv.com/special-personality/1360873111111134122",
  },
  // শেখ মনির বাড়ি
  bn("v75-1-0", "শেখ ফজলুল হক মনি.jpg", "শেখ ফজলুল হক মনি"),
  // সেরনিয়াবাতের বাড়ি
  {
    slot: "v75-2-0", url: "https://en.banglapedia.org/images/8/86/SerniabatAbdurRab.jpg", alt: "আবদুর রব সেরনিয়াবাত",
    credit: "বাংলাপিডিয়া", license: "© বাংলাদেশ এশিয়াটিক সোসাইটি", sourceUrl: "https://en.banglapedia.org/index.php/Serniabat,_Abdur_Rab",
  },
];

/** where to centre the circular crop when the subject is not in the middle of the photo */
export const FOCUS: Record<string, { x: number; y: number; zoom?: number }> = {
  "v75-0-3": { x: 64, y: 36, zoom: 2.8 }, // Sheikh Jamal stands on the right of a two-person photo
  "v75-0-2": { x: 54, y: 42, zoom: 1.5 },
  "v75-0-7": { x: 27, y: 48, zoom: 1.7 }, // portrait sits on the left of a title card
};
