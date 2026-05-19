import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function StudentDashboardPage() {
  const session = await requireRole("STUDENT");
  const t = await getTranslations();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { enrollments: { include: { class: true } } },
  });

  const pendingInvoices = profile
    ? await prisma.invoice.count({ where: { studentId: profile.id, status: "PENDING" } })
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t("Dashboard.welcome")}، {session.user.name}</h1>
        <Badge variant="info">{t("Roles.STUDENT")}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">{t("Nav.myClasses")}</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold num">{profile?.enrollments.length ?? 0}</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">{t("Dashboard.pendingInvoices")}</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold num">{pendingInvoices}</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">{t("Dashboard.labStreak")}</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold num">0</span> <span className="text-sm text-muted-foreground">{t("Dashboard.days")}</span></CardContent>
        </Card>
      </div>
    </div>
  );
}
