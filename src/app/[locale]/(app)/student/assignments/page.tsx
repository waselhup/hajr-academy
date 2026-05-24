import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getStudentScope } from "@/lib/student/scope";
import {
  StudentAssignmentsClient,
  type AssignmentRow,
  type LabExerciseRow,
  type ExamRow,
} from "./student-assignments-client";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await requireRole("STUDENT");
  const t = await getTranslations();

  const scope = await getStudentScope(session.user.id);

  let assignments: AssignmentRow[] = [];
  let labExercises: LabExerciseRow[] = [];
  let exams: ExamRow[] = [];

  if (scope) {
    const [aRaw, lRaw, eRows, attempts] = await Promise.all([
      prisma.assignment.findMany({
        where: { classId: { in: scope.classIds } },
        include: {
          class: { select: { name: true, nameAr: true, cohortCode: true } },
          submissions: {
            where: { studentId: scope.studentId },
            select: { id: true, grade: true, submittedAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      // Teacher-scoped lab exercises — created by ANY of the student's
      // teachers, OR published exercises tagged for their programs.
      prisma.labExercise.findMany({
        where: {
          isPublished: true,
          OR: [
            { createdBy: { in: scope.teacherUserIds } },
            // Plus a small fallback so brand-new students see a starter set.
            ...(scope.teacherUserIds.length === 0 ? [{ isPublished: true }] : []),
          ],
        },
        include: { _count: { select: { attempts: true } } },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      // Exams created by the student's teachers (or published ones if
      // no teacher-created exams exist yet).
      prisma.testExam.findMany({
        where: {
          isPublished: true,
          OR: [
            { createdBy: { in: scope.teacherUserIds } },
            ...(scope.teacherUserIds.length === 0 ? [{ isPublished: true }] : []),
          ],
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          title: true,
          titleAr: true,
          totalQuestions: true,
          totalMinutes: true,
          passingScore: true,
        },
        take: 30,
      }),
      prisma.examAttempt.findMany({
        where: { studentId: scope.studentId },
        select: { examId: true, totalScore: true, status: true, id: true },
      }),
    ]);

    const now = new Date();
    assignments = aRaw.map((a) => {
      const sub = a.submissions[0] ?? null;
      const overdue = a.dueDate ? a.dueDate < now && !sub : false;
      return {
        id: a.id,
        title: locale === "ar" ? a.titleAr ?? a.title : a.title,
        className: locale === "ar" ? a.class.nameAr ?? a.class.name : a.class.name,
        cohortCode: a.class.cohortCode,
        dueDate: a.dueDate?.toISOString() ?? null,
        submitted: !!sub,
        grade: sub?.grade ?? null,
        overdue,
      };
    });

    labExercises = lRaw.map((e) => ({
      id: e.id,
      type: e.type,
      level: e.level,
      title: locale === "ar" ? e.titleAr : e.title,
      attempts: e._count.attempts,
    }));

    const best = new Map<string, number>();
    const inProgress = new Map<string, string>();
    for (const at of attempts) {
      if (at.status === "COMPLETED" && at.totalScore != null) {
        const prev = best.get(at.examId) ?? -1;
        best.set(at.examId, Math.max(prev, Number(at.totalScore)));
      }
      if (at.status === "IN_PROGRESS") inProgress.set(at.examId, at.id);
    }

    exams = eRows.map((e) => ({
      id: e.id,
      type: e.type as string,
      title: locale === "ar" ? e.titleAr : e.title,
      totalQuestions: e.totalQuestions,
      totalMinutes: e.totalMinutes,
      passingScore: e.passingScore,
      bestScore: best.get(e.id) ?? null,
      inProgressAttemptId: inProgress.get(e.id) ?? null,
    }));
  }

  const initialTab = (["assignments", "lab", "exams"].includes(sp.tab ?? "")
    ? sp.tab
    : "assignments") as "assignments" | "lab" | "exams";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("Assignments.pageTitle")}</h1>
      <StudentAssignmentsClient
        locale={locale}
        initialTab={initialTab}
        assignments={assignments}
        labExercises={labExercises}
        exams={exams}
      />
    </div>
  );
}
