import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { z } from "zod";
import type { MediaAsset, OwnerType } from "@prisma/client";
import { db } from "./db";
import { mediaUrl } from "./media";

// ───────────────────────────── ContentBlock schemas (admin-editable JSON) ─────────────────────────────

const pair = z.tuple([z.string(), z.string()]);

export const BLOCKS = {
  slides: { title: "হিরো ক্যাপশন (Hero captions)", schema: z.array(pair) },
  domains: {
    title: "চারটি ক্ষেত্র (Four domains)",
    schema: z.array(z.object({ titleBn: z.string(), titleEn: z.string(), descBn: z.string(), descEn: z.string(), href: z.string() })),
  },
  stops: {
    title: "অ্যাটলাস: ইতিহাসের স্থান (Atlas history stops)",
    schema: z.array(
      z.object({ lng: z.number(), lat: z.number(), yBn: z.string(), yEn: z.string(), titleBn: z.string(), titleEn: z.string(), descBn: z.string(), descEn: z.string() }),
    ),
  },
  index: {
    title: "পূর্ণ সূচি (Full index by sector)",
    schema: z.array(z.object({ bn: z.string(), en: z.string(), items: z.array(z.tuple([z.string(), z.string(), z.enum(["D", "P", "O", "L", "A"]), z.string()])) })),
  },
  steps: { title: "অভিযোগ যাচাইয়ের ধাপ (Incident review steps)", schema: z.array(z.tuple([z.string(), z.string(), z.string(), z.string()])) },
  give: { title: "অবদানের ধরন — মারকি (Contribution marquee)", schema: z.array(pair) },
  terms: {
    title: "প্রধানমন্ত্রীর মেয়াদ (PM terms)",
    schema: z.array(z.tuple([z.string(), z.string(), z.string(), z.string(), z.number(), z.string()])),
  },
  years: { title: "গুরুত্বপূর্ণ বছর (Key years)", schema: z.array(z.tuple([z.string(), z.string(), z.string(), z.string(), z.string()])) },
  v75: {
    title: "১৫ আগস্ট ১৯৭৫ — স্মরণে (In memory)",
    schema: z.array(
      z.object({
        h: pair,
        p: z.array(z.union([z.tuple([z.string(), z.string(), z.string(), z.string()]), z.tuple([z.string(), z.string(), z.string(), z.string(), z.number()])])),
      }),
    ),
  },
  a24: { title: "জুলাই – আগস্ট ২০২৪ (Timeline)", schema: z.array(z.tuple([z.string(), z.string(), z.string(), z.string()])) },
  mapLabels: {
    title: "মানচিত্রের নাম (Map labels)",
    schema: z.object({ divs: z.record(z.string(), pair), dist: z.record(z.string(), z.string()) }),
  },
} as const;

export type BlockKey = keyof typeof BLOCKS;
type BlockData<K extends BlockKey> = z.infer<(typeof BLOCKS)[K]["schema"]>;

// ───────────────────────────── image shape handed to components ─────────────────────────────

export type Img = {
  id: string;
  src: string;
  thumb: string;
  local: boolean; // processed & served by us (→ next/image) vs. external seed URL
  alt: string;
  credit: string;
  caption: string;
  sourceUrl: string;
  w: number | null;
  h: number | null;
  sort: number;
};

export const toImg = (a: MediaAsset): Img => ({
  id: a.id,
  src: mediaUrl(a, "full"),
  thumb: mediaUrl(a, "thumb"),
  local: !!a.key,
  alt: a.alt ?? a.caption ?? "",
  credit: a.credit ?? "",
  caption: a.caption ?? "",
  sourceUrl: a.sourceUrl ?? "",
  w: a.width,
  h: a.height,
  sort: a.sort,
});

function group(assets: MediaAsset[], type: OwnerType) {
  const m = new Map<string, Img[]>();
  for (const a of assets) {
    if (a.ownerType !== type || !a.ownerId) continue;
    const arr = m.get(a.ownerId) ?? [];
    arr.push(toImg(a));
    m.set(a.ownerId, arr);
  }
  return m;
}

// ───────────────────────────── homepage loader ─────────────────────────────

async function loadHome() {
  const [blocks, chapters, milestones, films, projects, assets] = await Promise.all([
    db.contentBlock.findMany(),
    db.historyChapter.findMany({ orderBy: { order: "asc" }, include: { events: { orderBy: { order: "asc" } } } }),
    db.milestone.findMany({ orderBy: { order: "asc" } }),
    db.film.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    db.project.findMany({ orderBy: { order: "asc" } }),
    db.mediaAsset.findMany({
      where: { state: "READY", hidden: false, ownerType: { in: ["SITE", "CHAPTER", "MILESTONE", "FILM", "PROJECT"] } },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const block = <K extends BlockKey>(k: K): BlockData<K> => {
    const b = blocks.find((x) => x.key === k);
    const p = BLOCKS[k].schema.safeParse(b?.data);
    if (p.success) return p.data as BlockData<K>;
    return (k === "mapLabels" ? { divs: {}, dist: {} } : []) as BlockData<K>;
  };

  const site = (slot: string) => assets.filter((a) => a.ownerType === "SITE" && a.slot === slot).map(toImg);
  const byChapter = group(assets, "CHAPTER");
  const byMilestone = group(assets, "MILESTONE");
  const byFilm = group(assets, "FILM");
  const byProject = group(assets, "PROJECT");

  const projectsOut = projects.map((p) => ({ ...p, photos: byProject.get(p.id) ?? [] }));

  return {
    slides: block("slides"),
    domains: block("domains"),
    stops: block("stops"),
    index: block("index"),
    steps: block("steps"),
    give: block("give"),
    terms: block("terms"),
    years: block("years"),
    v75: block("v75"),
    a24: block("a24"),
    mapLabels: block("mapLabels"),
    heroImages: site("hero"),
    domainImages: site("dom"),
    pmPortrait: site("pm")[0] ?? null,
    v75Photos: Object.fromEntries(assets.filter((a) => a.ownerType === "SITE" && a.slot?.startsWith("v75-")).map((a) => [a.slot!, toImg(a)])),
    chapters: chapters.map((c) => ({ ...c, images: byChapter.get(c.id) ?? [] })),
    milestones: milestones.map((m) => ({ ...m, images: byMilestone.get(m.id) ?? [] })),
    films: films.map((f) => {
      const own = byFilm.get(f.id) ?? [];
      const fallback = f.projectOrder != null ? projectsOut.find((p) => p.order === f.projectOrder)?.photos ?? [] : [];
      return { ...f, images: own.length ? own : fallback };
    }),
    projects: projectsOut,
  };
}

export const getHome = unstable_cache(loadHome, ["home-v1"], { tags: ["home"], revalidate: 3600 });
export type Home = Awaited<ReturnType<typeof loadHome>>;

export const invalidateHome = () => revalidateTag("home");
