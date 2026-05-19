import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function TeacherDashboardPage() {
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: { classes: { include: { enrollments: true } } },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(24);

  const todaySessions = profile
    ? await prisma.classSession.count({
        where: {
          class: { teacherId: profile.id },
          scheduledDate: { gte: todayStart, lt: todayEnd },
        },
      })
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t("Dashboard.welcome")}، {session.user.name}</h1>
        <Badge variant="info">{t("Roles.TEACHER")}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("Dashboard.todayClasses")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold num">{todaySessions}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("Nav.myClasses")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold num">{profile?.classes.length ?? 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("Dashboard.totalStudents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold num">
              {profile?.classes.reduce((sum, c) => sum + c.enrollments.length, 0) ?? 0}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
