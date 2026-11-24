import "server-only";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { ORGS } from "./labels";
import { DIVISIONS } from "./geo";

export const PAGE = 24;

export const feedQuery = z.object({
  org: z.enum(ORGS.codes as [string, ...string[]]).optional().catch(undefined),
  division: z.enum(DIVISIONS.map((d) => d.code) as [string, ...string[]]).optional().catch(undefined),
  district: z.string().trim().max(80).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  cursor: z.string().max(40).optional().catch(undefined),
});
export type FeedQuery = z.infer<typeof feedQuery>;

export type PostCard = {
  id: string;
  org: string;
  activityType: string;
  level: string | null;
  title: string;
  description: string;
  district: string;
  thana: string;
  place: string | null;
  division: string | null;
  date: string | null;
  participants: number | null;
  links: string[];
  by: string | null; // null = anonymous
  images: { id: string; full: string; thumb: string }[];
};

const where = (q: FeedQuery): Prisma.ActivityPostWhereInput => ({
  status: "APPROVED",
  ...(q.org ? { org: q.org as never } : {}),
  ...(q.division ? { division: q.division as never } : {}),
  ...(q.district ? { district: q.district } : {}),
  ...(q.q
    ? { OR: [{ title: { contains: q.q, mode: "insensitive" } }, { description: { contains: q.q, mode: "insensitive" } }, { thana: { contains: q.q, mode: "insensitive" } }, { district: { contains: q.q, mode: "insensitive" } }] }
    : {}),
});

export async function getFeed(q: FeedQuery): Promise<{ posts: PostCard[]; next: string | null }> {
  const rows = await db.activityPost.findMany({
    where: where(q),
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, PAGE);
  const media = await db.mediaAsset.findMany({
    where: { ownerType: "POST", ownerId: { in: page.map((p) => p.id) }, state: "READY", hidden: false },
    orderBy: { sort: "asc" },
    select: { id: true, ownerId: true },
  });
  return { posts: page.map((p) => toCard(p, media.filter((m) => m.ownerId === p.id))), next: rows.length > PAGE ? page[page.length - 1].id : null };
}

export function toCard(p: Prisma.ActivityPostGetPayload<object>, media: { id: string }[]): PostCard {
  return {
    id: p.id, org: p.org, activityType: p.activityType, level: p.level, title: p.title, description: p.description ?? "",
    district: p.district, thana: p.thana, place: p.place, division: p.division,
    date: p.date ? p.date.toISOString().slice(0, 10) : null, participants: p.participants, links: p.links,
    by: p.anonymous || !p.name ? null : p.name + (p.role ? ", " + p.role : ""),
    images: media.map((m) => ({ id: m.id, full: `/api/media/${m.id}`, thumb: `/api/media/${m.id}?v=thumb` })),
  };
}

/** Counters + org chips + district options. Cached; invalidated on moderation. */
export const getFeedStats = unstable_cache(
  async () => {
    const [total, places, byOrg, byDistrict] = await Promise.all([
      db.activityPost.count({ where: { status: "APPROVED" } }),
      db.activityPost.groupBy({ by: ["district", "thana"], where: { status: "APPROVED" } }),
      db.activityPost.groupBy({ by: ["org"], where: { status: "APPROVED" }, _count: { _all: true } }),
      db.activityPost.groupBy({ by: ["division", "district"], where: { status: "APPROVED" }, _count: { _all: true } }),
    ]);
    return {
      total,
      places: places.length,
      orgs: ORGS.codes.map((o) => ({ org: o, n: byOrg.find((x) => x.org === o)?._count._all ?? 0 })).filter((x) => x.n > 0),
      districts: byDistrict.map((d) => ({ division: d.division, district: d.district, n: d._count._all })),
    };
  },
  ["feed-stats"],
  { tags: ["posts"], revalidate: 300 },
);
