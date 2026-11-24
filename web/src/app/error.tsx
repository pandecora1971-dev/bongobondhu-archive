"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
    <p style={{ color: "#5f5b52" }}>Bongobondhu & Bangladesh</p>
    <h1 style={{ fontSize: "clamp(30px,5vw,48px)", lineHeight: 1.3, marginTop: 16 }}>সাময়িকভাবে পাতাটি খোলা যাচ্ছে না</h1>
    <p style={{ marginTop: 20 }}>দয়া করে আবার চেষ্টা করুন। / This page is temporarily unavailable. Please try again.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", marginTop: 28 }}>
      <button type="button" onClick={reset} style={{ minHeight: 48, padding: "10px 20px", background: "#1c1b18", color: "#fff", border: 0, borderRadius: 4, cursor: "pointer" }}>আবার চেষ্টা করুন / Try again</button>
      <a href="/" style={{ color: "inherit" }}>হোমপেজ / Home</a>
    </div>
  </main>;
}
