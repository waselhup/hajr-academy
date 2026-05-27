"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Wallet,
  MessageSquare,
  ClipboardCheck,
  FlaskConical,
  FileText,
  Building2,
  Radio,
  ShieldCheck,
  Settings,
  User as UserIcon,
  ChevronLeft,
  ChevronDown,
  School,
  Receipt,
  BookText,
  BarChart3,
  BookCheck,
  Video,
  UserPlus,
  Bot,
  Palette,
  Inbox,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HajrLogo } from "@/components/brand/logo";
import type { Role } from "@prisma/client";

export type NavItem = {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
};

export type NavGroup = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  superAdminOnly?: boolean;
};

/**
 * Admin navigation as 7 groups + a top-level Dashboard link.
 * Used by both desktop sidebar and the mobile drawer.
 */
export const ADMIN_DASHBOARD_ITEM: NavItem = {
  key: "Nav.dashboard",
  href: "/admin",
  icon: LayoutDashboard,
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    key: "Nav.groupPeople",
    icon: Users,
    items: [
      { key: "Nav.students", href: "/admin/students", icon: Users },
      { key: "Nav.teachers", href: "/admin/teachers", icon: GraduationCap },
      { key: "Nav.parents", href: "/admin/parents", icon: UserIcon },
      { key: "Nav.schools", href: "/admin/schools", icon: Building2 },
    ],
  },
  {
    key: "Nav.groupAcademics",
    icon: GraduationCap,
    items: [
      { key: "Nav.programs", href: "/admin/programs", icon: BookOpen },
      { key: "Nav.classes", href: "/admin/classes", icon: BookText },
      { key: "Nav.schedule", href: "/admin/schedule", icon: Calendar },
      { key: "Nav.trials", href: "/admin/trials", icon: UserPlus },
    ],
  },
  {
    key: "Nav.groupContent",
    icon: BookOpen,
    items: [
      { key: "Nav.testBank", href: "/admin/test-bank", icon: BookOpen },
      { key: "Nav.mockExams", href: "/admin/exams", icon: ClipboardCheck },
      { key: "Nav.lab", href: "/admin/lab/exercises", icon: FlaskConical },
      { key: "Nav.blackboards", href: "/admin/blackboards", icon: Palette },
    ],
  },
  {
    key: "Nav.groupFinance",
    icon: Wallet,
    items: [{ key: "Nav.finance", href: "/admin/finance", icon: Wallet }],
  },
  {
    key: "Nav.groupComms",
    icon: MessageSquare,
    items: [
      { key: "Nav.messages", href: "/messages", icon: MessageSquare },
      { key: "Nav.adminChats", href: "/admin/communications/chats", icon: MessagesSquare },
      { key: "Nav.contactRequests", href: "/admin/communications/contacts", icon: Inbox },
      { key: "Nav.commsTemplates", href: "/admin/communications/templates", icon: FileText },
      { key: "Nav.commsHub", href: "/admin/communications", icon: BarChart3 },
    ],
  },
  {
    key: "Nav.groupSystem",
    icon: Settings,
    items: [
      { key: "Nav.live", href: "/admin/live", icon: Radio },
      { key: "Nav.recordings", href: "/admin/recordings", icon: Video },
      { key: "Nav.hajrAI", href: "/admin/ai", icon: Bot },
      { key: "Nav.auditLog", href: "/admin/audit-log", icon: ShieldCheck, superAdminOnly: true },
      { key: "Nav.settings", href: "/admin/settings", icon: Settings, superAdminOnly: true },
    ],
  },
];

/** Filter groups & items by role (drop superAdminOnly when ADMIN). */
export function filterAdminGroups(role: Role): NavGroup[] {
  const isSuper = role === "SUPER_ADMIN";
  return ADMIN_NAV_GROUPS
    .filter((g) => isSuper || !g.superAdminOnly)
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => isSuper || !i.superAdminOnly),
    }))
    .filter((g) => g.items.length > 0);
}

/** Flatten admin nav for active-state matching. */
function adminFlatItems(role: Role): NavItem[] {
  return [
    ADMIN_DASHBOARD_ITEM,
    ...filterAdminGroups(role).flatMap((g) => g.items),
  ];
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  // Admin/super-admin lists are flat fallbacks for legacy isNavActive
  // callers; the real rendering uses ADMIN_NAV_GROUPS.
  SUPER_ADMIN: [
    ADMIN_DASHBOARD_ITEM,
    ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
  ],
  ADMIN: [
    ADMIN_DASHBOARD_ITEM,
    ...ADMIN_NAV_GROUPS.flatMap((g) =>
      g.superAdminOnly ? [] : g.items.filter((i) => !i.superAdminOnly)
    ),
  ],
  TEACHER: [
    { key: "Nav.dashboard", href: "/teacher", icon: LayoutDashboard },
    { key: "Nav.myClasses", href: "/teacher/classes", icon: BookText },
    { key: "Nav.myStudents", href: "/teacher/students", icon: Users },
    { key: "Nav.assignments", href: "/teacher/assignments", icon: BookCheck },
    { key: "Nav.messages", href: "/messages", icon: MessageSquare },
    { key: "Nav.profile", href: "/teacher/profile", icon: UserIcon },
  ],
  STUDENT: [
    { key: "Nav.dashboard", href: "/student", icon: LayoutDashboard },
    { key: "Nav.myClasses", href: "/student/classes", icon: BookText },
    { key: "Nav.assignments", href: "/student/assignments", icon: BookCheck },
    { key: "Nav.messages", href: "/messages", icon: MessageSquare },
    { key: "Nav.myInvoices", href: "/student/billing", icon: Receipt },
  ],
  PARENT: [
    { key: "Nav.dashboard", href: "/parent", icon: LayoutDashboard },
    { key: "Nav.children", href: "/parent/link", icon: School },
    { key: "Nav.attendance", href: "/parent/attendance", icon: Calendar },
    { key: "Nav.progress", href: "/parent/progress", icon: BarChart3 },
    { key: "Nav.finance", href: "/parent/finance", icon: Wallet },
    { key: "Nav.messages", href: "/messages", icon: MessageSquare },
    { key: "Nav.settings", href: "/settings/notifications", icon: Settings },
  ],
  MARKETER: [
    { key: "Nav.marketerDashboard", href: "/marketer", icon: LayoutDashboard },
    { key: "Nav.marketerReferrals", href: "/marketer/referrals", icon: UserPlus },
    { key: "Nav.marketerCommissions", href: "/marketer/commissions", icon: Wallet },
    { key: "Nav.marketerProfile", href: "/marketer/profile", icon: UserIcon },
    { key: "Nav.messages", href: "/messages", icon: MessageSquare },
    { key: "Nav.calendar", href: "/calendar", icon: Calendar },
  ],
};

/**
 * Whether `href` is the active nav item for `pathname`.
 *
 * Strips the `/ar` | `/en` locale prefix, then matches a route prefix.
 * Among sibling items, the longest matching href wins.
 */
export function isNavActive(
  pathname: string,
  href: string,
  siblings: NavItem[]
): boolean {
  const path = pathname.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
  const matches = (h: string) => path === h || path.startsWith(`${h}/`);
  if (!matches(href)) return false;
  const longer = siblings
    .map((s) => s.href)
    .filter((h) => h.length > href.length && matches(h));
  return longer.length === 0;
}

/** Is any item in this group the active route? */
function isGroupActive(pathname: string, group: NavGroup, allFlat: NavItem[]): boolean {
  return group.items.some((it) => isNavActive(pathname, it.href, allFlat));
}

const LS_PREFIX = "hajr.nav.";

export function Sidebar({ role }: { role: Role }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isAdminish = role === "SUPER_ADMIN" || role === "ADMIN";

  if (isAdminish) {
    return (
      <AdminSidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
    );
  }

  const items = NAV_BY_ROLE[role];
  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen sticky top-0 flex-col bg-hajr-deep-navy text-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const isActive = isNavActive(pathname, item.href, items);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  title={collapsed ? t(item.key as any) : undefined}
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
                      "h-[1.1rem] w-[1.1rem] shrink-0",
                      isActive ? "text-white" : "text-white/70 group-hover:text-white"
                    )}
                  />
                  {!collapsed && <span className="truncate">{t(item.key as any)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <SidebarFooter collapsed={collapsed} roleLabel={t(("Roles." + role) as any)} />
    </aside>
  );
}

function SidebarHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
      {collapsed ? <HajrLogo size="sm" variant="mark" light /> : <HajrLogo size="sm" variant="full" light />}
      <button
        aria-label="Collapse"
        onClick={onToggle}
        className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform rtl-flip", collapsed && "rotate-180")} />
      </button>
    </div>
  );
}

function SidebarFooter({ collapsed, roleLabel }: { collapsed: boolean; roleLabel: string }) {
  return (
    <div className="border-t border-white/10 px-4 py-3">
      {!collapsed ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-hajr-mint" />
          <span className="text-xs font-medium text-white/60">{roleLabel}</span>
        </div>
      ) : (
        <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-hajr-mint" />
      )}
    </div>
  );
}

/** ─────────────── Admin sidebar with collapsible groups ─────────────── */
function AdminSidebar({
  role,
  collapsed,
  onToggleCollapse,
}: {
  role: Role;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const groups = filterAdminGroups(role);
  const allFlat = adminFlatItems(role);

  // Per-group open/closed state, persisted in localStorage. A group is
  // open when LS says "open", OR when the active route lives inside it,
  // OR (default) when LS is empty for that group.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.key] = true;
    return init;
  });

  // Hydrate from localStorage once on mount + auto-open active group.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(LS_PREFIX + g.key) : null;
      const active = isGroupActive(pathname, g, allFlat);
      if (active) next[g.key] = true;
      else if (stored === "closed") next[g.key] = false;
      else next[g.key] = true; // default open
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
    <aside
      className={cn(
        "hidden lg:flex h-screen sticky top-0 flex-col bg-hajr-deep-navy text-white transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggleCollapse} />

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {/* Top-level dashboard link (always visible, no group) */}
        <SidebarLink
          item={ADMIN_DASHBOARD_ITEM}
          pathname={pathname}
          allFlat={allFlat}
          collapsed={collapsed}
          t={t}
        />

        <div className="mt-2 space-y-1">
          {groups.map((g) => {
            // Collapsed mode: flatten — just render items with icons.
            if (collapsed) {
              return g.items.map((item) => (
                <SidebarLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  allFlat={allFlat}
                  collapsed
                  t={t}
                />
              ));
            }

            const open = !!openMap[g.key];
            const active = isGroupActive(pathname, g, allFlat);
            const GroupIcon = g.icon;
            return (
              <div key={g.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-150",
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
                      <SidebarLink
                        key={item.key}
                        item={item}
                        pathname={pathname}
                        allFlat={allFlat}
                        collapsed={false}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <SidebarFooter collapsed={collapsed} roleLabel={t(("Roles." + role) as any)} />
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
  allFlat,
  collapsed,
  t,
}: {
  item: NavItem;
  pathname: string;
  allFlat: NavItem[];
  collapsed: boolean;
  t: (k: string) => string;
}) {
  const isActive = isNavActive(pathname, item.href, allFlat);
  const Icon = item.icon;
  return (
    <li className="list-none">
      <Link
        href={item.href}
        title={collapsed ? t(item.key as any) : undefined}
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
            "h-[1.1rem] w-[1.1rem] shrink-0",
            isActive ? "text-white" : "text-white/70 group-hover:text-white"
          )}
        />
        {!collapsed && <span className="truncate">{t(item.key as any)}</span>}
      </Link>
    </li>
  );
}
