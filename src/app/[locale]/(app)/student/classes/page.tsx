import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";

export const dynamic = "force-dynamic";

const DAY_AR: Record<string, string> = {
  SUNDAY: "الأحد", MONDAY: "الإثنين", TUESDAY: "الثلاثاء", WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس", FRIDAY: "الجمعة", SATURDAY: "السبت",
};

export default async function StudentClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations();

  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, status: "ACTIVE" },
    include: {
      class: {
        include: {
          program: true,
          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
          sessions: {
            where: {
              OR: [
                { status: "LIVE" },
                { status: "SCHEDULED", scheduledDate: { gte: new Date(Date.now() - 3600_000) } },
              ],
            },
            orderBy: { scheduledDate: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  // Past sessions with recordings for these classes.
  const recordings = await prisma.classSession.findMany({
    where: {
      classId: { in: enrollments.map((e) => e.classId) },
      zoomRecordingUrl: { not: null },
    },
    include: { class: true },
    orderBy: { scheduledDate: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("Nav.myClasses")}</h1>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("Common.noData")}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {enrollments.map(({ class: c }) => {
            const next = c.sessions[0];
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.nameAr ?? c.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.program.nameAr} • {c.teacher.user.nameAr ?? c.teacher.user.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {c.scheduleDays.map((d) => (locale === "ar" ? DAY_AR[d] : d.slice(0, 3))).join("، ")}{" "}
                    <span className="num">{c.timeSlot}</span>
                  </p>
                  {next ? (
                    <UpcomingSessionCard
                      mode="join"
                      locale={locale}
                      session={{
                        id: next.id,
                        kind: "classSession",
                        title: c.nameAr ?? c.name,
                        scheduledDate: next.scheduledDate.toISOString(),
                        durationMinutes: c.durationMinutes,
                        status: next.status,
                        hasMeeting: !!next.zoomMeetingId,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("Video.noUpcoming")}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {recordings.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold">{t("Video.recordings")}</h2>
          <div className="space-y-2">
            {recordings.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{r.class.nameAr ?? r.class.name}</p>
                    <p className="text-xs text-muted-foreground num">
                      {r.scheduledDate.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")}
                    </p>
                  </div>
                  <a
                    href={r.zoomRecordingUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-brand-navy px-4 py-2 text-sm text-white"
                  >
                    {t("Video.watchRecording")}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
