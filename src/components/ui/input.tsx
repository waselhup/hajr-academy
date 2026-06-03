"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

// Native date/time/number controls format their placeholder + digits from a
// locale. Without an explicit `lang` they fall back to the browser/OS locale —
// which rendered Arabic (e.g. "دش/زهش/سوي", "٦٠") even in the English UI. We
// default `lang` to the active app locale for these types so the field always
// matches the chosen language. An explicit `lang` prop still wins.
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
    const locale = useLocale();
    const resolvedLang =
      lang ?? (type && LOCALE_SENSITIVE_TYPES.has(type) ? locale : undefined);
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
