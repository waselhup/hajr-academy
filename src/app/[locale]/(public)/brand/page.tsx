import type { Metadata } from "next";
import { BrandBookClient } from "./brand-book-client";

export const metadata: Metadata = {
  title: "Brand Book — HAJR A° Academy",
  description:
    "The official HAJR A° Academy brand book and design system — version 1.0, 2026. Logo, color, typography, components, stationery, social and marketing templates.",
};

/**
 * /brand — the public 25-section brand book mirroring the Figma
 * source (https://desk-studio-27726469.figma.site). Sidebar
 * navigation with a sticky 260-px rail and active-row highlight.
 *
 * Static content rendered server-side; sidebar interaction lives
 * in the client component.
 */
export default function BrandBookPage() {
  return <BrandBookClient />;
}
