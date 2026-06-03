"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Keeps <html lang> / <html dir> in sync with the active app locale.
 *
 * The root layout renders <html> before the locale is known, so without this
 * the document keeps a stale (or empty) lang. Native form controls —
 * <input type="date" | "datetime-local" | "time" | "number"> — format their
 * placeholder and digits from the document language, so a missing/Arabic lang
 * made them render Arabic (e.g. "دش/زهش/سوي", "٦٠") even in the English UI.
 *
 * Setting lang/dir here (client-side, on every locale change) makes the whole
 * tree — including every native control — follow the chosen language.
 */
export function HtmlLangSync() {
  const locale = useLocale();
  useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
