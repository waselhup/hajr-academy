"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Owner rule: NUMBERS are ALWAYS Western digits (0-9) and DATES always render a
 * clean Western format — REGARDLESS of the UI language. Arabic-Indic digits
 * (٠١٢…) are banned platform-wide.
 *
 * Native date/time/number controls take their digit system + placeholder format
 * from the nearest `lang`, falling back to the document's <html lang>. To make
 * the rule impossible to break we pin the DOCUMENT language to a Western-digit
 * locale (en-GB → 0-9 + dd/mm/yyyy) for ALL locales, so even a raw <input> that
 * forgets an explicit lang still renders Western. <html dir> still follows the
 * locale so Arabic pages stay RTL.
 *
 * Content language for accessibility is set separately on the inner content
 * wrapper (`<div lang={locale}>` in [locale]/layout.tsx), so screen readers
 * still announce Arabic text as Arabic — only the native-control digit/format
 * rendering is forced Western.
 *
 * Belt-and-suspenders: the shared <Input> and the few raw locale-sensitive
 * inputs also set lang="en-GB" explicitly; this document-level pin is the safety
 * net that covers anything added later without it.
 */
const WESTERN_DOC_LANG = "en-GB"; // Latin digits + dd/mm/yyyy date format

export function HtmlLangSync() {
  const locale = useLocale();
  useEffect(() => {
    const el = document.documentElement;
    el.lang = WESTERN_DOC_LANG; // never Arabic → native widgets never go Arabic-Indic
    el.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
