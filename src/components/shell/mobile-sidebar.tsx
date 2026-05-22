"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HajrLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, Wallet,
  MessageSquare, ClipboardCheck, FlaskConical, FileText, Building2,
  Radio, ShieldCheck, Settings, User as UserIcon, ListChecks, School,
  Receipt, BadgeDollarSign, BookText, BarChart3, BookCheck
} from "lucide-react";

const NAV_BY_ROLE: Record<Role, { key: string; href: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  SUPER_ADMIN: [
    { key: "Nav.dashboard", href: "/admin", icon: LayoutDashboard },
    { key: "Nav.students", href: "/admin/students", icon: Users },
    { key: "Nav.teachers", href: "/admin/teachers", icon: GraduationCap },
    { key: "Nav.classes", href: "/admin/classes", icon: BookText },
    { key: "Nav.finance", href: "/admin/finance", icon: Wallet },
    { key: "Nav.settings", href: "/admin/settings", icon: Settings },
  ],
  ADMIN: [
    { key: "Nav.dashboard", href: "/admin", icon: LayoutDashboard },
    { key: "Nav.students", href: "/admin/students", icon: Users },
    { key: "Nav.classes", href: "/admin/classes", icon: BookText },
    { key: "Nav.finance", href: "/admin/finance", icon: Wallet },
  ],
  TEACHER: [
    { key: "Nav.dashboard", href: "/teacher", icon: LayoutDashboard },
    { key: "Nav.myClasses", href: "/teacher/classes", icon: BookText },
    { key: "Nav.assignments", href: "/teacher/assignments", icon: BookCheck },
    { key: "Nav.messages", href: "/teacher/messages", icon: MessageSquare },
    { key: "Nav.mySalary", href: "/teacher/salary", icon: BadgeDollarSign },
  ],
  STUDENT: [
    { key: "Nav.dashboard", href: "/student", icon: LayoutDashboard },
    { key: "Nav.myClasses", href: "/student/classes", icon: BookText },
    { key: "Nav.lab", href: "/student/lab", icon: FlaskConical },
    { key: "Nav.step", href: "/student/step", icon: FileText },
    { key: "Nav.myInvoices", href: "/student/billing", icon: Receipt },
  ],
  PARENT: [
    { key: "Nav.dashboard", href: "/parent", icon: LayoutDashboard },
    { key: "Nav.children", href: "/parent/link", icon: School },
  ],
};

export function MobileSidebar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const pathname = usePathname();
  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-hajr-black/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-0 h-full w-64 bg-hajr-navy text-white shadow-xl">
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
            <nav className="p-2">
              <ul className="space-y-0.5">
                {NAV_BY_ROLE[role].map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.endsWith(item.href);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                          isActive
                            ? "bg-hajr-rose text-white shadow-sm"
                            : "text-white/75 hover:bg-hajr-rose/10 hover:text-white"
                        )}
                      >
                        <Icon className={cn("h-[1.1rem] w-[1.1rem]", isActive ? "text-white" : "text-white/70 group-hover:text-white")} />
                        <span>{t(item.key as any)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
