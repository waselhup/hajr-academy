import { getTranslations } from "next-intl/server";
import { CalendarDays, BookOpen, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";
import { MoatCards } from "@/components/shell/moat-cards";
import { TechCheckBanner } from "@/components/teacher/tech-check-banner";
import { TechCheckCard } from "@/components/teacher/tech-check-card";
import { OpeningsBanner } from "@/components/teacher/openings-banner";

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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-hajr-deep-navy p-6 text-white shadow-card sm:p-8">
        <h1 className="text-2xl font-bold">
          {t("Dashboard.welcome")}، {session.user.name}
        </h1>
        <Badge variant="rose">{t("Roles.TEACHER")}</Badge>
      </div>

      <TechCheckBanner locale={locale} userId={session.user.id} />
      <TechCheckCard userId={session.user.id} />
      <OpeningsBanner userId={session.user.id} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="icon-chip shrink-0">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-bold num text-hajr-deep-navy">{todaySessions}</div>
              <div className="text-sm text-muted-foreground">{t("Dashboard.todayClasses")}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="icon-chip shrink-0">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-bold num text-hajr-deep-navy">{profile?.classes.length ?? 0}</div>
              <div className="text-sm text-muted-foreground">{t("Nav.myClasses")}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="icon-chip shrink-0">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-bold num text-hajr-deep-navy">
                {profile?.classes.reduce((sum: number, c: any) => sum + c.enrollments.length, 0) ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">{t("Dashboard.totalStudents")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-hajr-deep-navy">{t("Video.nextClass")}</h2>
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t("Video.noUpcoming")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
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
