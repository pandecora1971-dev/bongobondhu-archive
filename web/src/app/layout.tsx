import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import { getLang } from "@/lib/i18n";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "বঙ্গবন্ধু ও বাংলাদেশ", template: "%s · বঙ্গবন্ধু ও বাংলাদেশ" },
  description: "বাংলাদেশের ইতিহাস, উন্নয়ন ও জনস্বার্থের দলিল — মূল নথি, নাগরিকের অবদান আর যাচাই করা উৎসসহ এক জায়গায়।",
  openGraph: { type: "website", siteName: "বঙ্গবন্ধু ও বাংলাদেশ", locale: "bn_BD", images: ["/og-default.png"] },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1c1b18" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={fontVars} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
