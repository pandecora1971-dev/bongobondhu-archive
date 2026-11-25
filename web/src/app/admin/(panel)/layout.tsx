import type { Metadata } from "next";
import { can, requireAdmin, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS, ROLES } from "@/lib/labels";
import Nav from "./Nav";
import a from "../admin.module.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const [c, k, p] = await Promise.all([
    can(me, "CONTRIBUTIONS") ? db.contribution.count({ where: { status: "PENDING" } }) : 0,
    can(me, "COMPLAINTS") ? db.complaint.count({ where: { status: "PENDING" } }) : 0,
    can(me, "POSTS") ? db.activityPost.count({ where: { status: "PENDING" } }) : 0,
  ]);
  const perms = { contributions: can(me, "CONTRIBUTIONS"), complaints: can(me, "COMPLAINTS"), posts: can(me, "POSTS"), content: can(me, "CONTENT"), super: me.super };
  const granted = me.permissions.map((x) => PERMISSIONS.label(x)).join(", ") || "কিছুই না";
  return (
    <div className={a.shell}>
      <header className={a.header}>
        <div className={a.brandRow}>
          <a href="/admin" className={a.logo}>বঙ্গবন্ধু ও বাংলাদেশ<i>′</i></a>
          <span>পর্যালোচনা প্যানেল</span>
        </div>
        <div className={a.me}>
          <strong>{me.name}</strong>
          <span className={`${a.role} ${me.super ? a.roleSuper : ""}`}>{ROLES.label(me.role)}</span>
          <a href="/admin/account">আমার অ্যাকাউন্ট</a>
          <a href="/" target="_blank" rel="noopener">সাইট দেখুন ↗</a>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}>
            <button>লগআউট</button>
          </form>
        </div>
      </header>
      <div className={a.wrap}>
        <nav className={a.side} aria-label="অ্যাডমিন বিভাগ">
          <Nav perms={perms} counts={{ contributions: c, complaints: k, posts: p }} />
        </nav>
        <div className={a.note}>
          {me.super ? (
            <><b>সুপার অ্যাডমিন:</b> সব অংশে আপনার প্রবেশাধিকার আছে। অ্যাকাউন্ট, অনুমতি ও সবার লগ বই শুধু আপনি পরিচালনা করেন। প্রকাশের আগে তথ্য ও প্রমাণ যাচাই করুন; ব্যক্তিগত পরিচয় সরান।</>
          ) : (
            <><b>মডারেটর:</b> আপনি শুধু অনুমোদিত অংশ দেখতে পাবেন — {granted}। প্রকাশের আগে তথ্য ও প্রমাণ যাচাই করুন; ব্যক্তিগত পরিচয় সরান। অভিযোগ কখনও জনসাধারণের জন্য প্রকাশিত হয় না।</>
          )}
        </div>
        <main className={a.main}>{children}</main>
      </div>
    </div>
  );
}
