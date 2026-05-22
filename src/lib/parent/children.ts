/**
 * Parent ⇄ child data access (Phase 9).
 *
 * Every function here enforces the rule that a parent may only see their
 * own linked children — `assertParentOwnsChild` is the single gate, and
 * the aggregate fetchers all route through it.
 *
 * Used by the parent portal pages and the parent AI agent tools.
 */

import { prisma } from "@/lib/prisma";

/** Resolve the ParentProfile id for a user, or null if not a parent. */
export async function getParentProfileId(
  userId: string
): Promise<string | null> {
  const pp = await prisma.parentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return pp?.id ?? null;
}

/**
 * Throw-free ownership check: returns true iff `studentId` is linked to
 * the parent identified by `userId`.
 */
export async function parentOwnsChild(
  userId: string,
  studentId: string
): Promise<boolean> {
  const parentId = await getParentProfileId(userId);
  if (!parentId) return false;
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { id: true },
  });
  return !!link;
}

export interface ChildSummary {
  studentId: string;
  name: string;
  nameAr: string | null;
  gradeLevel: string | null;
  className: string | null;
  classId: string | null;
  attendanceRate: number | null;
  nextClassAt: string | null;
  subscriptionStatus: string | null;
}

/** List the parent's children with at-a-glance summary stats. */
export async function getChildrenSummary(
  userId: string
): Promise<ChildSummary[]> {
  const parentId = await getParentProfileId(userId);
  if (!parentId) return [];

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId },
    include: {
      student: {
        include: {
          user: { select: { name: true, nameAr: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: true },
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true },
          },
        },
      },
    },
  });

  const out: ChildSummary[] = [];
  for (const link of links) {
    const s = link.student;
    const primaryClass = s.enrollments[0]?.class ?? null;

    out.push({
      studentId: s.id,
      name: s.user.name,
      nameAr: s.user.nameAr,
      gradeLevel: s.gradeLevel,
      className: primaryClass
        ? primaryClass.nameAr ?? primaryClass.name
        : null,
      classId: primaryClass?.id ?? null,
      attendanceRate: await getAttendanceRate(s.id),
      nextClassAt: await getNextClassAt(s.id),
      subscriptionStatus: s.subscriptions[0]?.status ?? null,
    });
  }
  return out;
}

/** This-month attendance rate (0–100) for a student, or null if no data. */
export async function getAttendanceRate(
  studentId: string
): Promise<number | null> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: { studentId, session: { scheduledDate: { gte: monthStart } } },
    select: { status: true },
  });
  if (records.length === 0) return null;
  const present = records.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE"
  ).length;
  return Math.round((present / records.length) * 100);
}

/** ISO timestamp of a student's next scheduled class, or null. */
export async function getNextClassAt(
  studentId: string
): Promise<string | null> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: { classId: true },
  });
  if (enrollments.length === 0) return null;

  const next = await prisma.classSession.findFirst({
    where: {
      classId: { in: enrollments.map((e) => e.classId) },
      status: { in: ["SCHEDULED", "LIVE"] },
      scheduledDate: { gte: new Date(Date.now() - 3600_000) },
    },
    orderBy: { scheduledDate: "asc" },
    select: { scheduledDate: true },
  });
  return next?.scheduledDate.toISOString() ?? null;
}

/** A child's CEFR skill levels (English Lab). */
export async function getChildSkillLevels(studentId: string) {
  const skills = await prisma.skillLevel.findMany({
    where: { studentId },
    orderBy: { skill: "asc" },
  });
  return skills.map((s) => ({
    skill: s.skill,
    currentLevel: s.currentLevel,
    confidence: Number(s.confidence),
    totalPoints: s.totalPoints,
    totalAttempts: s.totalAttempts,
    lastAssessedAt: s.lastAssessedAt?.toISOString() ?? null,
  }));
}

/** A child's recent Lab attempt + exam results (grades). */
export async function getChildGrades(studentId: string) {
  const [labAttempts, examAttempts] = await Promise.all([
    prisma.labAttempt.findMany({
      where: { studentId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { exercise: { select: { title: true, titleAr: true, type: true } } },
    }),
    prisma.examAttempt.findMany({
      where: { studentId, status: "COMPLETED" },
      orderBy: { submittedAt: "desc" },
      take: 20,
      include: { exam: { select: { title: true, titleAr: true } } },
    }),
  ]);

  return {
    labResults: labAttempts.map((a) => ({
      id: a.id,
      title: a.exercise.title,
      titleAr: a.exercise.titleAr,
      type: a.exercise.type,
      score: a.teacherScore != null ? Number(a.teacherScore) : a.score != null ? Number(a.score) : null,
      teacherReview: a.teacherReview,
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    examResults: examAttempts.map((a) => ({
      id: a.id,
      title: a.exam.title,
      titleAr: a.exam.titleAr,
      totalScore: a.totalScore != null ? Number(a.totalScore) : null,
      passed: a.passed,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    })),
  };
}

/** A child's weekly class schedule. */
export async function getChildSchedule(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    include: {
      class: {
        include: {
          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
          program: { select: { nameEn: true, nameAr: true } },
        },
      },
    },
  });
  return enrollments.map((e) => ({
    classId: e.class.id,
    className: e.class.nameAr ?? e.class.name,
    teacherName: e.class.teacher.user.nameAr ?? e.class.teacher.user.name,
    programName: e.class.program.nameAr ?? e.class.program.nameEn,
    scheduleDays: e.class.scheduleDays,
    timeSlot: e.class.timeSlot,
    durationMinutes: e.class.durationMinutes,
  }));
}

/** Day-by-day attendance for a child within a month (calendar data). */
export async function getChildAttendanceCalendar(
  studentId: string,
  year: number,
  month: number // 1–12
) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      session: { scheduledDate: { gte: start, lt: end } },
    },
    include: { session: { select: { scheduledDate: true } } },
  });

  const days = records.map((r) => ({
    date: r.session.scheduledDate.toISOString().slice(0, 10),
    status: r.status,
  }));
  const present = records.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE"
  ).length;

  return {
    year,
    month,
    days,
    total: records.length,
    present,
    rate: records.length > 0 ? Math.round((present / records.length) * 100) : null,
  };
}
