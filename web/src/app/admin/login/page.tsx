import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";
import a from "../admin.module.css";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className={a.login}>
      <LoginForm changed={!!sp.changed} />
    </div>
  );
}
