import a from "@/app/admin/admin.module.css";
import { STATUS } from "@/lib/labels";
import { setMediaHidden, deleteMedia, setStatus } from "@/app/admin/actions";
import type { MediaAsset } from "@prisma/client";
import { mediaUrl } from "@/lib/media";

export const Pill = ({ s }: { s: string }) => <span className={`${a.pill} ${a[s] ?? ""}`}>{STATUS.label(s as never) || s}</span>;

export function Top({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className={a.top}>
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className={a.actions}>{children}</div>
    </div>
  );
}

export const Saved = ({ on, text = "সংরক্ষিত হয়েছে।" }: { on?: string | string[]; text?: string }) =>
  on ? <div className={a.flash} role="status">{text}</div> : null;

/** Approve / reject / archive buttons for a queue item. */
export function StatusButtons({ kind, id, current, back }: { kind: "contribution" | "post" | "complaint"; id: string; current: string; back?: string }) {
  const B = (s: string, label: string, cls: string) =>
    current === s ? null : (
      <form action={setStatus}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={s} />
        {back && <input type="hidden" name="back" value={back} />}
        <button className={`${a.btn} ${cls}`}>{label}</button>
      </form>
    );
  return (
    <div className={a.actions}>
      {B("APPROVED", kind === "complaint" ? "যাচাইকৃত চিহ্নিত করুন" : "অনুমোদন / প্রকাশ", a.ok)}
      {B("REJECTED", "বাতিল", a.bad)}
      {B("ARCHIVED", "আর্কাইভ", a.ghost)}
      {B("PENDING", "অপেক্ষমাণে ফেরত", a.ghost)}
    </div>
  );
}

/** Media viewer with hide / delete. Private files load through /api/media (admin session). */
export function MediaGrid({ items, back, canDelete }: { items: MediaAsset[]; back: string; canDelete?: boolean }) {
  if (!items.length) return <p className={a.muted}>কোনো ফাইল নেই।</p>;
  return (
    <div className={a.media}>
      {items.map((m) => {
        const full = mediaUrl(m, "full"), thumb = mediaUrl(m, "thumb");
        return (
          <div key={m.id} className={`${a.mItem} ${m.hidden ? a.hidden : ""}`}>
            <a className={a.img} href={full} target="_blank" rel="noopener noreferrer">
              {m.kind === "IMAGE" ? <img src={thumb} alt={m.alt ?? ""} loading="lazy" referrerPolicy="no-referrer" /> : <b>{m.kind}</b>}
            </a>
            <div className={a.bar}>
              <span className={a.muted} style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.caption ?? m.originalName ?? ""}>
                {m.width ? `${m.width}×${m.height}` : m.mime}
                {!m.key && " · বাইরের লিংক"}
              </span>
              <form action={setMediaHidden}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="hidden" value={m.hidden ? "0" : "1"} />
                <input type="hidden" name="back" value={back} />
                <button className={`${a.btn} ${a.ghost} ${a.sm}`}>{m.hidden ? "দেখান" : "লুকান"}</button>
              </form>
              {canDelete && (
                <form action={deleteMedia}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="back" value={back} />
                  <button className={`${a.btn} ${a.bad} ${a.sm}`}>মুছুন</button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Pager({ page, total, size, base }: { page: number; total: number; size: number; base: string }) {
  const last = Math.max(1, Math.ceil(total / size));
  const href = (p: number) => `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
  return (
    <div className={a.pager}>
      <span className={a.muted}>মোট {total} · পৃষ্ঠা {page}/{last}</span>
      {page > 1 && <a className={`${a.btn} ${a.ghost} ${a.sm}`} href={href(page - 1)}>← আগের</a>}
      {page < last && <a className={`${a.btn} ${a.ghost} ${a.sm}`} href={href(page + 1)}>পরের →</a>}
    </div>
  );
}
