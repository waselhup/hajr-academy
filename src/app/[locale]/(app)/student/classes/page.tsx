import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { LiveClassBanner } from "@/components/class/live-class-banner";
import { StudentClassesClient, type StudentClassItem } from "./student-classes-client";
import type { AvailableTeacher, PrivateProgram } from "./available-teachers";

export const dynamic = "force-dynamic";

export default async function StudentClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations();

  const profile = await prisma.studentProfile.findUnique({
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

  const [enrollments, privateLessons, availableTeacherRows, privateProgramRows] =
    await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: profile.id, status: "ACTIVE" },
      include: {
        class: {
          include: {
            program: true,
            teacher: { include: { user: { select: { name: true, nameAr: true, avatar: true } } } },
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
        },
      },
    }),
    prisma.privateLesson.findMany({
      where: {
        studentId: profile.id,
        OR: [
          { status: "LIVE" },
          { status: "SCHEDULED", scheduledAt: { gte: new Date(Date.now() - 86400_000) } },
        ],
      },
      include: {
        teacher: { include: { user: { select: { name: true, nameAr: true, avatar: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    // Owner batch 5 — #9: surface active teachers for one-to-one discovery.
    // Public-safe projection ONLY (name/avatar/specialization/availability —
    // never salary, rates, email or phone).
    prisma.teacherProfile.findMany({
      where: { active: true, user: { isActive: true } },
      select: {
        id: true,
        specializations: true,
        availabilityDays: true,
        availabilityHours: true,
        user: { select: { name: true, nameAr: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    // One-to-one (PRIVATE) programs the student can request a teacher for.
    prisma.program.findMany({
      where: { type: "PRIVATE", active: true },
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: "asc" },
    }),
  ]);

  const items: StudentClassItem[] = [
    ...enrollments.map(({ class: c }) => ({
      kind: "GROUP" as const,
      id: c.id,
      title: locale === "ar" ? c.nameAr ?? c.name : c.name,
      cohortCode: c.cohortCode,
      programName: locale === "ar" ? c.program.nameAr : c.program.nameEn,
      teacherName:
        locale === "ar" && c.teacher.user.nameAr ? c.teacher.user.nameAr : c.teacher.user.name,
      teacherAvatar: c.teacher.user.avatar ?? null,
      scheduleDays: c.scheduleDays as string[],
      timeSlot: c.timeSlot,
      durationMinutes: c.durationMinutes,
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
      title:
        locale === "ar"
          ? `درس خصوصي مع ${l.teacher.user.nameAr ?? l.teacher.user.name}`
          : `Private with ${l.teacher.user.name}`,
      cohortCode: l.id.slice(0, 8).toUpperCase(),
      programName: locale === "ar" ? "خصوصي" : "Private",
      teacherName:
        locale === "ar" && l.teacher.user.nameAr ? l.teacher.user.nameAr : l.teacher.user.name,
      teacherAvatar: l.teacher.user.avatar ?? null,
      scheduleDays: [] as string[],
      timeSlot: l.scheduledAt.toLocaleTimeString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      durationMinutes: l.durationMinutes,
      studentCount: 1,
      status: l.status as string,
      nextSession: {
        id: l.id,
        scheduledDate: l.scheduledAt.toISOString(),
        status: l.status as string,
        hasMeeting: !!l.zoomMeetingId,
      },
    })),
  ];

  const availableTeachers: AvailableTeacher[] = availableTeacherRows.map((tp) => ({
    id: tp.id,
    name: locale === "ar" && tp.user.nameAr ? tp.user.nameAr : tp.user.name,
    avatar: tp.user.avatar ?? null,
    specializations: tp.specializations,
    availabilityDays: tp.availabilityDays,
    availabilityHours: tp.availabilityHours ?? null,
  }));

  const privatePrograms: PrivateProgram[] = privateProgramRows.map((p) => ({
    id: p.id,
    name: locale === "ar" ? p.nameAr : p.nameEn,
  }));

  return (
    <div className="space-y-6">
      <LiveClassBanner userId={session.user.id} />
      <h1 className="text-2xl font-bold">{t("Nav.myClasses")}</h1>
      <StudentClassesClient
        locale={locale}
        items={items}
        availableTeachers={availableTeachers}
        privatePrograms={privatePrograms}
      />
    </div>
  );
}
