"use client";
import { useActionState } from "react";
import { login } from "./actions";
import a from "../admin.module.css";

export default function LoginForm({ changed }: { changed?: boolean }) {
  const [err, act, pending] = useActionState(login, null);
  return (
    <form action={act}>
      <h1>প্রশাসনিক প্রবেশ</h1>
      <p className={a.muted}>বঙ্গবন্ধু ও বাংলাদেশ · Admin</p>
      {changed && <p className={a.flash}>পাসওয়ার্ড বদলানো হয়েছে। নতুন পাসওয়ার্ডে প্রবেশ করুন।</p>}
      <label className={a.form}>
        <span>ইমেইল</span>
        <input className={a.input} type="email" name="email" autoComplete="username" required />
      </label>
      <label className={a.form}>
        <span>পাসওয়ার্ড</span>
        <input className={a.input} type="password" name="password" autoComplete="current-password" required />
      </label>
      {err && <p className={a.err} role="alert">{err === "rate" ? "অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পর চেষ্টা করুন।" : "ইমেইল বা পাসওয়ার্ড সঠিক নয়।"}</p>}
      <button className={a.btn} disabled={pending}>{pending ? "…" : "প্রবেশ করুন"}</button>
    </form>
  );
}
