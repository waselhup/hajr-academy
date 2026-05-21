import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ExamListClient } from "./exam-list-client";

export const dynamic = "force-dynamic";

/**
 * /student/exams — list of available mock exams with the student's best
 * previous score and any in-progress attempt.
 */
export default async function StudentExamsPage() {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Exam");

  let exams: any[] = [];

  try {
    const rows = await prisma.testExam.findMany({
      where: { isPublished: true },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        type: true,
        title: true,
        titleAr: true,
        description: true,
        totalQuestions: true,
        totalMinutes: true,
        passingScore: true,
      },
    });

    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    let bestScores = new Map<string, number>();
    let inProgress = new Map<string, string>();
    if (student) {
      const attempts = await prisma.examAttempt.findMany({
        where: { studentId: student.id, examId: { in: rows.map((e) => e.id) } },
        select: { examId: true, totalScore: true, status: true, id: true },
      });
      for (const a of attempts) {
        if (a.status === "COMPLETED" && a.totalScore != null) {
          const prev = bestScores.get(a.examId) ?? -1;
          bestScores.set(a.examId, Math.max(prev, Number(a.totalScore)));
        }
        if (a.status === "IN_PROGRESS") inProgress.set(a.examId, a.id);
      }
    }

    exams = rows.map((e) => ({
      ...e,
      bestScore: bestScores.get(e.id) ?? null,
      inProgressAttemptId: inProgress.get(e.id) ?? null,
    }));
  } catch (e) {
    console.error("[student-exams] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ExamListClient exams={exams} />
    </div>
  );
}
