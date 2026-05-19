import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Radio, Wallet, GraduationCap, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();

  const [studentCount, teacherCount, liveSessions, pendingInvoices] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.teacherProfile.count({ where: { active: true } }),
    prisma.classSession.count({ where: { status: "LIVE" } }),
    prisma.invoice.count({ where: { status: "PENDING" } }),
  ]);

  const monthRevenue = await prisma.invoice.aggregate({
    _sum: { totalSar: true },
    where: {
      status: "PAID",
      paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t("Dashboard.welcome")}، {session.user.name}</h1>
        <Badge variant="info">{t("Roles." + session.user.role as any)}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t("Dashboard.totalStudents")} value={studentCount} icon={Users} />
        <Kpi label={t("Dashboard.activeTeachers")} value={teacherCount} icon={GraduationCap} />
        <Kpi label={t("Dashboard.liveClasses")} value={liveSessions} icon={Radio} accent />
        <Kpi
          label={t("Dashboard.monthlyRevenue")}
          value={Number(monthRevenue._sum.totalSar ?? 0).toLocaleString("en-US")}
          suffix="ر.س"
          icon={Wallet}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Dashboard.alerts")}</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvoices > 0 ? (
            <div className="flex items-center gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              <span className="num">{pendingInvoices}</span> {t("Dashboard.pendingInvoices")}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
  suffix,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-brand-navy num">{value}</span>
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accent ? "bg-brand-rose text-white" : "bg-brand-lavender/40 text-brand-navy"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
