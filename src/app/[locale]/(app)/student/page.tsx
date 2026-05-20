import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { enrollments: { where: { status: "ACTIVE" }, include: { class: true } } },
  });

  const pendingInvoices = profile
    ? await prisma.invoice.count({ where: { studentId: profile.id, status: "PENDING" } })
    : 0;

  // Live + upcoming sessions for the student's enrolled classes.
  const classIds = profile?.enrollments.map((e) => e.classId) ?? [];
  const horizon = new Date(Date.now() + 7 * 86400_000);
  const sessions =
    classIds.length > 0
      ? await prisma.classSession.findMany({
          where: {
            classId: { in: classIds },
            OR: [
              { status: "LIVE" },
              { status: "SCHEDULED", scheduledDate: { gte: new Date(Date.now() - 3600_000), lte: horizon } },
            ],
          },
          include: { class: true },
          orderBy: { scheduledDate: "asc" },
          take: 6,
        })
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">
          {t("Dashboard.welcome")}، {session.user.name}
        </h1>
        <Badge variant="info">{t("Roles.STUDENT")}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("Nav.myClasses")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold num">{profile?.enrollments.length ?? 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("Dashboard.pendingInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold num">{pendingInvoices}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("Dashboard.labStreak")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold num">0</span>{" "}
            <span className="text-sm text-muted-foreground">{t("Dashboard.days")}</span>
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
            {sessions.map((s) => (
              <UpcomingSessionCard
                key={s.id}
                mode="join"
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
    </div>
  );
}
