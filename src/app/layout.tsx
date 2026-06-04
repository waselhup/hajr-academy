import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  // Brand v3 needs the full weight range so the logo (HAJR Bold 700,
  // A° Light 300, ACADEMY Regular 400) renders at its canonical spec.
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-en",
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ar",
  display: "swap",
});

const SITE_TITLE = "HAJR A° Academy | أكاديمية هجر";
const SITE_DESC =
  "Premium English education for Saudi Arabia — structured programs, certified instructors, and an adaptive English Lab. تعليم إنجليزي متميّز.";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s | HAJR A° Academy",
  },
  description: SITE_DESC,
  applicationName: "HAJR A° Academy",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "HAJR A° Academy",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "HAJR A° Academy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/og-image.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E2A36",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // <html lang> is pinned to a Western-digit locale (en-GB) so native date/
  // number controls ALWAYS render Western digits (0-9) + dd/mm/yyyy, regardless
  // of UI language — the owner's platform-wide rule (Arabic-Indic digits are
  // banned). dir defaults to rtl (defaultLocale is ar); HtmlLangSync keeps dir
  // in sync on the client. Content language for a11y lives on the inner
  // <div lang={locale}> in [locale]/layout.tsx, not here.
  return (
    <html lang="en-GB" dir="rtl" className={`${inter.variable} ${ibmPlex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
