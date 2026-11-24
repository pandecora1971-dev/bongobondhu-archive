import "server-only";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import { hmac } from "./crypto";

/**
 * Storage abstraction.
 *   "s3"    → Cloudflare R2 / MinIO / AWS S3 / Supabase Storage (S3 API). Browser uploads go
 *             straight to the bucket with a presigned PUT.
 *   "local" → ./.data/storage on disk. Dev only. Uploads go to /api/uploads/local with an HMAC token.
 * The bucket is PRIVATE. Everything is read back through /api/media/[id], which enforces visibility.
 */
export interface PresignedPut {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface Storage {
  presignPut(key: string, contentType: string, size: number): Promise<PresignedPut>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  /** first `bytes` bytes, for magic-number sniffing without downloading a whole video */
  head(key: string, bytes?: number): Promise<{ size: number; first: Buffer } | null>;
  move(from: string, to: string): Promise<void>;
  delete(key: string): Promise<void>;
  stream(key: string, range?: string): Promise<{ body: ReadableStream; size: number; contentRange?: string; status: number }>;
}

// ───────────────────────────── S3 / R2 ─────────────────────────────

let _s3: S3Client | null = null;
const s3 = () =>
  (_s3 ??= new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint,
    forcePathStyle: env.s3.forcePathStyle,
    credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
  }));

const S3Storage: Storage = {
  async presignPut(key, contentType, size) {
    const cmd = new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, ContentType: contentType, ContentLength: size });
    const url = await getSignedUrl(s3(), cmd, { expiresIn: 15 * 60, signableHeaders: new Set(["content-type", "content-length"]) });
    return { url, method: "PUT", headers: { "Content-Type": contentType } };
  },
  async put(key, body, contentType) {
    await s3().send(new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, Body: body, ContentType: contentType }));
  },
  async get(key) {
    const r = await s3().send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));
    return Buffer.from(await r.Body!.transformToByteArray());
  },
  async head(key, bytes = 64) {
    try {
      const h = await s3().send(new HeadObjectCommand({ Bucket: env.s3.bucket, Key: key }));
      const r = await s3().send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
      return { size: Number(h.ContentLength ?? 0), first: Buffer.from(await r.Body!.transformToByteArray()) };
    } catch {
      return null;
    }
  },
  async move(from, to) {
    await s3().send(new CopyObjectCommand({ Bucket: env.s3.bucket, Key: to, CopySource: `${env.s3.bucket}/${encodeURIComponent(from)}` }));
    await s3().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: from }));
  },
  async delete(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
  },
  async stream(key, range) {
    const r = await s3().send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key, Range: range }));
    return {
      body: r.Body!.transformToWebStream(),
      size: Number(r.ContentLength ?? 0),
      contentRange: r.ContentRange,
      status: r.ContentRange ? 206 : 200,
    };
  },
};

// ───────────────────────────── local disk (dev) ─────────────────────────────

const ROOT = path.join(process.cwd(), ".data", "storage");
const safe = (key: string) => {
  const p = path.join(ROOT, key);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("bad key");
  return p;
};

export function localUploadToken(key: string, contentType: string, size: number, exp: number) {
  return hmac(env.uploadSecret, `${key}|${contentType}|${size}|${exp}`);
}

// Serverless file systems are read-only/ephemeral — uploads would silently vanish. Checked on first write.
function assertLocalAllowed() {
  if (process.env.VERCEL || (env.isProd && process.env.ALLOW_LOCAL_STORAGE !== "true"))
    throw new Error("STORAGE_DRIVER=local is for development only. Configure S3_* (Cloudflare R2) and set STORAGE_DRIVER=s3.");
}

const LocalStorage: Storage = {
  async presignPut(key, contentType, size) {
    assertLocalAllowed();
    const exp = Date.now() + 15 * 60 * 1000;
    const q = new URLSearchParams({ key, ct: contentType, size: String(size), exp: String(exp), sig: localUploadToken(key, contentType, size, exp) });
    return { url: `/api/uploads/local?${q}`, method: "PUT", headers: { "Content-Type": contentType } };
  },
  async put(key, body) {
    assertLocalAllowed();
    const p = safe(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, body);
  },
  async get(key) {
    return fs.readFile(safe(key));
  },
  async head(key, bytes = 64) {
    try {
      const p = safe(key);
      const st = await fs.stat(p);
      const fh = await fs.open(p, "r");
      const first = Buffer.alloc(Math.min(bytes, st.size));
      await fh.read(first, 0, first.length, 0);
      await fh.close();
      return { size: st.size, first };
    } catch {
      return null;
    }
  },
  async move(from, to) {
    const t = safe(to);
    await fs.mkdir(path.dirname(t), { recursive: true });
    await fs.rename(safe(from), t);
  },
  async delete(key) {
    await fs.rm(safe(key), { force: true });
  },
  async stream(key, range) {
    const p = safe(key);
    const { size } = await fs.stat(p);
    let start = 0, end = size - 1, status = 200, contentRange: string | undefined;
    const m = range?.match(/bytes=(\d*)-(\d*)/);
    if (m) {
      start = m[1] ? +m[1] : Math.max(0, size - +m[2]);
      end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
      status = 206;
      contentRange = `bytes ${start}-${end}/${size}`;
    }
    const rs = createReadStream(p, { start, end });
    const body = new ReadableStream({
      start(c) {
        rs.on("data", (d) => c.enqueue(new Uint8Array(d as Buffer)));
        rs.on("end", () => c.close());
        rs.on("error", (e) => c.error(e));
      },
      cancel() {
        rs.destroy();
      },
    });
    return { body, size: end - start + 1, contentRange, status };
  },
};

export const storage: Storage = env.storageDriver === "s3" ? S3Storage : LocalStorage;
