import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
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
  themeColor: "#2C3E50",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} ${ibmPlex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
