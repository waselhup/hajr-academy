import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getStudentScope } from "@/lib/student/scope";
import { LiveClassBanner } from "@/components/class/live-class-banner";
import { StudentHero, type DashboardData } from "./_components/student-hero";
import { MoatCards } from "@/components/shell/moat-cards";
import { GamificationCard } from "@/components/gamification/gamification-card";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations();

  const scope = await getStudentScope(session.user.id);

  // Default empty payload — page still renders friendly empty state.
  let data: DashboardData = {
    name: session.user.name ?? "",
    nameAr: null,
    avatar: null,
    gradeLevel: null,
    activePackage: null,
    attendancePct: 0,
    openAssignments: 0,
    avgGrade: 0,
    nextClass: null,
    teachers: [],
    activity: [],
  };

  if (scope) {
    const now = new Date();
    const horizon = new Date(now.getTime() + 14 * 86400_000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000);
    const next24h = new Date(now.getTime() + 24 * 3600_000);

    const [
      profileFull,
      attendances,
      openAssignments,
      recentGrades,
      nextSession,
      teachers,
      newAssignments,
      gradedSubmissions,
      examResults,
      dueInvoices,
      upcomingSessions,
    ] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { id: scope.studentId },
        include: { user: { select: { name: true, nameAr: true, avatar: true } } },
      }),
      prisma.attendance.findMany({
        where: {
          studentId: scope.studentId,
          session: { scheduledDate: { gte: new Date(now.getTime() - 60 * 86400_000) } },
        },
        select: { status: true },
      }),
      prisma.assignment.count({
        where: {
          classId: { in: scope.classIds },
          OR: [{ dueDate: null }, { dueDate: { gte: now } }],
          submissions: { none: { studentId: scope.studentId } },
        },
      }),
      prisma.submission.findMany({
        where: { studentId: scope.studentId, grade: { not: null } },
        select: { grade: true },
        orderBy: { gradedAt: "desc" },
        take: 5,
      }),
      scope.classIds.length > 0
        ? prisma.classSession.findFirst({
            where: {
              classId: { in: scope.classIds },
              OR: [
                { status: "LIVE" },
                {
                  status: "SCHEDULED",
                  scheduledDate: { gte: new Date(now.getTime() - 3600_000), lte: horizon },
                },
              ],
            },
            orderBy: [{ status: "asc" }, { scheduledDate: "asc" }],
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  cohortCode: true,
                  durationMinutes: true,
                  teacher: { include: { user: { select: { id: true, name: true, nameAr: true, avatar: true } } } },
                },
              },
            },
          })
        : Promise.resolve(null),
      scope.teacherUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: scope.teacherUserIds } },
            select: {
              id: true,
              name: true,
              nameAr: true,
              avatar: true,
              teacherProfile: {
                select: {
                  specializations: true,
                  classes: {
                    where: { id: { in: scope.classIds } },
                    select: { name: true, nameAr: true, cohortCode: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      // Activity sources
      prisma.assignment.findMany({
        where: { classId: { in: scope.classIds }, createdAt: { gte: sevenDaysAgo } },
        select: { id: true, title: true, titleAr: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.submission.findMany({
        where: {
          studentId: scope.studentId,
          gradedAt: { gte: sevenDaysAgo, not: null },
          grade: { not: null },
        },
        select: {
          id: true,
          grade: true,
          gradedAt: true,
          assignment: { select: { title: true, titleAr: true } },
        },
        orderBy: { gradedAt: "desc" },
        take: 5,
      }),
      prisma.examAttempt.findMany({
        where: {
          studentId: scope.studentId,
          submittedAt: { gte: sevenDaysAgo, not: null },
          totalScore: { not: null },
        },
        select: { id: true, totalScore: true, submittedAt: true },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: { studentId: scope.studentId, status: "PENDING" },
        select: { id: true, totalSar: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 3,
      }),
      prisma.classSession.findMany({
        where: {
          classId: { in: scope.classIds },
          status: "SCHEDULED",
          scheduledDate: { gte: now, lte: next24h },
        },
        select: {
          id: true,
          scheduledDate: true,
          class: { select: { name: true, nameAr: true } },
        },
        orderBy: { scheduledDate: "asc" },
        take: 3,
      }),
    ]);

    // Attendance %
    const present = attendances.filter((a) => a.status === "PRESENT").length;
    const late = attendances.filter((a) => a.status === "LATE").length;
    const totalA = attendances.length;
    const attendancePct =
      totalA > 0 ? Math.round(((present + late * 0.5) / totalA) * 100) : 0;

    // Avg grade
    const grades = recentGrades.map((g) => g.grade!).filter((g) => g != null);
    const avgGrade =
      grades.length > 0
        ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length)
        : 0;

    let isLive = false;
    if (nextSession) {
      if (nextSession.status === "LIVE") {
        isLive = true;
      } else {
        const startMs = nextSession.scheduledDate.getTime();
        const endMs = startMs + nextSession.class.durationMinutes * 60_000;
        if (now.getTime() >= startMs && now.getTime() <= endMs) isLive = true;
      }
    }

    // Activity merge
    const activity: DashboardData["activity"] = [];
    for (const a of newAssignments) {
      activity.push({
        id: `asn-new-${a.id}`,
        type: "ASSIGNMENT_NEW",
        time: a.createdAt.toISOString(),
        href: `/${locale}/student/assignments`,
        data: { title: a.titleAr ?? a.title },
      });
    }
    for (const s of gradedSubmissions) {
      activity.push({
        id: `sub-${s.id}`,
        type: "ASSIGNMENT_GRADED",
        time: (s.gradedAt ?? now).toISOString(),
        href: `/${locale}/student/assignments`,
        data: { title: s.assignment.titleAr ?? s.assignment.title, score: Number(s.grade ?? 0) },
      });
    }
    for (const e of examResults) {
      activity.push({
        id: `exam-${e.id}`,
        type: "EXAM_RESULT",
        time: (e.submittedAt ?? now).toISOString(),
        href: `/${locale}/student/exams/results/${e.id}`,
        data: { score: Math.round(Number(e.totalScore ?? 0)) },
      });
    }
    for (const inv of dueInvoices) {
      activity.push({
        id: `inv-${inv.id}`,
        type: "INVOICE_DUE",
        time: inv.dueDate.toISOString(),
        href: `/${locale}/student/billing`,
        data: { amount: Number(inv.totalSar) },
      });
    }
    for (const cs of upcomingSessions) {
      activity.push({
        id: `sess-${cs.id}`,
        type: "CLASS_REMINDER",
        time: cs.scheduledDate.toISOString(),
        href: `/${locale}/student/classes`,
        data: { class: cs.class.nameAr ?? cs.class.name },
      });
    }
    activity.sort((a, b) => (a.time < b.time ? 1 : -1));

    data = {
      name: profileFull?.user.name ?? session.user.name ?? "",
      nameAr: profileFull?.user.nameAr ?? null,
      avatar: profileFull?.user.avatar ?? null,
      gradeLevel: profileFull?.gradeLevel ?? null,
      activePackage: profileFull?.activePackage ?? null,
      attendancePct,
      openAssignments,
      avgGrade,
      nextClass: nextSession
        ? {
            id: nextSession.id,
            classId: nextSession.class.id,
            className: locale === "ar" ? nextSession.class.nameAr ?? nextSession.class.name : nextSession.class.name,
            cohortCode: nextSession.class.cohortCode,
            teacherName:
              locale === "ar"
                ? nextSession.class.teacher.user.nameAr ?? nextSession.class.teacher.user.name
                : nextSession.class.teacher.user.name,
            teacherUserId: nextSession.class.teacher.user.id,
            teacherAvatar: nextSession.class.teacher.user.avatar ?? null,
            scheduledStartAt: nextSession.scheduledDate.toISOString(),
            durationMinutes: nextSession.class.durationMinutes,
            isLive,
            hasMeeting: !!nextSession.zoomMeetingId,
            status: nextSession.status,
          }
        : null,
      teachers: teachers.map((u) => ({
        userId: u.id,
        name: locale === "ar" && u.nameAr ? u.nameAr : u.name,
        avatar: u.avatar,
        classes:
          u.teacherProfile?.classes.map((c) =>
            locale === "ar" ? c.nameAr ?? c.name : c.name
          ) ?? [],
      })),
      activity: activity.slice(0, 6),
    };
  }

  return (
    <div className="space-y-5">
      {scope && (
        <LiveClassBanner userId={session.user.id} classIds={scope.classIds} />
      )}
      <GamificationCard />
      <StudentHero locale={locale} data={data} />
      <MoatCards role="student" locale={locale} />
    </div>
  );
}
