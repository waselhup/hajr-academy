"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  CalendarCheck,
  ClipboardCheck,
  Video,
  LogOut,
} from "lucide-react";
import type { ApplicantFeature } from "@prisma/client";
import { cn } from "@/lib/utils";
import { HajrLogo } from "@/components/brand/logo";

type NavDef = {
  feature: ApplicantFeature;
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** The complete applicant nav, in order. Each item renders only if enabled. */
const APPLICANT_NAV: NavDef[] = [
  { feature: "OVERVIEW", key: "Applicant.navOverview", href: "/applicant", icon: LayoutDashboard },
  { feature: "OPENINGS", key: "Applicant.navOpenings", href: "/applicant/openings", icon: Megaphone },
  { feature: "MESSAGING", key: "Applicant.navMessages", href: "/applicant/messages", icon: MessageSquare },
  { feature: "MEETINGS", key: "Applicant.navMeetings", href: "/applicant/meetings", icon: CalendarCheck },
  { feature: "TEST", key: "Applicant.navTest", href: "/applicant/test", icon: ClipboardCheck },
  { feature: "DEMO_RECORDING", key: "Applicant.navDemo", href: "/applicant/demo", icon: Video },
];

function useVisibleNav(enabled: ApplicantFeature[]) {
  const set = new Set(enabled);
  // OVERVIEW is always shown; others only when enabled.
  return APPLICANT_NAV.filter((n) => n.feature === "OVERVIEW" || set.has(n.feature));
}

function isActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
  if (href === "/applicant") return path === "/applicant";
  return path === href || path.startsWith(href + "/");
}

/** Desktop sidebar — minimal, NOT the teacher shell. */
export function ApplicantSidebar({ enabled }: { enabled: ApplicantFeature[] }) {
  const t = useTranslations();
  const pathname = usePathname();
  const items = useVisibleNav(enabled);

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col bg-hajr-deep-navy text-white lg:sticky lg:top-0 lg:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <HajrLogo size="sm" variant="full" light />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-hajr-rose" />
                  )}
                  <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" />
                  <span className="truncate">{t(item.key as never)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 px-4 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {t("Common.logout")}
        </button>
      </div>
    </aside>
  );
}

/** Mobile bottom nav — same gated items, capped to keep tap targets ≥ 44px. */
export function ApplicantMobileNav({ enabled }: { enabled: ApplicantFeature[] }) {
  const t = useTranslations();
  const pathname = usePathname();
  const items = useVisibleNav(enabled).slice(0, 5);
  // Explicit map so Tailwind JIT keeps these classes (no dynamic interpolation).
  const colsClass =
    ({ 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" } as const)[
      Math.max(1, Math.min(items.length, 5)) as 1 | 2 | 3 | 4 | 5
    ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hajr-border bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.04)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className={cn("grid h-16", colsClass)}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-label={t(item.key as never)}
                className={cn(
                  "flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5",
                  active ? "font-semibold text-hajr-deep-navy" : "text-hajr-muted"
                )}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" />
                  {active && (
                    <span className="absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-hajr-rose" />
                  )}
                </span>
                <span className="mt-0.5 text-[0.65rem] leading-none">{t(item.key as never)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
