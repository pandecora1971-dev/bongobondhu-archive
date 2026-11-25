import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";
import a from "../admin.module.css";

export const metadata: Metadata = { title: "পর্যালোচক লগইন", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className={`${a.shell} ${a.login}`}>
      <header className={a.header}>
        <div className={a.brandRow}>
          <a href="/" className={a.logo}>বঙ্গবন্ধু ও বাংলাদেশ<i>′</i></a>
          <span>পর্যালোচনা প্যানেল</span>
        </div>
      </header>
      <LoginForm changed={!!sp.changed} />
    </div>
  );
}
