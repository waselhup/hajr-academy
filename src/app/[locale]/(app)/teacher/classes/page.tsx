import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";
import { ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const DAY_AR: Record<string, string> = {
  SUNDAY: "الأحد", MONDAY: "الإثنين", TUESDAY: "الثلاثاء", WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس", FRIDAY: "الجمعة", SATURDAY: "السبت",
};

export default async function TeacherClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  let classes: any[] = [];

  try {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>;
    }

    classes = await prisma.class.findMany({
      where: { teacherId: profile.id },
      include: {
        program: true,
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
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
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("[teacher-classes] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("Nav.myClasses")}</h1>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("Common.noData")}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {classes.map((c: any) => {
            const next = c.sessions[0];
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{c.nameAr ?? c.name}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground num">{c.cohortCode}</p>
                    </div>
                    <Badge variant={c.status === "ACTIVE" ? "success" : "info"}>{c.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{c.program.nameAr}</span>
                    <span>•</span>
                    <span className="num">{c._count.enrollments} / {c.maxStudents}</span>
                    <span>•</span>
                    <span>
                      {c.scheduleDays.map((d: string) => (locale === "ar" ? DAY_AR[d] : d.slice(0, 3))).join("، ")}
                      {" "}
                      <span className="num">{c.timeSlot}</span>
                    </span>
                  </div>

                  {next ? (
                    <UpcomingSessionCard
                      mode="start"
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

                  <div className="flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/${locale}/teacher/attendance`}>
                        <ClipboardCheck className="me-2 h-4 w-4" />
                        {t("Nav.attendance")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
