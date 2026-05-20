"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, Wallet,
  MessageSquare, ClipboardCheck, FlaskConical, FileText, Building2,
  Radio, ShieldCheck, Settings, BellRing, User as UserIcon, ChevronLeft,
  ListChecks, School, Receipt, BadgeDollarSign, BookText, BarChart3, BookCheck, Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";
import type { Role } from "@prisma/client";

type NavItem = { key: string; href: string; icon: React.ComponentType<{ className?: string }> };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { key: "Nav.dashboard", href: "/admin", icon: LayoutDashboard },
    { key: "Nav.students", href: "/admin/students", icon: Users },
    { key: "Nav.teachers", href: "/admin/teachers", icon: GraduationCap },
    { key: "Nav.parents", href: "/admin/parents", icon: UserIcon },
    { key: "Nav.programs", href: "/admin/programs", icon: BookOpen },
    { key: "Nav.classes", href: "/admin/classes", icon: BookText },
    { key: "Nav.schedule", href: "/admin/schedule", icon: Calendar },
    { key: "Nav.finance", href: "/admin/finance", icon: Wallet },
    { key: "Nav.communications", href: "/admin/communications", icon: MessageSquare },
    { key: "Nav.attendance", href: "/admin/attendance", icon: ClipboardCheck },
    { key: "Nav.lab", href: "/admin/lab", icon: FlaskConical },
    { key: "Nav.stepBank", href: "/admin/step-bank", icon: FileText },
    { key: "Nav.schools", href: "/admin/schools", icon: Building2 },
    { key: "Nav.live", href: "/admin/live", icon: Radio },
    { key: "Nav.recordings", href: "/admin/recordings", icon: Video },
    { key: "Nav.auditLog", href: "/admin/audit-log", icon: ShieldCheck },
    { key: "Nav.settings", href: "/admin/settings", icon: Settings },
  ],
  ADMIN: [
    { key: "Nav.dashboard", href: "/admin", icon: LayoutDashboard },
    { key: "Nav.students", href: "/admin/students", icon: Users },
    { key: "Nav.teachers", href: "/admin/teachers", icon: GraduationCap },
    { key: "Nav.parents", href: "/admin/parents", icon: UserIcon },
    { key: "Nav.classes", href: "/admin/classes", icon: BookText },
    { key: "Nav.schedule", href: "/admin/schedule", icon: Calendar },
    { key: "Nav.finance", href: "/admin/finance", icon: Wallet },
    { key: "Nav.communications", href: "/admin/communications", icon: MessageSquare },
    { key: "Nav.attendance", href: "/admin/attendance", icon: ClipboardCheck },
    { key: "Nav.lab", href: "/admin/lab", icon: FlaskConical },
    { key: "Nav.schools", href: "/admin/schools", icon: Building2 },
    { key: "Nav.live", href: "/admin/live", icon: Radio },
    { key: "Nav.recordings", href: "/admin/recordings", icon: Video },
  ],
  TEACHER: [
    { key: "Nav.dashboard", href: "/teacher", icon: LayoutDashboard },
    { key: "Nav.myClasses", href: "/teacher/classes", icon: BookText },
    { key: "Nav.privateLessons", href: "/teacher/private-lessons", icon: BookOpen },
    { key: "Nav.blackboard", href: "/teacher/blackboard", icon: ListChecks },
    { key: "Nav.assignments", href: "/teacher/assignments", icon: BookCheck },
    { key: "Nav.attendance", href: "/teacher/attendance", icon: ClipboardCheck },
    { key: "Nav.messages", href: "/teacher/messages", icon: MessageSquare },
    { key: "Nav.mySalary", href: "/teacher/salary", icon: BadgeDollarSign },
    { key: "Nav.profile", href: "/teacher/profile", icon: UserIcon },
  ],
  STUDENT: [
    { key: "Nav.dashboard", href: "/student", icon: LayoutDashboard },
    { key: "Nav.myClasses", href: "/student/classes", icon: BookText },
    { key: "Nav.privateLessons", href: "/student/private-lessons", icon: BookOpen },
    { key: "Nav.lab", href: "/student/lab", icon: FlaskConical },
    { key: "Nav.step", href: "/student/step", icon: FileText },
    { key: "Nav.assignments", href: "/student/assignments", icon: BookCheck },
    { key: "Nav.messages", href: "/student/messages", icon: MessageSquare },
    { key: "Nav.myInvoices", href: "/student/finance", icon: Receipt },
    { key: "Nav.progress", href: "/student/progress", icon: BarChart3 },
    { key: "Nav.profile", href: "/student/profile", icon: UserIcon },
  ],
  PARENT: [
    { key: "Nav.dashboard", href: "/parent", icon: LayoutDashboard },
    { key: "Nav.children", href: "/parent/link", icon: School },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV_BY_ROLE[role];

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen sticky top-0 flex-col bg-brand-navy text-white transition-all",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        {collapsed ? <LogoMark /> : <Logo light />}
        <button
          aria-label="Collapse"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-white/70 hover:bg-white/10"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform rtl-flip", collapsed && "rotate-180")} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname.endsWith(item.href) || pathname.includes(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-brand-rose text-white"
                      : "text-white/85 hover:bg-white/10"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{t(item.key as any)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 px-3 py-2 text-xs text-white/60">
        {!collapsed && (
          <span>
            {t("Roles." + role as any)}
          </span>
        )}
      </div>
    </aside>
  );
}
