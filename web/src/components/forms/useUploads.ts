"use client";
import { useCallback, useRef, useState } from "react";
import { UPLOAD_RULES, kindFromMime, type UploadPurpose } from "@/lib/upload-rules";

export type UploadItem = {
  key: string; // local id
  name: string;
  type: string;
  size: number;
  preview: string; // object URL
  progress: number; // 0..1
  status: "uploading" | "done" | "error";
  ref?: { id: string; token: string };
  error?: string;
};

/**
 * Presigned direct-to-storage uploads.
 *   1. POST /api/uploads/presign {purpose,name,type,size} → {id, token, upload:{url,method,headers}}
 *   2. PUT the file to upload.url (R2 / MinIO / local route) with progress
 *   3. the form submits only {id, token}; the server re-checks, strips EXIF and makes thumbnails
 */
export function useUploads(purpose: UploadPurpose, max = UPLOAD_RULES[purpose].maxFiles) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const countRef = useRef(0);
  countRef.current = items.length;
  const rule = UPLOAD_RULES[purpose];

  const patch = (key: string, p: Partial<UploadItem>) => setItems((s) => s.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const start = async (it: UploadItem, file: File) => {
    try {
      const r = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, name: file.name, type: file.type, size: file.size }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "presign");
      const j = (await r.json()) as { id: string; token: string; upload: { url: string; method: string; headers: Record<string, string> } };
      await new Promise<void>((res, rej) => {
        const x = new XMLHttpRequest();
        xhrs.current.set(it.key, x);
        x.open(j.upload.method, j.upload.url);
        Object.entries(j.upload.headers).forEach(([k, v]) => x.setRequestHeader(k, v));
        x.upload.onprogress = (e) => e.lengthComputable && patch(it.key, { progress: e.loaded / e.total });
        x.onload = () => (x.status >= 200 && x.status < 300 ? res() : rej(new Error("upload " + x.status)));
        x.onerror = () => rej(new Error("network"));
        x.send(file);
      });
      patch(it.key, { status: "done", progress: 1, ref: { id: j.id, token: j.token } });
    } catch (e) {
      patch(it.key, { status: "error", error: (e as Error).message });
    } finally {
      xhrs.current.delete(it.key);
    }
  };

  const add = useCallback(
    (list: FileList | File[] | null): string[] => {
      if (!list) return [];
      const room = max - countRef.current;
      const files = [...list]
        .filter((f) => {
          const k = kindFromMime(f.type);
          return k && rule.kinds.includes(k) && f.size <= rule.maxBytes[k];
        })
        .slice(0, Math.max(0, room));
      if (!files.length) return [];
      const next: UploadItem[] = files.map((f) => ({
        key: Math.random().toString(36).slice(2),
        name: f.name,
        type: f.type,
        size: f.size,
        preview: URL.createObjectURL(f),
        progress: 0,
        status: "uploading",
      }));
      countRef.current += next.length;
      setItems((cur) => [...cur, ...next]);
      next.forEach((it, i) => start(it, files[i]));
      return next.map((x) => x.key);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [purpose, max],
  );

  const remove = useCallback((key: string) => {
    xhrs.current.get(key)?.abort();
    setItems((s) => {
      const it = s.find((x) => x.key === key);
      if (it) URL.revokeObjectURL(it.preview);
      return s.filter((x) => x.key !== key);
    });
  }, []);

  const reset = useCallback(() => {
    xhrs.current.forEach((x) => x.abort());
    setItems((s) => {
      s.forEach((x) => URL.revokeObjectURL(x.preview));
      return [];
    });
  }, []);

  return {
    items,
    add,
    remove,
    reset,
    busy: items.some((x) => x.status === "uploading"),
    failed: items.some((x) => x.status === "error"),
    refs: items.filter((x) => x.status === "done" && x.ref).map((x) => x.ref!),
    accept: rule.accept,
  };
}
