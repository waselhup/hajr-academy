"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Native date/time/number controls format their placeholder + digits from a
// `lang`. The owner's rule: NUMBERS are always Western digits (0-9) and DATES
// always show a clean Western format (dd/mm/yyyy) — REGARDLESS of UI language.
// So for these types we pin `lang` to a Western-digit locale (en-GB) ALWAYS,
// even when the UI is Arabic. This makes the native number spinner show 0-9 and
// the date picker show dd/mm/yyyy in both locales. Labels/dir/styling stay as-is
// (Arabic pages remain RTL). An explicit `lang` prop still wins.
const WESTERN_INPUT_LANG = "en-GB"; // Latin digits + dd/mm/yyyy date format
const LOCALE_SENSITIVE_TYPES = new Set([
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
  "number",
]);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, lang, ...props }, ref) => {
    const resolvedLang =
      lang ?? (type && LOCALE_SENSITIVE_TYPES.has(type) ? WESTERN_INPUT_LANG : undefined);
    return (
      <input
        type={type}
        lang={resolvedLang}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-hajr-gray-200 bg-white px-3 py-2 text-sm text-hajr-black ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-hajr-gray-300 focus-visible:border-hajr-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hajr-rose/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
export { Input };
