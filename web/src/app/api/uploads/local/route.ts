import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { storage, localUploadToken } from "@/lib/storage";
import { sameOrigin } from "@/lib/request";
import { readLimitedBody, BodyTooLarge } from "@/lib/request-body";

export const runtime = "nodejs";

/** Dev-only stand-in for a presigned S3 PUT (STORAGE_DRIVER=local). */
export async function PUT(req: Request) {
  if (env.storageDriver !== "local") return new NextResponse(null, { status: 404 });
  if (process.env.VERCEL || (env.isProd && process.env.ALLOW_LOCAL_STORAGE !== "true")) return new NextResponse(null, { status: 404 });
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  const q = new URL(req.url).searchParams;
  const key = q.get("key") || "", ct = q.get("ct") || "", size = +(q.get("size") || 0), exp = +(q.get("exp") || 0), sig = q.get("sig") || "";
  if (!Number.isSafeInteger(size) || size < 1 || size > 200 * 1024 * 1024 || !Number.isSafeInteger(exp))
    return new NextResponse(null, { status: 400 });
  const want = Buffer.from(localUploadToken(key, ct, size, exp));
  const got = Buffer.from(sig);
  if (!key.startsWith("incoming/") || exp < Date.now() || want.length !== got.length || !timingSafeEqual(want, got))
    return new NextResponse(null, { status: 403 });
  let buf: Buffer;
  try {
    buf = Buffer.from(await readLimitedBody(req, size));
  } catch (e) {
    return new NextResponse(null, { status: e instanceof BodyTooLarge ? 413 : 400 });
  }
  if (buf.length !== size) return new NextResponse(null, { status: 400 });
  await storage.put(key, buf, ct);
  return new NextResponse(null, { status: 200 });
}
