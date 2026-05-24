import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentScope } from "@/lib/student/scope";

export const dynamic = "force-dynamic";

/**
 * GET /api/student/dashboard-stats
 * Aggregated stats for the student dashboard hero.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const scope = await getStudentScope(session.user.id);
  if (!scope) {
    return NextResponse.json({ error: "No student profile" }, { status: 404 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86400_000);

  const [
    attendances,
    openAssignments,
    recentGrades,
    nextSession,
    teachers,
  ] = await Promise.all([
    // Attendance — last 60 days
    prisma.attendance.findMany({
      where: {
        studentId: scope.studentId,
        session: { scheduledDate: { gte: new Date(now.getTime() - 60 * 86400_000) } },
      },
      select: { status: true },
    }),
    // Open assignments — due in future, no submission yet
    prisma.assignment.count({
      where: {
        classId: { in: scope.classIds },
        OR: [{ dueDate: null }, { dueDate: { gte: now } }],
        submissions: { none: { studentId: scope.studentId } },
      },
    }),
    // Last 5 graded submissions
    prisma.submission.findMany({
      where: {
        studentId: scope.studentId,
        grade: { not: null },
      },
      select: { grade: true },
      orderBy: { gradedAt: "desc" },
      take: 5,
    }),
    // Next class session
    prisma.classSession.findFirst({
      where: {
        classId: { in: scope.classIds },
        OR: [
          { status: "LIVE" },
          { status: "SCHEDULED", scheduledDate: { gte: new Date(now.getTime() - 3600_000), lte: horizon } },
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
            teacher: { include: { user: { select: { name: true, nameAr: true } } } },
          },
        },
      },
    }),
    // Teachers — distinct users
    prisma.user.findMany({
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
    }),
  ]);

  // attendance%: present + late*0.5 over total
  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const late = attendances.filter((a) => a.status === "LATE").length;
  const total = attendances.length;
  const attendancePct =
    total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

  // avg grade
  const grades = recentGrades.map((g) => g.grade!).filter((g) => g != null);
  const avgGrade =
    grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length) : 0;

  // is next session live?
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

  return NextResponse.json({
    attendancePct,
    openAssignments,
    avgGrade,
    teacherCount: scope.teacherUserIds.length,
    nextClass: nextSession
      ? {
          id: nextSession.id,
          classId: nextSession.class.id,
          className: nextSession.class.nameAr ?? nextSession.class.name,
          classNameEn: nextSession.class.name,
          cohortCode: nextSession.class.cohortCode,
          teacherName:
            nextSession.class.teacher.user.nameAr ?? nextSession.class.teacher.user.name,
          scheduledStartAt: nextSession.scheduledDate.toISOString(),
          durationMinutes: nextSession.class.durationMinutes,
          isLive,
          hasMeeting: !!nextSession.zoomMeetingId,
          status: nextSession.status,
        }
      : null,
    teachers: teachers.map((u) => ({
      userId: u.id,
      name: u.name,
      nameAr: u.nameAr,
      avatar: u.avatar,
      specializations: u.teacherProfile?.specializations ?? [],
      classes:
        u.teacherProfile?.classes.map((c) => ({
          name: c.nameAr ?? c.name,
          nameEn: c.name,
          cohortCode: c.cohortCode,
        })) ?? [],
    })),
  });
}
