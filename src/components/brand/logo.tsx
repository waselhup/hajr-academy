import { cn } from "@/lib/utils";

/**
 * HAJR A° brand v3 logo lockup.
 *
 * The "A°" sits at ~35% of the wordmark cap-height — a small jewel
 * baseline-aligned to "HAJR", with the "°" tucked above the A's
 * cap-height. This proportion mirrors the official brand reference.
 */

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "full" | "mark" | "text" | "app-icon";

/* ── per-size dimensions ─────────────────────────────────────
   word  — the "HAJR" wordmark
   a     — the "A" — roughly 0.35× the wordmark cap-height
   deg   — the "°" — roughly 0.55× the A
   gap   — gap between wordmark and the A°
   sub   — the "ACADEMY" caption
   subTrack — letter-spacing on the caption
*/
const SIZES: Record<
  LogoSize,
  {
    word: string;
    a: string;
    deg: string;
    gap: string;
    sub: string;
    subTrack: string;
  }
> = {
  sm: {
    word: "text-xl",
    a: "text-[0.55rem]",
    deg: "text-[0.4rem]",
    gap: "gap-1",
    sub: "text-[0.45rem]",
    subTrack: "tracking-[0.32em]",
  },
  md: {
    word: "text-3xl",
    a: "text-[0.85rem]",
    deg: "text-[0.55rem]",
    gap: "gap-1.5",
    sub: "text-[0.6rem]",
    subTrack: "tracking-[0.34em]",
  },
  lg: {
    word: "text-5xl sm:text-6xl",
    a: "text-base sm:text-lg",
    deg: "text-[0.7rem] sm:text-xs",
    gap: "gap-2 sm:gap-2.5",
    sub: "text-xs sm:text-sm",
    subTrack: "tracking-[0.4em]",
  },
  xl: {
    word: "text-7xl sm:text-8xl",
    a: "text-xl sm:text-2xl",
    deg: "text-sm sm:text-base",
    gap: "gap-3 sm:gap-4",
    sub: "text-sm sm:text-base",
    subTrack: "tracking-[0.45em]",
  },
};

/* ── HAJR + tiny A° lockup ──────────────────────────────────── */
function Mark({ size, light }: { size: LogoSize; light: boolean }) {
  const s = SIZES[size];
  const word = light ? "text-white" : "text-hajr-deep-navy";
  // Lockup is intentionally LTR in both languages.
  return (
    <span
      dir="ltr"
      className={cn("inline-flex items-baseline leading-none font-en", s.gap)}
    >
      <span className={cn("font-extrabold tracking-tighter", s.word, word)}>
        HAJR
      </span>
      {/* The tiny A° pair — baseline-aligned to the wordmark */}
      <span className="inline-flex items-baseline leading-none">
        <span
          className={cn(
            "font-semibold tracking-tight text-hajr-rose",
            s.a
          )}
        >
          A
        </span>
        {/* The ° hovers above the A's cap-height — render it as a
            superscript glyph at ~0.6× the A's size. */}
        <span
          className={cn(
            "self-start font-medium leading-none text-hajr-rose",
            s.deg
          )}
          style={{ transform: "translateY(-0.05em)" }}
        >
          °
        </span>
      </span>
    </span>
  );
}

/* ── ACADEMY caption ──────────────────────────────────────── */
function Caption({ size, light }: { size: LogoSize; light: boolean }) {
  const s = SIZES[size];
  return (
    <span
      dir="ltr"
      className={cn(
        "block font-en font-medium uppercase leading-none",
        s.sub,
        s.subTrack,
        light ? "text-white/70" : "text-hajr-muted"
      )}
    >
      Academy
    </span>
  );
}

/* ── App-icon variant: rose A° centered on a navy rounded square ── */
function AppIcon({ size, className }: { size: LogoSize; className?: string }) {
  const dim = {
    sm: "h-10 w-10 text-base",
    md: "h-14 w-14 text-xl",
    lg: "h-20 w-20 text-3xl",
    xl: "h-32 w-32 text-5xl",
  }[size];
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-flex items-baseline justify-center rounded-[14%] bg-hajr-deep-navy shadow-lg",
        dim,
        className
      )}
    >
      <span className="inline-flex items-baseline leading-none font-en font-semibold text-hajr-rose pt-[10%]">
        A
        <span
          className="self-start font-medium leading-none"
          style={{ transform: "translateY(-0.05em)", fontSize: "0.6em" }}
        >
          °
        </span>
      </span>
    </span>
  );
}

export interface HajrLogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  /** render light (white) for use on navy backgrounds */
  light?: boolean;
  className?: string;
}

/**
 * HAJR A° brand logo.
 * - `full`     → HAJR A° lockup + ACADEMY caption beneath
 * - `mark`     → just the HAJR A° lockup
 * - `text`     → just the ACADEMY caption
 * - `app-icon` → A° on a navy rounded square (favicon-style)
 */
export function HajrLogo({
  size = "md",
  variant = "full",
  light = false,
  className,
}: HajrLogoProps) {
  if (variant === "app-icon") {
    return <AppIcon size={size} className={className} />;
  }
  if (variant === "mark") {
    return (
      <span className={cn("inline-flex", className)}>
        <Mark size={size} light={light} />
      </span>
    );
  }
  if (variant === "text") {
    return (
      <span className={cn("inline-flex", className)}>
        <Caption size={size} light={light} />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex flex-col items-center gap-2", className)}>
      <Mark size={size} light={light} />
      <Caption size={size} light={light} />
    </span>
  );
}

/* ── backward-compatible exports ──────────────────────────── */
export function Logo({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return <HajrLogo size="md" variant="full" light={light} className={className} />;
}

export function LogoMark({ className }: { className?: string }) {
  return <HajrLogo size="md" variant="mark" className={className} />;
}
