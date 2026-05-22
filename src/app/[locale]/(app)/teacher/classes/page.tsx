import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";
import { RescheduleSessionButton } from "@/components/video/reschedule-session-button";
import { ClipboardCheck, Users } from "lucide-react";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

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
        // Full roster of active students for each class.
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            student: {
              include: {
                user: { select: { name: true, nameAr: true, email: true } },
              },
            },
          },
        },
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
                    <div className="space-y-2">
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
                      {/* Teacher may reschedule their own upcoming session. */}
                      {next.status === "SCHEDULED" && (
                        <RescheduleSessionButton
                          sessionId={next.id}
                          scheduledDate={next.scheduledDate.toISOString()}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("Video.noUpcoming")}</p>
                  )}

                  {/* Student roster — who is in this class. */}
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
                      <Users className="h-3.5 w-3.5" />
                      {t("Classes.roster")}
                      <span className="num text-muted-foreground">
                        ({c.enrollments.length})
                      </span>
                    </div>
                    {c.enrollments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {locale === "ar"
                          ? "لا يوجد طلاب مسجّلون بعد"
                          : "No students enrolled yet"}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {c.enrollments.map((en: any) => (
                          <div
                            key={en.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {initials(en.student.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {locale === "ar" && en.student.user.nameAr
                                ? en.student.user.nameAr
                                : en.student.user.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
