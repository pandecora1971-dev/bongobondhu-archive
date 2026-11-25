"use client";
import { useActionState, useState } from "react";
import { login, verifyCode, type LoginState } from "./actions";
import a from "../admin.module.css";

const MSG = {
  rate: "অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পর চেষ্টা করুন।",
  bad: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
  send: "লগইন কোড ইমেইলে পাঠানো যায়নি। একটু পরে আবার চেষ্টা করুন।",
  code: "কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে। ৫ বার ভুল হলে আবার পাসওয়ার্ড দিয়ে শুরু করুন।",
};

export default function LoginForm({ changed }: { changed?: boolean }) {
  const [first, act, pending] = useActionState(login, null);
  // "back" hides the current code step; a new password step brings a new challenge
  const [dismissed, setDismissed] = useState<string | null>(null);
  const challenge = first?.challenge && first.challenge !== dismissed ? first : null;

  if (challenge) return <CodeStep key={challenge.challenge} start={challenge} onBack={() => setDismissed(challenge.challenge ?? null)} />;
  return (
    <form action={act}>
      <h1>পর্যালোচক লগইন</h1>
      <p className={a.muted}>শুধু অনুমোদিত সুপার অ্যাডমিন ও মডারেটরদের জন্য।</p>
      {changed && <p className={a.flash}>পাসওয়ার্ড বদলানো হয়েছে। নতুন পাসওয়ার্ডে প্রবেশ করুন।</p>}
      <label>
        <span>ইমেইল</span>
        <input className={a.input} type="email" name="email" autoComplete="username" required />
      </label>
      <label>
        <span>পাসওয়ার্ড</span>
        <input className={a.input} type="password" name="password" autoComplete="current-password" required />
      </label>
      {first?.error && !first.challenge && <p className={a.err} role="alert">{MSG[first.error]}</p>}
      <button className={a.btn} disabled={pending}>{pending ? "যাচাই হচ্ছে…" : "লগইন করুন →"}</button>
      <p className={a.loginFoot}>প্রতিটি লগইন ও ব্যর্থ চেষ্টা লগ বইয়ে লেখা হয়। অ্যাকাউন্ট দরকার হলে একজন সুপার অ্যাডমিনের সঙ্গে যোগাযোগ করুন।</p>
    </form>
  );
}

function CodeStep({ start, onBack }: { start: NonNullable<LoginState>; onBack: () => void }) {
  const [state, act, pending] = useActionState(verifyCode, start);
  const [code, setCode] = useState("");
  return (
    <form action={act}>
      <h1>লগইন কোড</h1>
      <p className={a.note} role="status">✉ আপনার ইমেইলে ({start.to}) ৬ সংখ্যার কোড পাঠানো হয়েছে। মেয়াদ ১০ মিনিট।</p>
      <input type="hidden" name="challenge" value={start.challenge} />
      <label>
        <span>ইমেইলে আসা ৬ সংখ্যার কোড</span>
        <input
          className={`${a.input} ${a.otp}`}
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="১২৩৪৫৬"
          maxLength={6}
          required
          autoFocus
        />
      </label>
      {state?.error && <p className={a.err} role="alert">{MSG[state.error]}</p>}
      <button className={a.btn} disabled={pending || code.length !== 6}>{pending ? "যাচাই হচ্ছে…" : "লগইন সম্পূর্ণ করুন →"}</button>
      <button type="button" className={a.linkBtn} onClick={onBack}>← আবার পাসওয়ার্ড দিন / নতুন কোড নিন</button>
    </form>
  );
}
