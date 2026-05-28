import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";
import { MoatCards } from "@/components/shell/moat-cards";
import { TechCheckBanner } from "@/components/teacher/tech-check-banner";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  let profile: any = null;
  let todaySessions = 0;
  let sessions: any[] = [];

  try {
    profile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: { classes: { include: { enrollments: true } } },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(24);

    if (profile) {
      todaySessions = await prisma.classSession.count({
        where: {
          class: { teacherId: profile.id },
          scheduledDate: { gte: todayStart, lt: todayEnd },
        },
      });

      const horizon = new Date(Date.now() + 7 * 86400_000);
      sessions = await prisma.classSession.findMany({
        where: {
          class: { teacherId: profile.id },
          OR: [
            { status: "LIVE" },
            {
              status: "SCHEDULED",
              scheduledDate: { gte: new Date(Date.now() - 3600_000), lte: horizon },
            },
          ],
        },
        include: { class: true },
        orderBy: { scheduledDate: "asc" },
        take: 6,
      });
    }
  } catch (e) {
    console.error("[teacher-dashboard] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">
          {t("Dashboard.welcome")}، {session.user.name}
        </h1>
        <Badge variant="info">{t("Roles.TEACHER")}</Badge>
      </div>

      <TechCheckBanner locale={locale} userId={session.user.id} />

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
              {profile?.classes.reduce((sum: number, c: any) => sum + c.enrollments.length, 0) ?? 0}
            </span>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">{t("Video.nextClass")}</h2>
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t("Video.noUpcoming")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((s: any) => (
              <UpcomingSessionCard
                key={s.id}
                mode="start"
                locale={locale}
                session={{
                  id: s.id,
                  kind: "classSession",
                  title: s.class.nameAr ?? s.class.name,
                  subtitle: s.class.cohortCode,
                  scheduledDate: s.scheduledDate.toISOString(),
                  durationMinutes: s.class.durationMinutes,
                  status: s.status,
                  hasMeeting: !!s.zoomMeetingId,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <MoatCards role="teacher" locale={locale} />
    </div>
  );
}
