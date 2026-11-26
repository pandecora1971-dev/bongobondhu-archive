/**
 * Seed the database from the prototype data files (prisma/seed-data/*.json, converted 1:1 from
 * data.js / img.js / p60.js / catalog.json) plus the constants that lived inline in Homepage v2.html.
 *
 *   npm run db:seed              → seeds content only if the DB is empty; always ensures the first admin
 *   SEED_FORCE=1 npm run db:seed → replaces ALL editable content (never touches submissions)
 */
import { PrismaClient, type OwnerType, type ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PORTRAITS } from "./portraits";

const db = new PrismaClient();
const dir = path.join(__dirname, "seed-data");
const load = <T>(f: string): T => JSON.parse(readFileSync(path.join(dir, f), "utf8"));

type Pair = [string, string];
type ImgRec = { u: string; t: string; a?: string; l?: string };
type Data = {
  slides: Pair[];
  domains: [string, string, string, string, string][];
  chapters: { y: Pair; b: string; e: string; db: string; de: string; ev: [string, string, string, string][] }[];
  stops: { ll: [number, number]; y: Pair; b: string; e: string; db: string; de: string }[];
  projects: { ll: [number, number] | null; s: ProjectStatus; b: string; e: string; l: Pair; y: Pair; db: string; de: string }[];
  cats: { b: string; e: string; it: [string, string, "D" | "P" | "O" | "L" | "A", string][] }[];
  divs: Record<string, Pair>;
  dist: Record<string, string>;
  steps: [string, string, string, string][];
  give: Pair[];
};
type P60 = { t: string; e: string; ph: { u: string; c: string; cr: string; s: string }[] }[];
type Catalog = { projects: { title: string; photos: { url: string; caption: string; credit: string; source: string }[] }[] };

const D = load<Data>("data.json");
const IMG = load<Record<string, ImgRec[]>>("img.json");
const P = load<P60>("p60.json");
const CAT = load<Catalog>("catalog.json");

// credit line exactly as the prototype's cred()
const cred = (o: ImgRec) => `${o.a || "Wikimedia Commons"}${o.l ? " · " + o.l : ""} · Wikimedia Commons`;
const imgRow = (o: ImgRec, ownerType: OwnerType, ownerId: string | null, sort: number, slot?: string) => ({
  state: "READY" as const,
  kind: "IMAGE" as const,
  externalUrl: o.u,
  alt: o.t,
  caption: o.t,
  credit: cred(o),
  license: o.l ?? null,
  ownerType,
  ownerId,
  slot: slot ?? null,
  sort,
});

// ───────── constants that were inline in Homepage v2.html ─────────
// road order (index into D.projects) and the year shown on the road
const ORD = [11, 6, 12, 7, 0, 1, 2, 10, 3, 4, 8, 5, 9];
const YR = ["১৯৯৭", "১৯৯৮", "১৯৯৮", "২০১৮", "২০২২", "২০২২–২৩", "২০২৩", "২০২৩", "২০২৩", "২০২৩", null, null, null];

type FilmSeed = { k?: string; pi?: number; yt?: string; v?: string; c: string; b: string; e: string; s: Pair; db: string; de: string };
const FILMS: FilmSeed[] = [
  { k: "p0", c: "amber", b: "পদ্মা সেতু", e: "Padma Bridge", s: ["সড়ক অংশ চালু · ২৫ জুন ২০২২", "Road deck opened · 25 June 2022"], db: "দক্ষিণ-পশ্চিমাঞ্চলকে রাজধানীর সঙ্গে যুক্ত করা সড়ক ও রেল সেতু।", de: "The road and rail bridge linking the south-west to the capital." },
  { k: "p1", yt: "v3E5XwJ4__o", c: "teal", b: "মেট্রোরেল", e: "Metro Rail", s: ["উত্তরা – মতিঝিল · ২০২২–২৩", "Uttara – Motijheel · 2022–23"], db: "এমআরটি লাইন-৬, দুই ধাপে চালু।", de: "MRT Line-6, opened in two phases." },
  { k: "f300", pi: 5, c: "pink", b: "৩০০ ফিট সড়ক", e: "The 300 Feet Road", s: ["কুড়িল – পূর্বাচল, ঢাকা", "Kuril – Purbachal, Dhaka"], db: "কুড়িল থেকে পূর্বাচলমুখী প্রশস্ত সড়ক করিডোর।", de: "The wide road corridor from Kuril towards Purbachal." },
  { k: "p7", c: "violet", b: "বাংলাদেশ স্যাটেলাইট-১", e: "Bangladesh Satellite-1", s: ["উৎক্ষেপণ · ২০১৮", "Launched · 2018"], db: "দেশের প্রথম যোগাযোগ উপগ্রহ।", de: "The country’s first communications satellite." },
  { k: "p2", v: "https://commons.wikimedia.org/wiki/Special:FilePath/Karnaphuli_Tunnel.webm", c: "blue", b: "কর্ণফুলী টানেল", e: "Karnaphuli Tunnel", s: ["উদ্বোধন · ২৮ অক্টোবর ২০২৩", "Opened · 28 October 2023"], db: "কর্ণফুলী নদীর তলদেশে সড়ক টানেল।", de: "A road tunnel under the Karnaphuli river." },
  { k: "p10", yt: "h5XMR7iG-0I", c: "coral", b: "কক্সবাজার রেল", e: "Cox’s Bazar Railway", s: ["চালু · ২০২৩", "Opened · 2023"], db: "দোহাজারী–কক্সবাজার রেললাইন ও আইকনিক স্টেশন।", de: "The Dohazari–Cox’s Bazar line and its iconic station." },
  { pi: 2, yt: "1ycCO32t3Mw", c: "amber", b: "ঢাকা এলিভেটেড এক্সপ্রেসওয়ে", e: "Dhaka Elevated Expressway", s: ["প্রথম অংশ চালু · ২০২৩", "First section opened · 2023"], db: "বিমানবন্দর থেকে ফার্মগেটমুখী উড়াল সড়ক।", de: "The elevated road from the airport towards Farmgate." },
  { pi: 11, yt: "ei_OjgZecUw", c: "teal", b: "রূপপুর পারমাণবিক বিদ্যুৎকেন্দ্র", e: "Rooppur Nuclear Power Plant", s: ["পাবনা · নির্মাণাধীন", "Pabna · under construction"], db: "দুই ইউনিটের পারমাণবিক বিদ্যুৎকেন্দ্র।", de: "A two-unit nuclear power plant." },
  { pi: 17, yt: "Y9tcpW7XjzY", c: "pink", b: "মাতারবাড়ী বিদ্যুৎকেন্দ্র", e: "Matarbari Power Plant", s: ["মহেশখালী, কক্সবাজার", "Moheshkhali, Cox’s Bazar"], db: "কয়লাভিত্তিক বিদ্যুৎকেন্দ্র ও গভীর সমুদ্রবন্দর প্রকল্প এলাকা।", de: "The coal power plant and deep-sea port project area." },
];

const TERMS: [string, string, string, string, number, string][] = [
  ["১৯৯৬ – ২০০১", "1996 – 2001", "প্রথম মেয়াদ", "First term", 18, "teal"],
  ["২০০৯ – ২০১৪", "2009 – 2014", "দ্বিতীয় মেয়াদ", "Second term", 18, "amber"],
  ["২০১৪ – ২০১৯", "2014 – 2019", "তৃতীয় মেয়াদ", "Third term", 18, "pink"],
  ["২০১৯ – ২০২৪", "2019 – 2024", "চতুর্থ মেয়াদ", "Fourth term", 18, "violet"],
  ["২০২৪", "2024", "পঞ্চম মেয়াদ: জানুয়ারি – ৫ আগস্ট ২০২৪", "Fifth term: January – 5 August 2024", 3, "coral"],
];

const YEARS: [string, string, string, string, string][] = [
  ["১৯৯৬", "গঙ্গা পানি বণ্টন চুক্তি", "Ganges Water Sharing Treaty", "ভারতের সঙ্গে ৩০ বছর মেয়াদি চুক্তি।", "A 30-year treaty with India."],
  ["১৯৯৭", "পার্বত্য চট্টগ্রাম শান্তিচুক্তি", "Chittagong Hill Tracts Peace Accord", "চুক্তি স্বাক্ষরিত; সব ধারা পূর্ণ বাস্তবায়িত হয়নি।", "Signed; not every clause was fully implemented."],
  ["১৯৯৮", "যমুনা সেতু ও কমিউনিটি ক্লিনিক", "Jamuna Bridge and community clinics", "সেতু উদ্বোধন; গ্রামীণ স্বাস্থ্যসেবা কর্মসূচির শুরু।", "The bridge opens; rural healthcare programme begins."],
  ["১৯৯৯", "আন্তর্জাতিক মাতৃভাষা দিবস", "International Mother Language Day", "২১ ফেব্রুয়ারির UNESCO স্বীকৃতি।", "UNESCO recognition of 21 February."],
  ["২০১০", "ইউনিয়ন ডিজিটাল সেন্টার", "Union Digital Centres", "৪,৫০১ ইউনিয়নে চালু।", "Launched in 4,501 unions."],
  ["২০১২", "মিয়ানমারের সঙ্গে সমুদ্রসীমা", "Maritime boundary with Myanmar", "আন্তর্জাতিক ট্রাইব্যুনালের রায়।", "Judgment of the international tribunal."],
  ["২০১৫", "স্থলসীমান্ত চুক্তি বাস্তবায়ন", "Land Boundary Agreement", "ভারতের সঙ্গে ছিটমহল বিনিময়।", "Exchange of enclaves with India."],
  ["২০১৭", "রোহিঙ্গাদের আশ্রয়", "Shelter for the Rohingya", "বাস্তুচ্যুত মানুষের আশ্রয় ও মানবিক সহায়তা।", "Shelter and humanitarian aid for displaced people."],
  ["২০১৮", "বাংলাদেশ স্যাটেলাইট-১", "Bangladesh Satellite-1", "প্রথম যোগাযোগ উপগ্রহ উৎক্ষেপণ।", "Launch of the first communications satellite."],
  ["২০২২", "পদ্মা সেতু ও মেট্রোরেল", "Padma Bridge and Metro Rail", "সেতুর সড়ক অংশ ও মেট্রোর প্রথম ধাপ চালু।", "The bridge road deck and the first metro phase open."],
  ["২০২৩", "টানেল ও কক্সবাজার রেল", "Tunnel and Cox’s Bazar rail", "কর্ণফুলী টানেল ও দোহাজারী–কক্সবাজার রেললাইন।", "Karnaphuli Tunnel and the Dohazari–Cox’s Bazar line."],
  ["২০২৪", "৫ আগস্ট", "5 August", "জুলাই–আগস্ট আন্দোলনের পর ক্ষমতা ছাড়ার ঘটনা।", "Leaving office after the July–August movement."],
];

const V75 = [
  { h: ["ধানমন্ডি ৩২ নম্বর সড়কের বাড়ি", "The house on Road 32, Dhanmondi"], p: [
    ["বঙ্গবন্ধু শেখ মুজিবুর রহমান", "Bangabandhu Sheikh Mujibur Rahman", "রাষ্ট্রপতি", "President"],
    ["বেগম ফজিলাতুন্নেছা মুজিব", "Begum Fazilatunnesa Mujib", "স্ত্রী", "Wife"],
    ["শেখ কামাল", "Sheikh Kamal", "জ্যেষ্ঠ পুত্র", "Eldest son"],
    ["শেখ জামাল", "Sheikh Jamal", "দ্বিতীয় পুত্র", "Second son"],
    ["শেখ রাসেল", "Sheikh Russel", "কনিষ্ঠ পুত্র · বয়স ১০", "Youngest son · aged 10", 1],
    ["সুলতানা কামাল খুকু", "Sultana Kamal Khuku", "শেখ কামালের স্ত্রী", "Wife of Sheikh Kamal"],
    ["পারভীন জামাল রোজী", "Parveen Jamal Rosy", "শেখ জামালের স্ত্রী", "Wife of Sheikh Jamal"],
    ["শেখ আবু নাসের", "Sheikh Abu Naser", "ভাই", "Brother"],
    ["কর্নেল জামিল উদ্দিন আহমেদ", "Colonel Jamil Uddin Ahmed", "রাষ্ট্রপতির সামরিক সচিব", "Military secretary to the President"],
    ["সিদ্দিকুর রহমান", "Siddiqur Rahman", "পুলিশের বিশেষ শাখার কর্মকর্তা", "Special Branch police officer"]] },
  { h: ["শেখ ফজলুল হক মনির বাড়ি", "The house of Sheikh Fazlul Haque Moni"], p: [
    ["শেখ ফজলুল হক মনি", "Sheikh Fazlul Haque Moni", "ভাগ্নে", "Nephew"],
    ["বেগম আরজু মনি", "Begum Arzu Moni", "শেখ মনির স্ত্রী", "Wife of Sheikh Moni"]] },
  { h: ["আবদুর রব সেরনিয়াবাতের বাড়ি", "The house of Abdur Rab Serniabat"], p: [
    ["আবদুর রব সেরনিয়াবাত", "Abdur Rab Serniabat", "ভগ্নিপতি · মন্ত্রী", "Brother-in-law · minister"],
    ["বেবী সেরনিয়াবাত", "Baby Serniabat", "কন্যা", "Daughter"],
    ["আরিফ সেরনিয়াবাত", "Arif Serniabat", "পুত্র", "Son"],
    ["সুকান্ত আবদুল্লাহ বাবু", "Sukanta Abdullah Babu", "নাতি · বয়স ৪", "Grandson · aged 4", 1],
    ["শহীদ সেরনিয়াবাত", "Shahid Serniabat", "ভাইয়ের ছেলে", "Nephew"],
    ["আবদুল নঈম খান রিন্টু", "Abdul Nayeem Khan Rintu", "আত্মীয়", "Relative"]] },
];

const A24: [string, string, string, string][] = [
  ["জুলাই ২০২৪", "July 2024", "সরকারি চাকরিতে কোটা সংস্কারের দাবিতে আন্দোলন শুরু হয়। পরে তা সহিংস রূপ নেয় এবং বহু মানুষ নিহত হন।", "Protests begin over quotas in government jobs. They later turn violent and many people are killed."],
  ["৫ আগস্ট ২০২৪", "5 August 2024", "শেখ হাসিনা প্রধানমন্ত্রীর পদ ছেড়ে দেশত্যাগ করে ভারতে যান। সেনাপ্রধান অন্তর্বর্তী সরকার গঠনের ঘোষণা দেন।", "Sheikh Hasina leaves office and the country for India. The army chief announces an interim government."],
  ["৫ আগস্ট ২০২৪", "5 August 2024", "গণভবনে জনতা ঢুকে পড়ে। ধানমন্ডি ৩২-এর বঙ্গবন্ধু স্মৃতি জাদুঘরে আগুন দেওয়া হয়, বিভিন্ন স্থানে ভাস্কর্য ভাঙচুর হয়।", "Crowds enter Ganabhaban. The Bangabandhu Memorial Museum on Road 32 is set on fire and statues are vandalised."],
  ["৬ আগস্ট ২০২৪", "6 August 2024", "জাতীয় সংসদ বিলুপ্ত ঘোষণা করা হয়।", "Parliament is dissolved."],
  ["৮ আগস্ট ২০২৪", "8 August 2024", "মুহাম্মদ ইউনূসের নেতৃত্বে অন্তর্বর্তী সরকার শপথ নেয়।", "An interim government led by Muhammad Yunus is sworn in."],
  ["৫ ফেব্রুয়ারি ২০২৫", "5 February 2025", "ধানমন্ডি ৩২ নম্বরের বাড়িটি ভেঙে ফেলা হয়।", "The house on Road 32, Dhanmondi is demolished."],
];

async function seedContent() {
  console.log("→ clearing editable content");
  await db.mediaAsset.deleteMany({ where: { ownerType: { in: ["SITE", "CHAPTER", "MILESTONE", "FILM", "PROJECT"] } } });
  await db.timelineEvent.deleteMany();
  await db.historyChapter.deleteMany();
  await db.milestone.deleteMany();
  await db.film.deleteMany();
  await db.project.deleteMany();
  await db.contentBlock.deleteMany();

  console.log("→ content blocks");
  const blocks: Record<string, unknown> = {
    slides: D.slides,
    domains: D.domains.map((d) => ({ titleBn: d[0], titleEn: d[1], descBn: d[2], descEn: d[3], href: d[4] })),
    stops: D.stops.map((s) => ({ lng: s.ll[0], lat: s.ll[1], yBn: s.y[0], yEn: s.y[1], titleBn: s.b, titleEn: s.e, descBn: s.db, descEn: s.de })),
    index: D.cats.map((c) => ({ bn: c.b, en: c.e, items: c.it })),
    steps: D.steps,
    give: D.give,
    terms: TERMS,
    years: YEARS,
    v75: V75,
    a24: A24,
    mapLabels: { divs: D.divs, dist: D.dist },
  };
  for (const [key, data] of Object.entries(blocks)) await db.contentBlock.create({ data: { key, data: data as object } });

  console.log("→ site images (hero, domains)");
  const site: (ReturnType<typeof imgRow> & { sourceUrl?: string })[] = [];
  (IMG.hero ?? []).forEach((o, i) => site.push(imgRow(o, "SITE", null, i, "hero")));
  // prototype: domain card i uses IMG.dom[i], except card 3 (index 2) which has no photo
  (IMG.dom ?? []).forEach((o, i) => { if (i !== 2) site.push(imgRow(o, "SITE", null, i, "dom")); });
  // portraits (PM + 15 August 1975 memorial) — see prisma/portraits.ts
  PORTRAITS.forEach((o) => site.push({ ...imgRow({ u: o.url, t: o.alt, l: o.license } as ImgRec, "SITE", null, 0, o.slot), credit: o.credit, sourceUrl: o.sourceUrl }));
  await db.mediaAsset.createMany({ data: site });

  console.log("→ history chapters + events");
  for (const [i, c] of D.chapters.entries()) {
    const ch = await db.historyChapter.create({
      data: {
        order: i, yearBn: c.y[0], yearEn: c.y[1], titleBn: c.b, titleEn: c.e, descBn: c.db, descEn: c.de,
        events: { create: c.ev.map((v, k) => ({ order: k, dateBn: v[0], dateEn: v[1], textBn: v[2], textEn: v[3] })) },
      },
    });
    await db.mediaAsset.createMany({ data: (IMG["c" + i] ?? []).map((o, k) => imgRow(o, "CHAPTER", ch.id, k)) });
  }

  console.log("→ milestones (road + atlas)");
  for (const [i, p] of D.projects.entries()) {
    const ro = ORD.indexOf(i);
    const m = await db.milestone.create({
      data: {
        order: i, roadOrder: ro >= 0 ? ro : null, roadYearBn: ro >= 0 ? YR[ro] : null, status: p.s,
        titleBn: p.b, titleEn: p.e, placeBn: p.l[0], placeEn: p.l[1], whenBn: p.y[0], whenEn: p.y[1], descBn: p.db, descEn: p.de,
        lng: p.ll?.[0] ?? null, lat: p.ll?.[1] ?? null,
      },
    });
    await db.mediaAsset.createMany({ data: (IMG["p" + i] ?? []).map((o, k) => imgRow(o, "MILESTONE", m.id, k)) });
  }

  console.log("→ 60 projects");
  for (const [i, p] of P.entries()) {
    const pr = await db.project.create({ data: { order: i, titleBn: p.t, titleEn: p.e.replace(/\s*Bangladesh\s*/i, " ").trim() } });
    // working links from p60.js; for the 9 projects with none, fall back to the catalog candidates
    // (`npm run images:import` drops whichever of those turn out to be dead).
    const photos = p.ph.length
      ? p.ph.map((o) => ({ u: o.u, c: o.c, cr: o.cr, s: o.s }))
      : (CAT.projects[i]?.photos ?? []).map((o) => ({ u: o.url, c: o.caption, cr: o.credit, s: o.source }));
    await db.mediaAsset.createMany({
      data: photos.map((o, k) => ({
        state: "READY" as const, kind: "IMAGE" as const, externalUrl: o.u, alt: o.c, caption: o.c, credit: o.cr, sourceUrl: o.s,
        ownerType: "PROJECT" as const, ownerId: pr.id, sort: k,
      })),
    });
  }

  console.log("→ films");
  for (const [i, f] of FILMS.entries()) {
    const film = await db.film.create({
      data: {
        order: i, titleBn: f.b, titleEn: f.e, subBn: f.s[0], subEn: f.s[1], descBn: f.db, descEn: f.de, color: f.c,
        youtubeId: f.yt ?? null, videoUrl: f.v ?? null, projectOrder: f.pi ?? null,
      },
    });
    const own = f.k ? IMG[f.k] ?? [] : [];
    if (own.length) await db.mediaAsset.createMany({ data: own.map((o, k) => imgRow(o, "FILM", film.id, k)) });
  }
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.log("! SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user");
    return;
  }
  if (password.length < 12 || password.startsWith("change")) {
    console.log("! SEED_ADMIN_PASSWORD must be ≥ 12 characters and not the example value — skipping admin user");
    return;
  }
  const exists = await db.adminUser.findUnique({ where: { email } });
  if (exists) return console.log(`✓ admin ${email} already exists`);
  await db.adminUser.create({
    data: { email, name: process.env.SEED_ADMIN_NAME || "Admin", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✓ created admin ${email}`);
}

async function main() {
  const has = await db.historyChapter.count();
  if (has && !process.env.SEED_FORCE) {
    console.log("✓ content already present (set SEED_FORCE=1 to replace it)");
  } else {
    await seedContent();
    const n = await db.mediaAsset.count({ where: { ownerType: { in: ["SITE", "CHAPTER", "MILESTONE", "FILM", "PROJECT"] } } });
    console.log(`✓ content seeded (${n} images on external URLs — run \`npm run images:import\` to copy them into storage)`);
  }
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
