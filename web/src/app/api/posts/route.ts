import { NextResponse } from "next/server";
import { feedQuery, getFeed } from "@/lib/posts";
import { rateLimit } from "@/lib/ratelimit";

/** Pagination for the দুঃসময়ের গল্প feed (approved posts only). */
export async function GET(req: Request) {
  if (!(await rateLimit("feed")).ok) return NextResponse.json({ error: "rate" }, { status: 429 });
  const q = feedQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const data = await getFeed(q);
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
