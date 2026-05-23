import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherClassesClient, type TeacherClassItem } from "./teacher-classes-client";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("Common.noData")}
        </CardContent>
      </Card>
    );
  }

  // Group classes
  const groupClasses = await prisma.class.findMany({
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

  // Private lessons — grouped by student to form synthetic "private class"
  // entries so they fit the same UI shape.
  const privateLessons = await prisma.privateLesson.findMany({
    where: {
      teacherId: profile.id,
      OR: [
        { status: "LIVE" },
        { status: "SCHEDULED", scheduledAt: { gte: new Date(Date.now() - 86400_000) } },
      ],
    },
    include: { student: { include: { user: { select: { name: true, nameAr: true } } } } },
    orderBy: { scheduledAt: "asc" },
  });

  const items: TeacherClassItem[] = [
    ...groupClasses.map((c) => ({
      kind: "GROUP" as const,
      id: c.id,
      title: locale === "ar" ? c.nameAr ?? c.name : c.name,
      cohortCode: c.cohortCode,
      programName: locale === "ar" ? c.program.nameAr : c.program.nameEn,
      scheduleDays: c.scheduleDays as string[],
      timeSlot: c.timeSlot,
      durationMinutes: c.durationMinutes,
      maxStudents: c.maxStudents,
      studentCount: c._count.enrollments,
      status: c.status as string,
      nextSession: c.sessions[0]
        ? {
            id: c.sessions[0].id,
            scheduledDate: c.sessions[0].scheduledDate.toISOString(),
            status: c.sessions[0].status as string,
            hasMeeting: !!c.sessions[0].zoomMeetingId,
          }
        : null,
    })),
    ...privateLessons.map((l) => ({
      kind: "PRIVATE" as const,
      id: `pl-${l.id}`,
      title: locale === "ar"
        ? `درس خصوصي — ${l.student.user.nameAr ?? l.student.user.name}`
        : `Private — ${l.student.user.name}`,
      cohortCode: l.id.slice(0, 8).toUpperCase(),
      programName: locale === "ar" ? "خصوصي" : "Private",
      scheduleDays: [] as string[],
      timeSlot: l.scheduledAt.toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      durationMinutes: l.durationMinutes,
      maxStudents: 1,
      studentCount: 1,
      studentName:
        locale === "ar" && l.student.user.nameAr ? l.student.user.nameAr : l.student.user.name,
      status: l.status as string,
      nextSession: {
        id: l.id,
        scheduledDate: l.scheduledAt.toISOString(),
        status: l.status as string,
        hasMeeting: !!l.zoomMeetingId,
      },
    })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("Nav.myClasses")}</h1>
      <TeacherClassesClient locale={locale} items={items} />
    </div>
  );
}
