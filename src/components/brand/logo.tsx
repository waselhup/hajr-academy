import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "full" | "mark" | "text";

/* ── per-size dimensions ──────────────────────────────────── */
const SIZES: Record<
  LogoSize,
  { word: string; sep: string; a: string; deg: string; sub: string; subTrack: string }
> = {
  sm: {
    word: "text-xl",
    sep: "h-5 w-px",
    a: "text-lg",
    deg: "text-[0.55rem]",
    sub: "text-[0.5rem]",
    subTrack: "tracking-[0.32em]",
  },
  md: {
    word: "text-3xl",
    sep: "h-8 w-px",
    a: "text-2xl",
    deg: "text-xs",
    sub: "text-[0.6rem]",
    subTrack: "tracking-[0.34em]",
  },
  lg: {
    word: "text-5xl sm:text-6xl",
    sep: "h-12 w-[1.5px] sm:h-14",
    a: "text-4xl sm:text-5xl",
    deg: "text-base sm:text-lg",
    sub: "text-xs sm:text-sm",
    subTrack: "tracking-[0.4em]",
  },
};

/* ── HAJR | A° lockup (the "mark") ────────────────────────── */
function Mark({
  size,
  light,
}: {
  size: LogoSize;
  light: boolean;
}) {
  const s = SIZES[size];
  const word = light ? "text-white" : "text-hajr-navy";
  // logo lockup is intentionally LTR in both languages
  return (
    <span dir="ltr" className="flex items-baseline gap-1.5 font-en leading-none">
      <span className={cn("font-extrabold tracking-tighter", s.word, word)}>HAJR</span>
      <span className={cn("self-center bg-hajr-rose", s.sep)} />
      <span className="flex items-baseline">
        <span className={cn("font-semibold tracking-tight text-hajr-rose", s.a)}>A</span>
        <span className={cn("font-medium text-hajr-rose", s.deg)}>°</span>
      </span>
    </span>
  );
}

/* ── ACADEMY caption ──────────────────────────────────────── */
function Caption({
  size,
  light,
}: {
  size: LogoSize;
  light: boolean;
}) {
  const s = SIZES[size];
  return (
    <span
      dir="ltr"
      className={cn(
        "block font-en font-medium uppercase",
        s.sub,
        s.subTrack,
        light ? "text-white/70" : "text-hajr-gray-500"
      )}
    >
      Academy
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
 * - `full`  → HAJR|A° lockup + ACADEMY caption
 * - `mark`  → just the HAJR|A° lockup
 * - `text`  → just the ACADEMY caption
 */
export function HajrLogo({
  size = "md",
  variant = "full",
  light = false,
  className,
}: HajrLogoProps) {
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
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <Mark size={size} light={light} />
      <Caption size={size} light={light} />
    </span>
  );
}

/* ── backward-compatible exports ──────────────────────────── */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return <HajrLogo size="md" variant="full" light={light} className={className} />;
}

export function LogoMark({ className }: { className?: string }) {
  return <HajrLogo size="md" variant="mark" className={className} />;
}
