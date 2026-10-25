import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Sans_Arabic, Outfit } from "next/font/google";
import "./globals.css";

// Product typefaces from the Omnirent design system: Outfit for Latin text,
// IBM Plex Sans Arabic for Arabic. DM Sans is only for the wordmark.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["500"], variable: "--font-dm-sans" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-plex-arabic",
});

export const metadata: Metadata = {
  title: "Omnirent",
  description: "List once. Reach everywhere.",
  // The app has its own Arabic and English. When a browser translates the
  // page itself, it rewrites text React owns and the next update crashes the
  // page ("Application error"), so automatic translation is turned off.
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className={`${outfit.variable} ${plexArabic.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
