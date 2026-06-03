"use client";
import { useEffect, useState } from "react";
// Locale-aware Link + usePathname (next-intl) keep navigation inside the
// current locale; raw next/link would bounce the user back to the default.
import { Link, usePathname } from "@/i18n/routing";
import { Menu, X, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HajrLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import {
  NAV_BY_ROLE,
  isNavActive,
  ADMIN_DASHBOARD_ITEM,
  filterAdminGroups,
  groupsForRole,
  type NavItem,
  type NavGroup,
} from "./sidebar";

const LS_PREFIX = "hajr.nav.";

export function MobileSidebar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();
  const isAdminish = role === "SUPER_ADMIN" || role === "ADMIN";
  const grouped = groupsForRole(role);

  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-hajr-deep-navy/50 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="absolute start-0 top-0 h-full w-64 bg-hajr-deep-navy text-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <HajrLogo size="sm" variant="full" light />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav
              className="overflow-y-auto p-2"
              style={{ maxHeight: "calc(100vh - 4rem)" }}
            >
              {isAdminish ? (
                <GroupedMobileNav
                  kind="admin"
                  role={role}
                  pathname={pathname}
                  t={t}
                  onNavigate={() => setOpen(false)}
                />
              ) : grouped ? (
                <GroupedMobileNav
                  kind="role"
                  role={role}
                  pathname={pathname}
                  t={t}
                  onNavigate={() => setOpen(false)}
                />
              ) : (
                <FlatMobileNav role={role} pathname={pathname} t={t} onNavigate={() => setOpen(false)} />
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function FlatMobileNav({
  role,
  pathname,
  t,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  t: (k: string) => string;
  onNavigate: () => void;
}) {
  const items = NAV_BY_ROLE[role];
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isNavActive(pathname, item.href, items);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/70 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              {isActive && (
                <span className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-hajr-rose" />
              )}
              <Icon
                className={cn(
                  "h-[1.1rem] w-[1.1rem]",
                  isActive ? "text-white" : "text-white/70 group-hover:text-white"
                )}
              />
              <span>{t(item.key as any)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function GroupedMobileNav({
  kind,
  role,
  pathname,
  t,
  onNavigate,
}: {
  kind: "admin" | "role";
  role: Role;
  pathname: string;
  t: (k: string) => string;
  onNavigate: () => void;
}) {
  let dashboard: NavItem;
  let groups: NavGroup[];
  let trailing: NavItem[] = [];

  if (kind === "admin") {
    dashboard = ADMIN_DASHBOARD_ITEM;
    groups = filterAdminGroups(role);
  } else {
    const g = groupsForRole(role)!;
    dashboard = g.dashboard;
    groups = g.groups;
    trailing = g.trailing;
  }
  const allFlat: NavItem[] = [dashboard, ...groups.flatMap((g) => g.items), ...trailing];

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.key] = true;
    return init;
  });

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(LS_PREFIX + g.key) : null;
      const active = g.items.some((it) => isNavActive(pathname, it.href, allFlat));
      if (active) next[g.key] = true;
      else if (stored === "closed") next[g.key] = false;
      else next[g.key] = true;
    }
    setOpenMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (key: string) => {
    setOpenMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(LS_PREFIX + key, next[key] ? "open" : "closed");
      } catch {}
      return next;
    });
  };

  return (
    <div>
      <MobileLink item={dashboard} pathname={pathname} allFlat={allFlat} t={t} onNavigate={onNavigate} />
      <div className="mt-2 space-y-1">
        {groups.map((g) => {
          const open = !!openMap[g.key];
          const GroupIcon = g.icon;
          const active = g.items.some((it) => isNavActive(pathname, it.href, allFlat));
          return (
            <div key={g.key}>
              <button
                type="button"
                onClick={() => toggleGroup(g.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-150",
                  "text-white/50 hover:text-white/80",
                  active && "text-white/80"
                )}
              >
                <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-start">{t(g.key as any)}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-150",
                    open ? "rotate-0" : "-rotate-90 rtl-flip"
                  )}
                />
              </button>
              {open && (
                <ul className="mt-0.5 ms-3 space-y-0.5 border-s border-white/10 ps-1">
                  {g.items.map((item) => (
                    <MobileLink
                      key={item.key}
                      item={item}
                      pathname={pathname}
                      allFlat={allFlat}
                      t={t}
                      onNavigate={onNavigate}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {trailing.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <ul className="space-y-0.5">
            {trailing.map((item) => (
              <MobileLink
                key={item.key}
                item={item}
                pathname={pathname}
                allFlat={allFlat}
                t={t}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MobileLink({
  item,
  pathname,
  allFlat,
  t,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  allFlat: NavItem[];
  t: (k: string) => string;
  onNavigate: () => void;
}) {
  const isActive = isNavActive(pathname, item.href, allFlat);
  const Icon = item.icon;
  return (
    <li className="list-none">
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
          isActive
            ? "bg-white/[0.08] text-white"
            : "text-white/70 hover:bg-white/[0.05] hover:text-white"
        )}
      >
        {isActive && (
          <span className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-hajr-rose" />
        )}
        <Icon
          className={cn(
            "h-[1.1rem] w-[1.1rem]",
            isActive ? "text-white" : "text-white/70 group-hover:text-white"
          )}
        />
        <span>{t(item.key as any)}</span>
      </Link>
    </li>
  );
}
