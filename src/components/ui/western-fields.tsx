"use client";

/**
 * Western-digit date/time fields — owner rule: numbers are ALWAYS Western digits
 * (0-9) and dates always render dd/mm/yyyy, on EVERY browser/OS, regardless of
 * UI language. Native <input type="date|time|datetime-local"> can't guarantee
 * this — on an Arabic-locale OS the native picker renders Arabic-Indic digits
 * and `lang` does not override it. So these are masked TEXT inputs that:
 *   - only ever show ASCII 0-9 (any Arabic-Indic digits typed/pasted are mapped
 *     back to Western, non-digits stripped),
 *   - display the clean Western mask (dd/mm/yyyy, HH:mm, dd/mm/yyyy HH:mm),
 *   - emit the SAME canonical value the native control produced, so existing
 *     react-hook-form `register(...)` AND controlled `value`/`onChange` call
 *     sites keep working unchanged:
 *       DateField      → "yyyy-mm-dd"            (was type="date")
 *       TimeField      → "HH:mm"                 (was type="time")
 *       DateTimeField  → "yyyy-mm-ddTHH:mm"      (was type="datetime-local")
 *     Empty/incomplete input emits "".
 *
 * Wiring: a hidden <input> holds the CANONICAL value and carries name/ref/
 * onChange/onBlur (so react-hook-form reads the canonical value via its ref,
 * exactly like a native date input). A visible masked text input drives it.
 * dir="ltr" so digits/separators always read LTR even on RTL pages.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  dateValueToDisplay, dateDisplayToValue, maskDate,
  timeValueToDisplay, timeDisplayToValue, maskTime,
  dateTimeValueToDisplay, dateTimeDisplayToValue, maskDateTime,
} from "@/lib/western-format";

const INPUT_CLASS =
  "flex h-10 w-full rounded-lg border border-hajr-gray-200 bg-white px-3 py-2 text-sm text-hajr-black ring-offset-background transition-colors placeholder:text-hajr-gray-300 focus-visible:border-hajr-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hajr-rose/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

/* ── shared masked-field implementation ───────────────────── */
type MaskKind = "date" | "time" | "datetime";
const CONV: Record<MaskKind, {
  toDisplay: (v: string) => string;
  toValue: (d: string) => string;
  mask: (d: string) => string;
  placeholder: string;
}> = {
  date: { toDisplay: dateValueToDisplay, toValue: dateDisplayToValue, mask: maskDate, placeholder: "dd/mm/yyyy" },
  time: { toDisplay: timeValueToDisplay, toValue: timeDisplayToValue, mask: maskTime, placeholder: "HH:mm" },
  datetime: { toDisplay: dateTimeValueToDisplay, toValue: dateTimeDisplayToValue, mask: maskDateTime, placeholder: "dd/mm/yyyy HH:mm" },
};

type MaskedFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  kind: MaskKind;
};

const MaskedField = React.forwardRef<HTMLInputElement, MaskedFieldProps>(
  ({ kind, value, defaultValue, onChange, onBlur, name, className, placeholder, disabled, id, "aria-label": ariaLabel, ...rest }, ref) => {
    const conv = CONV[kind];
    const controlled = value !== undefined && value !== null;
    const initialCanonical = String((controlled ? value : defaultValue) ?? "");
    const hiddenRef = React.useRef<HTMLInputElement | null>(null);
    // `canonical` is the value RHF/consumers read; it CONTROLS the hidden input
    // so React deterministically keeps hidden.value === canonical (correct for
    // RHF's submit-time ref read, with no effects/rAF/StrictMode races).
    // `display` is the visible mask, kept separately so partial in-progress
    // typing like "04/06" persists even though its canonical is "" until valid.
    const [canonical, setCanonical] = React.useState<string>(initialCanonical);
    const [display, setDisplay] = React.useState<string>(() => conv.toDisplay(initialCanonical));
    const seeded = React.useRef(false);

    const setHiddenRef = React.useCallback(
      (el: HTMLInputElement | null) => {
        hiddenRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      },
      [ref]
    );

    // CONTROLLED consumers: follow the incoming `value`.
    React.useEffect(() => {
      if (!controlled) return;
      const v = String(value ?? "");
      setCanonical(v);
      setDisplay(conv.toDisplay(v));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, controlled]);

    // UNCONTROLLED (react-hook-form register): RHF seeds its default by writing
    // hidden.value via the ref around mount. Because the hidden input is React-
    // controlled, that write is transient — so we read it once after mount and
    // adopt it into `canonical` (which then drives both the value and the mask).
    // Also mirror later RHF mutations (reset/setValue dispatch input/change).
    React.useEffect(() => {
      if (controlled) return;
      const el = hiddenRef.current;
      if (!el) return;
      if (!seeded.current && el.value && el.value !== canonical) {
        seeded.current = true;
        setCanonical(el.value);
        setDisplay(conv.toDisplay(el.value));
      } else {
        seeded.current = true;
      }
      const sync = () => { setCanonical(el.value || ""); setDisplay(conv.toDisplay(el.value || "")); };
      el.addEventListener("input", sync);
      el.addEventListener("change", sync);
      return () => {
        el.removeEventListener("input", sync);
        el.removeEventListener("change", sync);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controlled]);

    const handleVisibleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = conv.mask(e.target.value);
      const next = conv.toValue(masked);
      setDisplay(masked);   // free-typing display (partials persist)
      setCanonical(next);   // controls hidden.value → RHF/consumer read this
      // Notify RHF register's onChange / controlled onChange DIRECTLY. We pass a
      // minimal synthetic event whose target carries the canonical value + name;
      // RHF reads e.target.value. The hidden input (controlled by `canonical`)
      // will also hold `next` after this render, so ref reads agree.
      onChange?.({
        target: { value: next, name, type: "text" },
        currentTarget: hiddenRef.current,
        type: "change",
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <span className="relative block w-full">
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          autoComplete="off"
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          placeholder={placeholder ?? conv.placeholder}
          value={display}
          onChange={handleVisibleChange}
          className={cn(INPUT_CLASS, className)}
        />
        {/* Hidden canonical value, React-CONTROLLED by `canonical` so
            hidden.value === canonical deterministically (RHF reads it at submit
            via ref). Carries name/ref/onBlur for RHF; its own onChange is a noop
            because we drive canonical from the visible field. */}
        <input
          {...rest}
          ref={setHiddenRef}
          type="hidden"
          name={name}
          value={canonical}
          readOnly
          onBlur={onBlur as React.FocusEventHandler<HTMLInputElement>}
        />
      </span>
    );
  }
);
MaskedField.displayName = "MaskedField";

export const DateField = React.forwardRef<HTMLInputElement, Omit<MaskedFieldProps, "kind">>(
  (props, ref) => <MaskedField {...props} kind="date" ref={ref} />
);
DateField.displayName = "DateField";

export const TimeField = React.forwardRef<HTMLInputElement, Omit<MaskedFieldProps, "kind">>(
  (props, ref) => <MaskedField {...props} kind="time" ref={ref} />
);
TimeField.displayName = "TimeField";

export const DateTimeField = React.forwardRef<HTMLInputElement, Omit<MaskedFieldProps, "kind">>(
  (props, ref) => <MaskedField {...props} kind="datetime" ref={ref} />
);
DateTimeField.displayName = "DateTimeField";
