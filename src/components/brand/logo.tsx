import { cn } from "@/lib/utils";

/**
 * HAJR A° brand v3 logo lockup — verbatim canonical Figma spec.
 *
 * Hard rules from the official brand book (do NOT change):
 *   • HAJR    — font-weight 700 (Bold)   letter-spacing -0.02em
 *   • A°      — font-weight 300 (Light)  color #B86E7B (mauve)
 *               size ~⅓–½ of the wordmark, marginLeft 0.1em,
 *               baseline-aligned to HAJR.
 *   • ACADEMY — weight 400, letter-spacing 0.3em, opacity 0.7,
 *               mt-4, centered under the lockup.
 *
 * The A° is intentionally a thin, restrained jewel against a bold
 * wordmark — anything heavier visually collapses the contrast that
 * makes the mark recognisable.
 */

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "full" | "mark" | "text" | "app-icon";

const SIZES: Record<
  LogoSize,
  {
    /** HAJR wordmark size */
    word: string;
    /** A° size (~33–50% of wordmark) */
    degree: string;
    /** ACADEMY caption size */
    academy: string;
    /** baseline gap between HAJR and A° group (marginLeft is also applied) */
    gap: string;
    /** spacing under the lockup before ACADEMY */
    captionGap: string;
  }
> = {
  sm: { word: "text-2xl",                 degree: "text-sm",  academy: "text-[8px]",  gap: "gap-1",   captionGap: "mt-2" },
  md: { word: "text-4xl",                 degree: "text-lg",  academy: "text-[10px]", gap: "gap-1.5", captionGap: "mt-3" },
  lg: { word: "text-6xl",                 degree: "text-2xl", academy: "text-xs",     gap: "gap-2",   captionGap: "mt-4" },
  xl: { word: "text-7xl sm:text-8xl",     degree: "text-3xl sm:text-4xl", academy: "text-sm",     gap: "gap-2 sm:gap-3", captionGap: "mt-4 sm:mt-5" },
};

/* ── HAJR + small mauve A° lockup ──────────────────────────── */
function Mark({ size, light }: { size: LogoSize; light: boolean }) {
  const s = SIZES[size];
  const mainColor = light ? "#FAF6EE" : "#1E2A36";
  // The lockup is intentionally LTR in both languages.
  return (
    <span
      dir="ltr"
      className={cn("inline-flex items-baseline leading-none font-en", s.gap)}
    >
      <span
        className={cn("font-bold", s.word)}
        style={{ color: mainColor, fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        HAJR
      </span>
      {/* A° — mauve, light weight, baseline-aligned, slight left margin */}
      <span
        className={cn("font-light", s.degree)}
        style={{
          color: "#B86E7B",
          fontWeight: 300,
          marginLeft: "0.1em",
        }}
      >
        A°
      </span>
    </span>
  );
}

/* ── ACADEMY caption ──────────────────────────────────────── */
function Caption({ size, light }: { size: LogoSize; light: boolean }) {
  const s = SIZES[size];
  const mainColor = light ? "#FAF6EE" : "#1E2A36";
  return (
    <span
      dir="ltr"
      className={cn("block font-en leading-none uppercase", s.academy)}
      style={{
        color: mainColor,
        letterSpacing: "0.3em",
        fontWeight: 400,
        opacity: 0.7,
      }}
    >
      ACADEMY
    </span>
  );
}

/* ── App-icon variant: dark gradient tile + centered mauve A° ─── */
function AppIcon({ size, className }: { size: LogoSize; className?: string }) {
  const dim = {
    sm: { box: "h-12 w-12 rounded-2xl",  glyph: "text-2xl" },
    md: { box: "h-20 w-20 rounded-2xl",  glyph: "text-4xl" },
    lg: { box: "h-32 w-32 rounded-3xl",  glyph: "text-6xl" },
    xl: { box: "h-44 w-44 rounded-3xl",  glyph: "text-7xl sm:text-8xl" },
  }[size];

  return (
    <span
      dir="ltr"
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden shadow-2xl",
        dim.box,
        className
      )}
      style={{
        background: "linear-gradient(135deg, #1E2A36 0%, #2C3E50 100%)",
      }}
    >
      {/* Mint accent glow top-right */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 h-1/2 w-1/2 rounded-full blur-3xl"
        style={{
          backgroundColor: "#B5E5D8",
          opacity: 0.06,
          transform: "translate(30%, -30%)",
        }}
      />
      {/* Rose accent glow bottom-left */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-2/3 w-2/3 rounded-full blur-3xl"
        style={{
          backgroundColor: "#B86E7B",
          opacity: 0.04,
          transform: "translate(-30%, 30%)",
        }}
      />
      {/* Centered A° */}
      <span
        className={cn("relative font-light leading-none", dim.glyph)}
        style={{
          color: "#B86E7B",
          fontWeight: 300,
          letterSpacing: "-0.02em",
        }}
      >
        A°
      </span>
    </span>
  );
}

export interface HajrLogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  /** render light (cream) for use on navy backgrounds */
  light?: boolean;
  className?: string;
}

/**
 * HAJR A° brand logo.
 * - `full`     → HAJR A° lockup + ACADEMY caption beneath
 * - `mark`     → just the HAJR A° lockup
 * - `text`     → just the ACADEMY caption
 * - `app-icon` → mauve A° on a navy gradient rounded tile
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
    <span className={cn("inline-flex flex-col items-center", SIZES[size].captionGap, className)}>
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
