"use client";

/**
 * Role-scoped discoverability cards — surfaces high-value pages that
 * the owner explicitly called out as orphaned in the navigation audit.
 * Used directly under each role's dashboard hero/command-center.
 */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookCheck, Package, Palette, ShieldCheck, FileText, ChartBar,
  FlaskConical, ClipboardCheck, Mic, Headphones, Award,
  BarChart3, Wallet, ShieldQuestion, Globe, CalendarCheck, PiggyBank,
  Receipt, UserPlus, Radio, Video, Bot, ArrowRight, type LucideIcon,
} from "lucide-react";

type MoatCard = {
  key: string;       // i18n key under Nav.*
  href: string;      // locale-relative href (will be prefixed)
  icon: LucideIcon;
  blurb: string;     // i18n key for the one-line description
};

const ADMIN_CARDS: MoatCard[] = [
  { key: "Nav.manuals",        href: "/admin/manuals",      icon: BookCheck,   blurb: "Moat.manualsBlurb" },
  { key: "Nav.delivery",       href: "/admin/delivery",     icon: Package,     blurb: "Moat.deliveryBlurb" },
  { key: "Nav.brandKit",       href: "/admin/brand-kit",    icon: Palette,     blurb: "Moat.brandKitBlurb" },
  { key: "Nav.validation",     href: "/admin/validation",   icon: ShieldCheck, blurb: "Moat.validationBlurb" },
  { key: "Nav.recordings",     href: "/admin/recordings",   icon: Video,       blurb: "Moat.recordingsBlurb" },
  { key: "Nav.hajrAI",         href: "/admin/ai",           icon: Bot,         blurb: "Moat.hajrAIBlurb" },
];

const TEACHER_CARDS: MoatCard[] = [
  { key: "Nav.mySalary",       href: "/teacher/salary",          icon: Wallet,         blurb: "Moat.salaryBlurb" },
  { key: "Nav.meetings",       href: "/teacher/meetings",        icon: CalendarCheck,  blurb: "Moat.meetingsBlurb" },
  { key: "Nav.readiness",      href: "/teacher/readiness",       icon: ShieldQuestion, blurb: "Moat.readinessBlurb" },
  { key: "Nav.publicProfile",  href: "/teacher/profile/public",  icon: Globe,          blurb: "Moat.publicProfileBlurb" },
  { key: "Nav.payoutRequests", href: "/teacher/payment-requests",icon: PiggyBank,      blurb: "Moat.payoutBlurb" },
];

const STUDENT_CARDS: MoatCard[] = [
  { key: "Nav.labStudent",          href: "/student/lab",             icon: FlaskConical,    blurb: "Moat.labBlurb" },
  { key: "Nav.studentExams",        href: "/student/exams",           icon: ClipboardCheck,  blurb: "Moat.examsBlurb" },
  { key: "Nav.studentCertificates", href: "/student/certificates",    icon: Award,           blurb: "Moat.certificatesBlurb" },
  { key: "Nav.speakingClub",        href: "/student/speaking-club",   icon: Mic,             blurb: "Moat.speakingClubBlurb" },
  { key: "Nav.privateLessons",      href: "/student/private-lessons", icon: Headphones,      blurb: "Moat.privateLessonsBlurb" },
  { key: "Nav.progress",            href: "/student/progress",        icon: BarChart3,       blurb: "Moat.progressBlurb" },
];

const PARENT_CARDS: MoatCard[] = [
  { key: "Nav.parentReports",       href: "/parent/reports",   icon: FileText,    blurb: "Moat.parentReportsBlurb" },
  { key: "Nav.invoicesAndPayments", href: "/parent/finance",   icon: Receipt,     blurb: "Moat.parentBillingBlurb" },
  { key: "Nav.linkChild",           href: "/parent/link",      icon: UserPlus,    blurb: "Moat.linkChildBlurb" },
];

const CARDS_BY_ROLE: Record<string, MoatCard[]> = {
  admin: ADMIN_CARDS,
  teacher: TEACHER_CARDS,
  student: STUDENT_CARDS,
  parent: PARENT_CARDS,
};

export function MoatCards({
  role,
  locale,
}: {
  role: "admin" | "teacher" | "student" | "parent";
  locale: string;
}) {
  const t = useTranslations();
  const cards = CARDS_BY_ROLE[role];
  if (!cards || cards.length === 0) return null;

  return (
    <section aria-label={t("Moat.title")} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-brand-navy">{t("Moat.title")}</h2>
        <span className="text-xs text-muted-foreground">{t("Moat.subtitle")}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.key}
              href={`/${locale}${c.href}`}
              className="group"
            >
              <Card className="h-full transition-all hover:border-hajr-rose/40 hover:shadow-sm">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hajr-deep-navy/5 text-hajr-deep-navy group-hover:bg-hajr-rose/10 group-hover:text-hajr-rose">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-semibold text-brand-navy">
                      <span className="truncate">{t(c.key as any)}</span>
                      <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 rtl-flip" />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {t(c.blurb as any)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
