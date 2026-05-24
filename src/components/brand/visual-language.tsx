/**
 * HAJR A° brand v3 — visual language motifs.
 *
 * Two reusable decorative components called out in the canonical
 * Figma brand book (sections 07 + the Monogram/AppIcon source):
 *
 *  • <GatewayLines>  Two thin vertical lines with a soft gradient
 *                    fade. Architectural metaphor — a doorway /
 *                    threshold. Used at the left edge of section
 *                    blocks or framing the A° monogram.
 *
 *  • <AWatermark>    Oversized A° in font-light (300), positioned
 *                    absolutely, opacity 0.03 — a whispered brand
 *                    presence on hero/section blocks.
 *
 * Both are decorative-only (aria-hidden) and `pointer-events-none`
 * so they never interfere with the interactive content above them.
 */
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────── */

interface GatewayLinesProps {
  /** Override the line color (defaults to deep navy or cream on dark). */
  color?: string;
  /** Height in px (default 50). */
  height?: number;
  /** Horizontal gap between the two lines in px (default 28). */
  gap?: number;
  /** Inherit dark surfaces so the gradient fades to cream instead. */
  light?: boolean;
  className?: string;
}

export function GatewayLines({
  color,
  height = 50,
  gap = 28,
  light = false,
  className,
}: GatewayLinesProps) {
  const lineColor = color ?? (light ? "#FAF6EE" : "#1E2A36");
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none inline-flex items-center justify-center",
        className
      )}
      style={{ gap }}
    >
      <span
        style={{
          width: 1,
          height,
          background: `linear-gradient(to bottom, transparent, ${lineColor} 20%, ${lineColor} 80%, transparent)`,
          opacity: 0.09,
          display: "inline-block",
        }}
      />
      <span
        style={{
          width: 1,
          height,
          background: `linear-gradient(to bottom, transparent, ${lineColor} 20%, ${lineColor} 80%, transparent)`,
          opacity: 0.09,
          display: "inline-block",
        }}
      />
    </span>
  );
}

/* ────────────────────────────────────────────────────────────── */

interface AWatermarkProps {
  /** Glyph color (defaults to deep navy). */
  color?: string;
  /** Opacity 0–1 (default 0.03 — whispered brand). */
  opacity?: number;
  /** Tailwind font-size class (default text-[18rem]). */
  size?: string;
  /** Position relative to the parent (parent should be `relative`). */
  position?: "br" | "bl" | "tr" | "tl" | "center";
  className?: string;
}

/**
 * Place inside a `position: relative` container. Defaults to bottom-
 * right at 3% opacity, light-weight, oversized — the canonical
 * watermark pattern from section 07 of the Figma brand book.
 */
export function AWatermark({
  color = "#1E2A36",
  opacity = 0.03,
  size = "text-[18rem]",
  position = "br",
  className,
}: AWatermarkProps) {
  const pos = {
    br: "absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%]",
    bl: "absolute bottom-0 left-0 -translate-x-[10%] translate-y-[10%]",
    tr: "absolute top-0 right-0 translate-x-[10%] -translate-y-[10%]",
    tl: "absolute top-0 left-0 -translate-x-[10%] -translate-y-[10%]",
    center: "absolute inset-0 flex items-center justify-center",
  }[position];

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none select-none font-en font-light leading-none",
        pos,
        size,
        className
      )}
      style={{ color, opacity, fontWeight: 300, letterSpacing: "-0.02em" }}
    >
      A°
    </span>
  );
}
