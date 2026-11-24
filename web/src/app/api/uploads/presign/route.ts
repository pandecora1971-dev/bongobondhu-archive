import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { randomToken, sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/ratelimit";
import { sameOrigin } from "@/lib/request";
import { presignSchema } from "@/lib/validation";
import { UPLOAD_RULES, kindFromMime } from "@/lib/upload-rules";
import { readLimitedBody, BodyTooLarge } from "@/lib/request-body";

export const runtime = "nodejs";

/**
 * Step 1 of an upload. Creates a PENDING MediaAsset under incoming/ and returns a presigned PUT.
 * The browser gets a one-time token; only its hash is stored. The form later sends {id, token}.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "origin" }, { status: 403 });
  if (!(await rateLimit("presign")).ok) return NextResponse.json({ error: "rate" }, { status: 429 });
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(await readLimitedBody(req, 8192)));
  } catch (e) {
    return NextResponse.json({ error: "invalid" }, { status: e instanceof BodyTooLarge ? 413 : 400 });
  }
  const p = presignSchema.safeParse(input);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const rule = UPLOAD_RULES[p.data.purpose];
  const kind = kindFromMime(p.data.type);
  if (!kind || !rule.kinds.includes(kind)) return NextResponse.json({ error: "type" }, { status: 415 });
  if (p.data.size > rule.maxBytes[kind]) return NextResponse.json({ error: "size" }, { status: 413 });
  if (!(await rateLimit("presignMB", "", { cost: p.data.size / (1024 * 1024) })).ok) return NextResponse.json({ error: "rate" }, { status: 429 });

  const token = randomToken();
  const asset = await db.mediaAsset.create({
    data: { state: "PENDING", kind, mime: p.data.type, size: p.data.size, originalName: p.data.name.slice(0, 255), uploadTokenHash: sha256(token) },
  });
  const key = `incoming/${new Date().toISOString().slice(0, 10)}/${asset.id}`;
  await db.mediaAsset.update({ where: { id: asset.id }, data: { key } });
  const upload = await storage.presignPut(key, p.data.type, p.data.size);
  return NextResponse.json({ id: asset.id, token, upload }, { headers: { "Cache-Control": "no-store" } });
}
