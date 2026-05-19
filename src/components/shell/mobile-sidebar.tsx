"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
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
    { key: "Nav.myInvoices", href: "/student/finance", icon: Receipt },
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-0 h-full w-64 bg-brand-navy text-white">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Logo light />
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-2">
              <ul className="space-y-1">
                {NAV_BY_ROLE[role].map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.endsWith(item.href);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                          isActive ? "bg-brand-rose text-white" : "text-white/85 hover:bg-white/10"
                        )}
                      >
                        <Icon className="h-4 w-4" />
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
