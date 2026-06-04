"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeNumeric } from "@/lib/western-format";

// Owner rule: NUMBERS are ALWAYS Western digits (0-9), on every browser/OS,
// regardless of UI language. Arabic-Indic digits (٠١٢…) are banned.
//
// Native <input type="number"> renders its value/spinner using the OS locale on
// some platforms (e.g. an Arabic-locale Windows shows ٦٠/٤٠٠), and `lang` does
// NOT override that. A TEXT input renders the literal value string, so it never
// locale-shapes digits. We therefore render type="number" as a text input with
// inputMode="numeric" (mobile numeric keypad) + dir="ltr", and sanitize any
// Arabic-Indic digits a user might type/paste back to ASCII. The stored value
// stays a numeric string, so z.coerce.number()/Number(...) call sites are
// unaffected (no call site uses valueAsNumber).
//
// For date/time fields, use DateField/TimeField/DateTimeField from
// "@/components/ui/western-fields" — native date/time pickers are OS-bound too.
const INPUT_CLASS =
  "flex h-10 w-full rounded-lg border border-hajr-gray-200 bg-white px-3 py-2 text-sm text-hajr-black ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-hajr-gray-300 focus-visible:border-hajr-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hajr-rose/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

// Native setter so a programmatic value change is observed by React + RHF.
function setNativeValue(el: HTMLInputElement, value: string) {
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter ? setter.call(el, value) : (el.value = value);
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, inputMode, dir, onChange, ...props }, ref) => {
    const isNumber = type === "number";

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const clean = sanitizeNumeric(raw);
      if (clean !== raw) {
        // rewrite the field to ASCII before the value propagates
        setNativeValue(e.target, clean);
      }
      onChange?.(e);
    };

    if (isNumber) {
      return (
        <input
          {...props}
          type="text"
          inputMode={inputMode ?? "numeric"}
          dir={dir ?? "ltr"}
          ref={ref}
          onChange={handleNumberChange}
          className={cn(INPUT_CLASS, className)}
        />
      );
    }

    return (
      <input
        {...props}
        type={type}
        inputMode={inputMode}
        dir={dir}
        ref={ref}
        onChange={onChange}
        className={cn(INPUT_CLASS, className)}
      />
    );
  }
);
Input.displayName = "Input";
export { Input };
