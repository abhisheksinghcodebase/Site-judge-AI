import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// ── Google Fonts via next/font (SSR-safe, no hydration mismatch) ─────
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SiteJudge AI — Is Your Website Production Ready?",
  description:
    "AI-powered website auditor that combines Lighthouse, Axe, SEO analysis, and visual review into one comprehensive production-readiness report.",
  keywords: ["website audit", "lighthouse", "accessibility", "seo", "performance", "web review", "production ready"],
  openGraph: {
    title: "SiteJudge AI",
    description: "Know if your website is production ready in 60 seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
