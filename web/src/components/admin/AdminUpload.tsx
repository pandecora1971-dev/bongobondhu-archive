"use client";
import { useState } from "react";
import a from "@/app/admin/admin.module.css";

/** Image upload for content editors. Downscales in the browser (≤ 2400px JPEG) so requests stay small. */
export default function AdminUpload({ ownerType, ownerId, slot, back, label = "ছবি যোগ করুন" }: { ownerType: string; ownerId?: string; slot?: string; back: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const shrink = async (f: File): Promise<Blob> => {
    if (!f.type.startsWith("image/") || f.type === "image/gif") return f;
    const bmp = await createImageBitmap(f).catch(() => null);
    if (!bmp) return f;
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    if (k === 1 && f.size < 3_500_000) return f;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return (await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9))) ?? f;
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return;
    setBusy(true);
    setErr("");
    fd.delete("file");
    for (const f of files) fd.append("file", await shrink(f), f.name.replace(/\.\w+$/, "") + ".jpg");
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setBusy(false);
    if (r.redirected) location.href = r.url;
    else if (!r.ok) setErr((await r.json().catch(() => ({})))?.error || "আপলোড ব্যর্থ");
    else location.reload();
  };
  return (
    <form onSubmit={submit} className={a.form} style={{ gridTemplateColumns: "1fr", padding: 12, border: "1px dashed #d6d0c3", borderRadius: 6 }}>
      <input type="hidden" name="ownerType" value={ownerType} />
      {ownerId && <input type="hidden" name="ownerId" value={ownerId} />}
      {slot && <input type="hidden" name="slot" value={slot} />}
      <input type="hidden" name="back" value={back} />
      <div className={a.row}>
        <label>ফাইল<input className={a.input} type="file" name="file" accept="image/*" multiple required /></label>
        <label>ক্যাপশন<input className={a.input} name="caption" maxLength={500} /></label>
        <label>কৃতিত্ব / ক্রেডিট<input className={a.input} name="credit" maxLength={500} /></label>
        <label>উৎসের লিংক<input className={a.input} name="sourceUrl" type="url" maxLength={2000} /></label>
      </div>
      <div className={a.actions}>
        <button className={a.btn} disabled={busy}>{busy ? "আপলোড হচ্ছে…" : label}</button>
        {err && <span className={a.err}>{err}</span>}
      </div>
    </form>
  );
}
