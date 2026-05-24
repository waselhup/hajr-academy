/**
 * HAJR A° brand v3 — locked constants. CSS tokens live in
 * globals.css + tailwind.config.ts. This file is for JS-side
 * needs (email templates, PDF generators, SVG generation, etc.)
 * so a future rebrand touches one file, not fifty.
 */
export const BRAND = {
  name: {
    en: "HAJR A° Academy",
    ar: "أكاديمية هجر A°",
    short: "HAJR A°",
  },
  tagline: {
    en: "Learn with Confidence",
    ar: "تعلّم بثقة",
  },
  palette: {
    deepNavy:  "#1E2A36",
    navy:      "#2C3E50",
    ivory:     "#FAF6EE",
    rose:      "#B86E7B",
    mint:      "#B5E5D8",
    white:     "#FFFFFF",
    textMuted: "#64748B",
    border:    "#E2E8F0",
    surface:   "#F8FAFC",
  },
  site: "https://hajr-academy.vercel.app",
  contact: {
    email: "hello@hajr.academy",
    phone: "+966 11 000 0000",
    city:  "Riyadh, Saudi Arabia",
    cityAr: "الرياض، المملكة العربية السعودية",
  },
} as const;
