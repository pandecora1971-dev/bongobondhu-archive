"use client";
import { usePathname } from "next/navigation";
import a from "../admin.module.css";

type Counts = { contributions: number; complaints: number; posts: number };
type Perms = { contributions: boolean; complaints: boolean; posts: boolean; content: boolean; super: boolean };

/** Only shows sections the current admin may open (the server re-checks every page anyway). */
export default function Nav({ perms, counts }: { perms: Perms; counts: Counts }) {
  const path = usePathname();
  const L = (href: string, label: string, n?: number) => (
    <a key={href} href={href} className={(href === "/admin" ? path === href : path.startsWith(href)) ? a.on : ""}>
      <span>{label}</span>
      {!!n && <em>{n}</em>}
    </a>
  );
  const queues = perms.contributions || perms.complaints || perms.posts;
  return (
    <>
      <div className={a.navGroup}>
        <h6>পর্যালোচনা</h6>
        {L("/admin", "ড্যাশবোর্ড")}
        {queues && (
          <>
            {perms.contributions && L("/admin/contributions", "তথ্য জমা (BB / SH)", counts.contributions)}
            {perms.complaints && L("/admin/complaints", "অভিযোগ", counts.complaints)}
            {perms.posts && L("/admin/posts", "দুঃসময়ের গল্প", counts.posts)}
          </>
        )}
        {L("/admin/media", "মিডিয়া")}
      </div>
      {perms.content && (
        <div className={a.navGroup}>
          <h6>কনটেন্ট</h6>
          {L("/admin/projects", "৬০ প্রকল্প")}
          {L("/admin/films", "ফিল্ম")}
          {L("/admin/history", "ইতিহাস")}
          {L("/admin/milestones", "উন্নয়ন পথ")}
          {L("/admin/content", "অন্যান্য কনটেন্ট")}
        </div>
      )}
      <div className={a.navGroup}>
        <h6>{perms.super ? "টিম ও লগ" : "আমার কাজ"}</h6>
        {L("/admin/audit", perms.super ? "লগ বই (সবার)" : "আমার কাজের লগ")}
        {perms.super && L("/admin/users", "সুপার অ্যাডমিন ও মডারেটর")}
        {L("/admin/account", "আমার অ্যাকাউন্ট")}
      </div>
    </>
  );
}
