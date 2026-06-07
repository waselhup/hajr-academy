"use client";
/**
 * Floating "re-open the sidebar" handle (F7, owner batch 4A).
 *
 * Rendered ONCE in the (app) layout, so it is present on every page of every
 * role shell (admin + teacher + student + parent + marketer). It gives users a
 * persistent, always-findable way back to the nav after they hide it:
 *
 *   • Desktop (lg+): shown ONLY while the sidebar is collapsed. It sits just
 *     outside the collapsed w-16 rail (start-16) so it reads as a clear "pull
 *     the panel back" tab and never overlaps the rail. Clicking expands the
 *     sidebar (sidebarStore.setCollapsed(false)). Hidden while open.
 *   • Mobile (<lg): the desktop sidebar is display:none, so the handle is always
 *     shown, pinned to the edge (start-0), and opens the slide-in MobileSidebar
 *     drawer via the store pulse.
 *
 * A small tab vertically centered on the inline-start edge. RTL-safe (logical
 * `start-*`, chevron uses `rtl-flip`).
 */
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { sidebarStore } from "./sidebar-store";
import { useSidebarCollapsed } from "./use-sidebar-store";
import { cn } from "@/lib/utils";

const TAB_CLASS =
  "fixed top-1/2 z-40 -translate-y-1/2 items-center justify-center h-12 w-6 " +
  "rounded-e-lg border border-s-0 border-white/10 bg-hajr-deep-navy text-white shadow-lg " +
  "transition-colors hover:bg-hajr-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-hajr-rose";

export function SidebarReopenHandle() {
  const t = useTranslations("Common");
  const collapsed = useSidebarCollapsed();
  const label = t("openSidebar");

  return (
    <>
      {/* Desktop: only when collapsed → expand the sidebar (sits beside the rail). */}
      <button
        type="button"
        onClick={() => sidebarStore.setCollapsed(false)}
        aria-label={label}
        title={label}
        className={cn(TAB_CLASS, "hidden lg:start-16", collapsed ? "lg:flex" : "lg:hidden")}
      >
        <ChevronRight className="h-4 w-4 rtl-flip" aria-hidden />
      </button>

      {/* Mobile: always available → open the slide-in drawer (pinned to edge). */}
      <button
        type="button"
        onClick={() => sidebarStore.requestMobileOpen()}
        aria-label={label}
        title={label}
        className={cn(TAB_CLASS, "flex start-0 lg:hidden")}
      >
        <ChevronRight className="h-4 w-4 rtl-flip" aria-hidden />
      </button>
    </>
  );
}
