"use client";

/**
 * Mobile bottom nav — visible on <sm. Role-aware destinations.
 * Tap targets ≥ 44px. Active state: a small rose dot above the icon +
 * deep-navy text. Inactive: muted gray.
 *
 * Unread bell badge on the Messages tab — polls /api/notifications?filter=unread
 * once on mount; updated subscriptions are handled by the existing bell
 * realtime channel (it touches the same Notification table).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Home, Calendar as CalendarIcon, MessageSquare, User as UserIcon,
  Search, Users as UsersIcon, FlaskConical, Radio, BarChart3,
  Receipt, BookText, Megaphone, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type Tab = {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "messages";
  cmdK?: boolean;
};

const TABS_BY_ROLE: Record<Role, Tab[]> = {
  SUPER_ADMIN: [
    { key: "Nav.bottomNavHome",     href: "/admin",       icon: Home },
    { key: "Nav.bottomNavCalendar", href: "/calendar",    icon: CalendarIcon },
    { key: "Nav.bottomNavMessages", href: "/messages",    icon: MessageSquare, badge: "messages" },
    { key: "Nav.bottomNavLive",     href: "/admin/live",  icon: Radio },
    { key: "Nav.bottomNavSearch",   href: "#cmdk",        icon: Search, cmdK: true },
  ],
  ADMIN: [
    { key: "Nav.bottomNavHome",     href: "/admin",       icon: Home },
    { key: "Nav.bottomNavCalendar", href: "/calendar",    icon: CalendarIcon },
    { key: "Nav.bottomNavMessages", href: "/messages",    icon: MessageSquare, badge: "messages" },
    { key: "Nav.bottomNavLive",     href: "/admin/live",  icon: Radio },
    { key: "Nav.bottomNavSearch",   href: "#cmdk",        icon: Search, cmdK: true },
  ],
  TEACHER: [
    { key: "Nav.bottomNavHome",     href: "/teacher",          icon: Home },
    { key: "Nav.bottomNavClasses",  href: "/teacher/classes",  icon: BookText },
    { key: "Nav.bottomNavMessages", href: "/messages",         icon: MessageSquare, badge: "messages" },
    { key: "Nav.bottomNavCalendar", href: "/calendar",         icon: CalendarIcon },
    { key: "Nav.bottomNavProfile",  href: "/teacher/profile",  icon: UserIcon },
  ],
  STUDENT: [
    { key: "Nav.bottomNavHome",     href: "/student",         icon: Home },
    { key: "Nav.bottomNavClasses",  href: "/student/classes", icon: BookText },
    { key: "Nav.bottomNavLab",      href: "/student/lab",     icon: FlaskConical },
    { key: "Nav.bottomNavMessages", href: "/messages",        icon: MessageSquare, badge: "messages" },
    { key: "Nav.bottomNavProfile",  href: "/student/profile", icon: UserIcon },
  ],
  PARENT: [
    { key: "Nav.bottomNavHome",     href: "/parent",          icon: Home },
    { key: "Nav.bottomNavReports",  href: "/parent/reports",  icon: BarChart3 },
    { key: "Nav.bottomNavMessages", href: "/messages",        icon: MessageSquare, badge: "messages" },
    { key: "Nav.bottomNavBilling",  href: "/parent/finance",  icon: Receipt },
    { key: "Nav.bottomNavCalendar", href: "/calendar",        icon: CalendarIcon },
  ],
  MARKETER: [
    { key: "Nav.bottomNavHome",        href: "/marketer",                 icon: Home },
    { key: "Nav.bottomNavReferrals",   href: "/marketer/referrals",       icon: Megaphone },
    { key: "Nav.bottomNavCommissions", href: "/marketer/commissions",     icon: Wallet },
    { key: "Nav.bottomNavMessages",    href: "/messages",                 icon: MessageSquare, badge: "messages" },
    { key: "Nav.bottomNavProfile",     href: "/marketer/profile",         icon: UserIcon },
  ],
};

export function MobileBottomNav({ role }: { role: Role }) {
  const t = useTranslations();
  const pathname = usePathname();
  const path = pathname.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
  const tabs = TABS_BY_ROLE[role] ?? [];
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/notifications?filter=unread&page=1", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setUnread(Number(j.total ?? 0));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hajr-border bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.04)] sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-5">
        {tabs.map((tab) => {
          const active =
            tab.cmdK ? false : path === tab.href || path.startsWith(tab.href + "/");
          const Icon = tab.icon;
          const showBadge = tab.badge === "messages" && unread > 0;
          const content = (
            <>
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" />
                {active && (
                  <span className="absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-hajr-rose" />
                )}
                {showBadge && (
                  <span className="absolute -end-2 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-hajr-rose px-1 text-[0.6rem] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className="mt-0.5 text-[0.65rem] leading-none">{t(tab.key as any)}</span>
            </>
          );
          const classes = cn(
            "flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5",
            active ? "text-hajr-deep-navy font-semibold" : "text-hajr-muted"
          );
          return (
            <li key={tab.key}>
              {tab.cmdK ? (
                <button
                  className={classes}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("hajr:open-command-palette"));
                  }}
                  aria-label={t(tab.key as any)}
                >
                  {content}
                </button>
              ) : (
                <Link href={tab.href} className={classes} aria-label={t(tab.key as any)}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
