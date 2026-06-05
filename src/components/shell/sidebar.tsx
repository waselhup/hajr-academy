"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
// Locale-aware navigation: Link + usePathname from next-intl routing keep the
// active locale prefix sticky on every click. Raw next/link / next/navigation
// drop the prefix and bounce the user back to the default locale (the AR bug).
import { Link, usePathname } from "@/i18n/routing";
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
  Award,
  Megaphone,
  LineChart,
  Package,
  ShieldQuestion,
  Mic,
  Send,
  TestTube,
  LifeBuoy,
  ClipboardList,
  HandCoins,
  Sparkles,
  CalendarCheck,
  PiggyBank,
  Languages,
  Bell,
  CreditCard,
  ScrollText,
  Headphones,
  ArrowLeftRight,
  ActivitySquare,
  CalendarRange,
  ChartBar,
  ShieldAlert,
  Globe,
  Library,
  Wifi,
  Gauge,
  Trophy,
  Star,
  MessageSquareHeart,
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

/* =============================================================
 * ADMIN navigation — 5 tight parent-child groups.
 *
 * Restructured from the older 7-group layout to shorten the top-level
 * menu while keeping EVERY href reachable (nothing orphaned):
 *   • People                     (unchanged)
 *   • Academics & Content        (former Academics + Content merged — all
 *                                 teaching/curriculum surfaces live together)
 *   • Finance                    (former Finance + the money-related System
 *                                 items: marketers, commissions, teacher payouts)
 *   • Communications             (unchanged)
 *   • Operations & System        (former Operations + the remaining System
 *                                 items: tickets, schools, QA, audit logs)
 * superAdminOnly flags are preserved verbatim on every moved item.
 * ============================================================= */
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
      { key: "Nav.studentsTransfer", href: "/admin/students/transfer", icon: ArrowLeftRight },
      { key: "Nav.teachers", href: "/admin/teachers", icon: GraduationCap },
      { key: "Nav.applicants", href: "/admin/applicants", icon: UserPlus },
      { key: "Nav.teacherActivity", href: "/admin/teacher-activity", icon: ActivitySquare },
      { key: "Nav.teacherMeetings", href: "/admin/teacher-meetings", icon: CalendarCheck },
      { key: "Nav.parents", href: "/admin/parents", icon: UserIcon },
      { key: "Nav.parentInvites", href: "/admin/parent-invites", icon: Send },
    ],
  },
  {
    // Academics + Content merged: programs/classes/scheduling AND the
    // curriculum surfaces (test bank, exams, lab, blackboards, library, certs).
    key: "Nav.groupAcademics",
    icon: GraduationCap,
    items: [
      { key: "Nav.programs", href: "/admin/programs", icon: BookOpen },
      { key: "Nav.openings", href: "/admin/openings", icon: Megaphone },
      { key: "Nav.classes", href: "/admin/classes", icon: BookText },
      { key: "Nav.schedule", href: "/admin/schedule", icon: Calendar },
      { key: "Nav.attendance", href: "/admin/attendance", icon: ClipboardList },
      { key: "Nav.trials", href: "/admin/trials", icon: UserPlus },
      { key: "Nav.placementTests", href: "/admin/placement-tests", icon: TestTube },
      { key: "Nav.speakingClub", href: "/admin/speaking-club", icon: Mic },
      { key: "Nav.testBank", href: "/admin/test-bank", icon: BookOpen },
      { key: "Nav.mockExams", href: "/admin/exams", icon: ClipboardCheck },
      { key: "Nav.labHub", href: "/admin/lab", icon: FlaskConical },
      { key: "Nav.blackboards", href: "/admin/blackboards", icon: Palette },
      { key: "Nav.libraryHub", href: "/admin/library", icon: Library },
      { key: "Nav.certificates", href: "/admin/certificates", icon: Award },
    ],
  },
  {
    // Finance + the money-related System items folded in.
    key: "Nav.groupFinance",
    icon: Wallet,
    items: [
      { key: "Nav.financeOverview", href: "/admin/finance", icon: Wallet },
      { key: "Nav.orders", href: "/admin/orders", icon: Receipt },
      { key: "Nav.invoices", href: "/admin/finance/invoices", icon: Receipt },
      { key: "Nav.subscriptions", href: "/admin/finance/subscriptions", icon: Package },
      { key: "Nav.promoCodes", href: "/admin/finance/promo-codes", icon: Sparkles },
      { key: "Nav.refunds", href: "/admin/finance/refunds", icon: HandCoins },
      { key: "Nav.paymentRequests", href: "/admin/payment-requests", icon: PiggyBank },
      { key: "Nav.teacherPayouts", href: "/admin/teachers/payments", icon: CreditCard },
      { key: "Nav.adminMarketers", href: "/admin/marketers", icon: Megaphone },
      { key: "Nav.adminCommissions", href: "/admin/marketers/commissions", icon: LineChart },
    ],
  },
  {
    key: "Nav.groupComms",
    icon: MessageSquare,
    items: [
      { key: "Nav.messages", href: "/messages", icon: MessageSquare },
      { key: "Nav.adminChats", href: "/admin/communications/chats", icon: MessagesSquare },
      { key: "Nav.contactRequests", href: "/admin/communications/contacts", icon: Inbox },
      { key: "Nav.feedback", href: "/admin/feedback", icon: MessageSquareHeart },
      { key: "Nav.commsTemplates", href: "/admin/communications/templates", icon: FileText },
      { key: "Nav.commsLogs", href: "/admin/communications/logs", icon: ScrollText },
      { key: "Nav.commsHub", href: "/admin/communications", icon: BarChart3 },
    ],
  },
  {
    // Operations + the remaining System items (tickets, schools, QA, audit).
    key: "Nav.groupOperations",
    icon: Radio,
    items: [
      { key: "Nav.live", href: "/admin/live", icon: Radio },
      { key: "Nav.recordings", href: "/admin/recordings", icon: Video },
      { key: "Nav.hajrAI", href: "/admin/ai", icon: Bot },
      { key: "Nav.delivery", href: "/admin/delivery", icon: Package },
      { key: "Nav.validation", href: "/admin/validation", icon: ShieldCheck },
      { key: "Nav.manuals", href: "/admin/manuals", icon: BookCheck },
      { key: "Nav.brandKit", href: "/admin/brand-kit", icon: Palette },
      { key: "Nav.techChecks", href: "/admin/tech-checks", icon: Wifi },
      { key: "Nav.analytics", href: "/admin/analytics", icon: Gauge },
      { key: "Nav.activity", href: "/admin/activity", icon: ActivitySquare },
      { key: "Nav.ratingsHub", href: "/admin/ratings", icon: Star },
      { key: "Nav.tickets", href: "/admin/tickets", icon: LifeBuoy },
      { key: "Nav.schools", href: "/admin/schools", icon: Building2 },
      { key: "Nav.qaI18n", href: "/admin/qa/i18n", icon: Languages, superAdminOnly: true },
      { key: "Nav.qaNotifications", href: "/admin/qa/notifications", icon: Bell, superAdminOnly: true },
      { key: "Nav.qaAuditLog", href: "/admin/qa/audit-log", icon: ShieldAlert, superAdminOnly: true },
      { key: "Nav.auditLog", href: "/admin/audit-log", icon: ShieldCheck, superAdminOnly: true },
      // Nav.settings entry hidden until SystemSettings backend ships (v2.1).
      // The page file at /admin/settings is intentionally kept reachable
      // by URL so this slot can flip back on without route churn.
    ],
  },
];

/** Filter admin groups & items by role (drop superAdminOnly when ADMIN). */
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

function adminFlatItems(role: Role): NavItem[] {
  return [
    ADMIN_DASHBOARD_ITEM,
    ...filterAdminGroups(role).flatMap((g) => g.items),
  ];
}

/* =============================================================
 * TEACHER navigation — 3 groups
 * ============================================================= */
export const TEACHER_DASHBOARD_ITEM: NavItem = {
  key: "Nav.dashboard",
  href: "/teacher",
  icon: LayoutDashboard,
};

export const TEACHER_NAV_GROUPS: NavGroup[] = [
  {
    key: "Nav.groupTeaching",
    icon: GraduationCap,
    items: [
      { key: "Nav.openings", href: "/teacher/openings", icon: Megaphone },
      { key: "Nav.myClasses", href: "/teacher/classes", icon: BookText },
      { key: "Nav.myStudents", href: "/teacher/students", icon: Users },
      { key: "Nav.assignments", href: "/teacher/assignments", icon: BookCheck },
      { key: "Nav.attendance", href: "/teacher/attendance", icon: ClipboardList },
      { key: "Nav.labTeacher", href: "/teacher/lab", icon: FlaskConical },
      { key: "Nav.libraryHub", href: "/teacher/library", icon: Library },
      { key: "Nav.blackboard", href: "/teacher/blackboard", icon: Palette },
      { key: "Nav.privateLessons", href: "/teacher/private-lessons", icon: Headphones },
      { key: "Nav.meetings", href: "/teacher/meetings", icon: CalendarCheck },
      { key: "Nav.techCheck", href: "/teacher/tech-check", icon: Wifi },
    ],
  },
  {
    key: "Nav.groupPersonal",
    icon: UserIcon,
    items: [
      { key: "Nav.mySalary", href: "/teacher/salary", icon: Wallet },
      { key: "Nav.payoutRequests", href: "/teacher/payment-requests", icon: PiggyBank },
      { key: "Nav.readiness", href: "/teacher/readiness", icon: ShieldQuestion },
      { key: "Nav.publicProfile", href: "/teacher/profile/public", icon: Globe },
      { key: "Nav.profile", href: "/teacher/profile", icon: UserIcon },
    ],
  },
];

/* =============================================================
 * STUDENT navigation — 3 groups
 * ============================================================= */
export const STUDENT_DASHBOARD_ITEM: NavItem = {
  key: "Nav.dashboard",
  href: "/student",
  icon: LayoutDashboard,
};

export const STUDENT_NAV_GROUPS: NavGroup[] = [
  {
    key: "Nav.groupLearning",
    icon: GraduationCap,
    items: [
      { key: "Nav.myClasses", href: "/student/classes", icon: BookText },
      { key: "Nav.assignments", href: "/student/assignments", icon: BookCheck },
      { key: "Nav.labStudent", href: "/student/lab", icon: FlaskConical },
      { key: "Nav.libraryHub", href: "/student/library", icon: Library },
      { key: "Nav.studentExams", href: "/student/exams", icon: ClipboardCheck },
      { key: "Nav.speakingClub", href: "/student/speaking-club", icon: Mic },
      { key: "Nav.privateLessons", href: "/student/private-lessons", icon: Headphones },
    ],
  },
  {
    key: "Nav.groupAchievements",
    icon: Award,
    items: [
      { key: "Nav.progress", href: "/student/progress", icon: BarChart3 },
      { key: "Nav.studentCertificates", href: "/student/certificates", icon: Award },
      { key: "Nav.achievements", href: "/student/achievements", icon: Trophy },
    ],
  },
  {
    key: "Nav.groupAccount",
    icon: UserIcon,
    items: [
      { key: "Nav.myInvoices", href: "/student/billing", icon: Receipt },
      { key: "Nav.myFinance", href: "/student/finance", icon: Wallet },
      { key: "Nav.profile", href: "/student/profile", icon: UserIcon },
    ],
  },
];

/* =============================================================
 * PARENT navigation — 3 groups (Reports = the moat)
 * ============================================================= */
export const PARENT_DASHBOARD_ITEM: NavItem = {
  key: "Nav.dashboard",
  href: "/parent",
  icon: LayoutDashboard,
};

export const PARENT_NAV_GROUPS: NavGroup[] = [
  {
    key: "Nav.groupChildren",
    icon: School,
    items: [
      { key: "Nav.linkChild", href: "/parent/link", icon: UserPlus },
    ],
  },
  {
    key: "Nav.groupReports",
    icon: ChartBar,
    items: [
      { key: "Nav.parentReports", href: "/parent/reports", icon: FileText },
      { key: "Nav.attendance", href: "/parent/attendance", icon: Calendar },
      { key: "Nav.progress", href: "/parent/progress", icon: BarChart3 },
    ],
  },
  {
    key: "Nav.groupBilling",
    icon: Wallet,
    items: [
      { key: "Nav.invoicesAndPayments", href: "/parent/finance", icon: Receipt },
    ],
  },
];

/* =============================================================
 * MARKETER — flat (only 7 items, no grouping needed per RULE A)
 * ============================================================= */

/* =============================================================
 * Shared trailing items that appear under every non-admin role
 * (Messages, Calendar, Notifications, Tickets)
 * ============================================================= */
function sharedItemsFor(role: Role): NavItem[] {
  const items: NavItem[] = [
    { key: "Nav.messages", href: "/messages", icon: MessageSquare },
    { key: "Nav.calendar", href: "/calendar", icon: Calendar },
    // Owner batch 3 (C7): user-facing surface for recordings an admin targeted to them.
    { key: "Nav.recordings", href: "/recordings", icon: Video },
  ];
  if (role === "PARENT") {
    items.push({ key: "Nav.notifications", href: "/settings/notifications", icon: Bell });
  }
  if (role === "TEACHER" || role === "STUDENT" || role === "PARENT") {
    items.push({ key: "Nav.tickets", href: "/tickets", icon: LifeBuoy });
  }
  return items;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  // Flat fallbacks for legacy isNavActive() callers.
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
    TEACHER_DASHBOARD_ITEM,
    ...TEACHER_NAV_GROUPS.flatMap((g) => g.items),
    ...sharedItemsFor("TEACHER"),
  ],
  STUDENT: [
    STUDENT_DASHBOARD_ITEM,
    ...STUDENT_NAV_GROUPS.flatMap((g) => g.items),
    ...sharedItemsFor("STUDENT"),
  ],
  PARENT: [
    PARENT_DASHBOARD_ITEM,
    ...PARENT_NAV_GROUPS.flatMap((g) => g.items),
    ...sharedItemsFor("PARENT"),
  ],
  MARKETER: [
    { key: "Nav.marketerDashboard", href: "/marketer", icon: LayoutDashboard },
    { key: "Nav.marketerReferrals", href: "/marketer/referrals", icon: UserPlus },
    { key: "Nav.marketerCommissions", href: "/marketer/commissions", icon: Wallet },
    { key: "Nav.marketerPayoutRequests", href: "/marketer/payment-requests", icon: PiggyBank },
    { key: "Nav.marketerProfile", href: "/marketer/profile", icon: UserIcon },
    { key: "Nav.messages", href: "/messages", icon: MessageSquare },
    { key: "Nav.calendar", href: "/calendar", icon: Calendar },
    { key: "Nav.recordings", href: "/recordings", icon: Video },
  ],
  // APPLICANT uses a dedicated minimal shell (see (applicant) route group) and
  // never renders through this Sidebar. This entry exists only to satisfy the
  // Record<Role, NavItem[]> totality for legacy isNavActive() callers; per-item
  // nav for applicants is gated by ApplicantFeatureAccess in their own shell.
  APPLICANT: [
    { key: "Nav.applicantOverview", href: "/applicant", icon: LayoutDashboard },
  ],
};

/** Role → grouped nav (or null if the role uses a flat list). */
export function groupsForRole(role: Role): {
  dashboard: NavItem;
  groups: NavGroup[];
  trailing: NavItem[];
} | null {
  if (role === "TEACHER") {
    return {
      dashboard: TEACHER_DASHBOARD_ITEM,
      groups: TEACHER_NAV_GROUPS,
      trailing: sharedItemsFor("TEACHER"),
    };
  }
  if (role === "STUDENT") {
    return {
      dashboard: STUDENT_DASHBOARD_ITEM,
      groups: STUDENT_NAV_GROUPS,
      trailing: sharedItemsFor("STUDENT"),
    };
  }
  if (role === "PARENT") {
    return {
      dashboard: PARENT_DASHBOARD_ITEM,
      groups: PARENT_NAV_GROUPS,
      trailing: sharedItemsFor("PARENT"),
    };
  }
  return null;
}

/**
 * Whether `href` is the active nav item for `pathname`.
 * Strips locale prefix, longest-prefix-wins among siblings.
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

function isGroupActive(pathname: string, group: NavGroup, allFlat: NavItem[]): boolean {
  return group.items.some((it) => isNavActive(pathname, it.href, allFlat));
}

const LS_PREFIX = "hajr.nav.";

export function Sidebar({ role }: { role: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const isAdminish = role === "SUPER_ADMIN" || role === "ADMIN";
  const grouped = groupsForRole(role);

  if (isAdminish) {
    return (
      <GroupedSidebar
        kind="admin"
        role={role}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
    );
  }

  if (grouped) {
    return (
      <GroupedSidebar
        kind="role"
        role={role}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
    );
  }

  // Marketer (and any future flat role) — flat list.
  return (
    <FlatSidebar
      role={role}
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
    />
  );
}

function FlatSidebar({
  role,
  collapsed,
  onToggle,
}: {
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen sticky top-0 flex-col bg-hajr-deep-navy text-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
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

/* ─────────── Grouped sidebar (Admin + Teacher/Student/Parent) ─────────── */

function GroupedSidebar({
  kind,
  role,
  collapsed,
  onToggleCollapse,
}: {
  kind: "admin" | "role";
  role: Role;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();

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

  const allFlat: NavItem[] = [
    dashboard,
    ...groups.flatMap((g) => g.items),
    ...trailing,
  ];

  // Default each group to COLLAPSED so the (now longer, merged) groups keep the
  // menu short. Exceptions, in priority order: the group containing the active
  // route is always open; otherwise a previously-stored explicit choice wins
  // ("open" → open, "closed" → closed). Same localStorage keys/format as before,
  // so a user's saved open-states are still honoured — only the never-touched
  // default flips from open to closed.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.key] = isGroupActive(pathname, g, allFlat);
    return init;
  });

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(LS_PREFIX + g.key) : null;
      const active = isGroupActive(pathname, g, allFlat);
      if (active) next[g.key] = true;
      else if (stored === "open") next[g.key] = true;
      else if (stored === "closed") next[g.key] = false;
      else next[g.key] = false;
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
        <SidebarLink item={dashboard} pathname={pathname} allFlat={allFlat} collapsed={collapsed} t={t} />

        <div className="mt-2 space-y-1">
          {groups.map((g) => {
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

        {trailing.length > 0 && (
          <div className={cn("mt-3 pt-3", !collapsed && "border-t border-white/10")}>
            <ul className="space-y-0.5">
              {trailing.map((item) => (
                <SidebarLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  allFlat={allFlat}
                  collapsed={collapsed}
                  t={t}
                />
              ))}
            </ul>
          </div>
        )}
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
