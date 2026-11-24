import type { Metadata } from "next";
import { can, requireAdmin, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/labels";
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
  return (
    <div className={a.shell}>
      <aside className={a.side}>
        <a href="/admin" className={a.logo}><i />Admin</a>
        <Nav perms={perms} counts={{ contributions: c, complaints: k, posts: p }} />
        <div className={a.me}>
          <span>{me.name}<br /><small>{ROLES.label(me.role)}</small></span>
          <a href="/admin/account" style={{ padding: 0, minHeight: 0 }}>আমার অ্যাকাউন্ট</a>
          <a href="/" target="_blank" rel="noopener" style={{ padding: 0, minHeight: 0 }}>সাইট দেখুন ↗</a>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}>
            <button>লগ আউট</button>
          </form>
        </div>
      </aside>
      <main className={a.main}>{children}</main>
    </div>
  );
}
