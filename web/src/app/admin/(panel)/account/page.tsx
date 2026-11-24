import { requireAdmin } from "@/lib/auth";
import { PERMISSIONS, ROLES } from "@/lib/labels";
import { Top } from "@/components/admin/ui";
import { changeOwnPassword } from "../../actions";
import a from "../../admin.module.css";

const ERR: Record<string, string> = { invalid: "নতুন পাসওয়ার্ড কমপক্ষে ১২ অক্ষর, অক্ষর ও সংখ্যা দুটোই, এবং দুবার একই হতে হবে।", current: "বর্তমান পাসওয়ার্ড সঠিক নয়।" };

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  return (
    <>
      <Top title="আমার অ্যাকাউন্ট" sub={`${me.email} · ${ROLES.label(me.role)}`} />
      <div className={`${a.card} ${a.section}`} style={{ maxWidth: 640 }}>
        <h2>আমার অনুমতি</h2>
        <p>{me.super ? "সুপার অ্যাডমিন — সব কাজের অনুমতি।" : me.permissions.map((p) => PERMISSIONS.label(p)).join(" · ") || "কোনো অনুমতি নেই — সুপার অ্যাডমিনের সঙ্গে যোগাযোগ করুন।"}</p>
      </div>
      <form action={changeOwnPassword} className={`${a.card} ${a.form}`} style={{ maxWidth: 640, marginTop: 18 }}>
        <h2 style={{ fontSize: 18 }}>পাসওয়ার্ড বদলান</h2>
        {sp.error && <div className={a.warn}>{ERR[sp.error] ?? sp.error}</div>}
        <label>বর্তমান পাসওয়ার্ড<input className={a.input} type="password" name="current" required autoComplete="current-password" /></label>
        <label>নতুন পাসওয়ার্ড<input className={a.input} type="password" name="password" minLength={12} required autoComplete="new-password" /></label>
        <label>আবার লিখুন<input className={a.input} type="password" name="confirm" minLength={12} required autoComplete="new-password" /></label>
        <button className={a.btn}>বদলান (সব ডিভাইস থেকে লগআউট হবে)</button>
      </form>
    </>
  );
}
