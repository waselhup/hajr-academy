import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, GraduationCap, Radio, Wallet, BookText, AlertTriangle,
  Activity, Clock, BellRing,
} from "lucide-react";
import { fmtSAR, fmtRelative, fmtRiyadh } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard({ params }: { params: Promise<{ locale: "ar" | "en" }> }) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;
  const t = await getTranslations();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayAhead = new Date(now.getTime() + 24 * 3600_000);

  const [
    studentsActive, teachersActive, classesActiveMonth,
    mrrAgg, outstandingAgg, liveCount,
    auditFeed, overdueRows, upcomingSessions,
  ] = await Promise.all([
    prisma.studentProfile.count({ where: { user: { isActive: true } } }),
    prisma.teacherProfile.count({ where: { active: true } }),
    prisma.class.count({ where: { status: "ACTIVE", startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: monthStart } }] } }),
    prisma.invoice.aggregate({ _sum: { totalSar: true }, where: { status: "PAID", paidAt: { gte: monthStart } } }),
    prisma.invoice.aggregate({ _sum: { totalSar: true }, _count: true, where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.classSession.count({ where: { status: "LIVE" } }),
    prisma.auditLog.findMany({
      take: 10, orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, nameAr: true, role: true } } },
    }),
    prisma.invoice.findMany({
      where: { status: "OVERDUE" }, take: 5, orderBy: { dueDate: "asc" },
      include: { student: { include: { user: { select: { name: true, nameAr: true, email: true } } } } },
    }),
    prisma.classSession.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] }, scheduledDate: { gte: now, lte: dayAhead } },
      take: 5, orderBy: { scheduledDate: "asc" },
      include: { class: { include: { teacher: { include: { user: { select: { name: true, nameAr: true } } } } } } },
    }),
  ]);

  const mrr = Number(mrrAgg._sum.totalSar ?? 0);
  const outstanding = Number(outstandingAgg._sum.totalSar ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Dashboard.welcome")}، {session.user.name}</h1>
          <p className="text-sm text-muted-foreground">{fmtRiyadh(now, "EEEE, MMM d yyyy")}</p>
        </div>
        <Badge variant="info">{t("Roles." + session.user.role as any)}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile href="/admin/students" label={t("Dashboard.totalStudents")} value={studentsActive} icon={Users} accent="lavender" />
        <KpiTile href="/admin/teachers" label={t("Dashboard.activeTeachers")} value={teachersActive} icon={GraduationCap} accent="mint" />
        <KpiTile href="/admin/classes" label={t("Nav.classes")} value={classesActiveMonth} icon={BookText} accent="lavender" />
        <KpiTile href="/admin/finance" label={t("Dashboard.monthlyRevenue")} value={fmtSAR(mrr, locale)} icon={Wallet} accent="mint" />
        <KpiTile href="/admin/finance" label={t("Dashboard.pendingInvoices")} value={fmtSAR(outstanding, locale)} icon={AlertTriangle} accent={outstanding > 0 ? "danger" : "mint"} />
        <KpiTile href="/admin/live" label={t("Dashboard.liveClasses")} value={liveCount} icon={Radio} accent={liveCount > 0 ? "rose" : "lavender"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4 text-brand-rose"/> {t("Dashboard.recentActivity")}</CardTitle>
            <CardDescription>{t("Dashboard.recentActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditFeed.length === 0 && <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>}
            {auditFeed.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-100 p-3 text-sm">
                <div>
                  <div className="font-medium">{a.user?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{a.action} {a.entity ? `· ${a.entity}` : ""}</div>
                </div>
                <span className="text-xs text-muted-foreground">{fmtRelative(a.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing className="h-4 w-4 text-brand-rose"/> {t("Dashboard.overdueAlert")}</CardTitle>
            <CardDescription>{t("Dashboard.overdueAlertDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueRows.length === 0 && <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>}
            {overdueRows.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border border-red-100 bg-red-50 p-3 text-sm">
                <div>
                  <div className="font-medium">{inv.student.user.name}</div>
                  <div className="text-xs text-muted-foreground">{inv.invoiceNumber} · {fmtSAR(Number(inv.totalSar), locale)}</div>
                </div>
                <Link href="/admin/finance" className="text-xs text-brand-rose hover:underline">{t("Dashboard.sendReminder")}</Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-rose"/> {t("Dashboard.upcomingSessions")}</CardTitle>
          <CardDescription>{t("Dashboard.upcomingSessionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>
          ) : (
            <div className="divide-y">
              {upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">{locale === "ar" && s.class.nameAr ? s.class.nameAr : s.class.name}</div>
                    <div className="text-xs text-muted-foreground">{s.class.teacher.user.name}</div>
                  </div>
                  <div className="text-end text-xs">
                    <div className="font-medium text-brand-navy num">{fmtRiyadh(s.scheduledDate, "HH:mm")}</div>
                    <div className="text-muted-foreground">{fmtRelative(s.scheduledDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({
  href, label, value, icon: Icon, accent,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "lavender" | "mint" | "rose" | "danger";
}) {
  const colorMap: Record<string, string> = {
    lavender: "bg-brand-lavender/40 text-brand-navy",
    mint: "bg-brand-mint/40 text-brand-navy",
    rose: "bg-brand-rose text-white",
    danger: "bg-red-100 text-red-700",
  };
  return (
    <Link href={href} className="block group">
      <Card className="transition-shadow group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 text-2xl font-bold text-brand-navy num">{value}</div>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${colorMap[accent]}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
