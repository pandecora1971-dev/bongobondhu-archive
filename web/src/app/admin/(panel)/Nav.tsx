"use client";
import { usePathname } from "next/navigation";
import a from "../admin.module.css";

type Counts = { contributions: number; complaints: number; posts: number };
type Perms = { contributions: boolean; complaints: boolean; posts: boolean; content: boolean; super: boolean };

/** Only shows sections the current admin may open (the server re-checks every page anyway). */
/** base = the public admin address (secret path), passed from the server layout */
export default function Nav({ perms, counts, base }: { perms: Perms; counts: Counts; base: string }) {
  const path = usePathname();
  const L = (href: string, label: string, n?: number) => (
    <a key={href} href={href} className={(href === base ? path === href : path.startsWith(href)) ? a.on : ""}>
      <span>{label}</span>
      {!!n && <em>{n}</em>}
    </a>
  );
  const queues = perms.contributions || perms.complaints || perms.posts;
  return (
    <>
      <div className={a.navGroup}>
        <h6>পর্যালোচনা</h6>
        {L(`${base}`, "ড্যাশবোর্ড")}
        {queues && (
          <>
            {perms.contributions && L(`${base}/contributions`, "তথ্য জমা (BB / SH)", counts.contributions)}
            {perms.complaints && L(`${base}/complaints`, "অভিযোগ", counts.complaints)}
            {perms.posts && L(`${base}/posts`, "দুঃসময়ের গল্প", counts.posts)}
          </>
        )}
        {L(`${base}/media`, "মিডিয়া")}
      </div>
      {perms.content && (
        <div className={a.navGroup}>
          <h6>কনটেন্ট</h6>
          {L(`${base}/projects`, "৬০ প্রকল্প")}
          {L(`${base}/films`, "ফিল্ম")}
          {L(`${base}/history`, "ইতিহাস")}
          {L(`${base}/milestones`, "উন্নয়ন পথ")}
          {L(`${base}/content`, "অন্যান্য কনটেন্ট")}
        </div>
      )}
      <div className={a.navGroup}>
        <h6>{perms.super ? "টিম ও লগ" : "আমার কাজ"}</h6>
        {L(`${base}/audit`, perms.super ? "লগ বই (সবার)" : "আমার কাজের লগ")}
        {perms.super && L(`${base}/users`, "সুপার অ্যাডমিন ও মডারেটর")}
        {L(`${base}/account`, "আমার অ্যাকাউন্ট")}
      </div>
    </>
  );
}
