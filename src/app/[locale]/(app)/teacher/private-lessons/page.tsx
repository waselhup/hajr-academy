import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";

export const dynamic = "force-dynamic";

export default async function TeacherPrivateLessonsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const profile = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  const lessons = profile
    ? await prisma.privateLesson.findMany({
        where: {
          teacherId: profile.id,
          OR: [
            { status: "LIVE" },
            { status: "SCHEDULED", scheduledAt: { gte: new Date(Date.now() - 86400_000) } },
          ],
        },
        include: { student: { include: { user: true } } },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("Nav.privateLessons")}</h1>
      {lessons.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("Video.noPrivateLessons")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => (
            <UpcomingSessionCard
              key={l.id}
              mode="start"
              locale={locale}
              session={{
                id: l.id,
                kind: "privateLesson",
                title: `${t("Programs.PRIVATE")} — ${l.student.user.name}`,
                scheduledDate: l.scheduledAt.toISOString(),
                durationMinutes: l.durationMinutes,
                status: l.status,
                hasMeeting: !!l.zoomMeetingId,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
