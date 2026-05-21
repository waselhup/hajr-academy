import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ExamResultsClient } from "./exam-results-client";

export const dynamic = "force-dynamic";

/**
 * /student/exams/results/[attemptId] — detailed exam results: overall
 * score, section breakdown, and a question-by-question review.
 */
export default async function ExamResultsPage({
  params,
}: {
  params: { attemptId: string; locale: string };
}) {
  const session = await requireRole("STUDENT");

  let payload: any = null;

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: params.attemptId },
      include: { exam: true },
    });
    if (!attempt) notFound();

    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student || attempt.studentId !== student.id) notFound();

    const order = await prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      orderBy: { orderIndex: "asc" },
      select: { questionId: true, orderIndex: true },
    });
    const answers = await prisma.examAnswer.findMany({
      where: { attemptId: params.attemptId },
      include: { question: true },
    });
    const answerByQ = new Map(answers.map((a) => [a.questionId, a]));

    const review = order.map((o) => {
      const a = answerByQ.get(o.questionId);
      const q = a?.question;
      return {
        orderIndex: o.orderIndex,
        section: q?.section ?? null,
        questionText: q?.questionText ?? "",
        type: q?.type ?? null,
        options: q?.options ?? null,
        topic: q?.topic ?? null,
        yourAnswer: a?.answer ?? null,
        correctAnswer: q?.correctAnswer ?? null,
        isCorrect: a?.isCorrect ?? null,
        explanation: q?.explanation ?? null,
        explanationAr: q?.explanationAr ?? null,
      };
    });

    payload = {
      totalScore:
        attempt.totalScore != null ? Number(attempt.totalScore) : 0,
      sectionScores: attempt.sectionScores,
      percentile: attempt.percentile ?? 0,
      passed: attempt.passed ?? false,
      passingScore: attempt.exam.passingScore,
      timeSpentSec: attempt.timeSpentSec,
      totalMinutes: attempt.exam.totalMinutes,
      examTitle: attempt.exam.title,
      examTitleAr: attempt.exam.titleAr,
      writingEval: attempt.writingEval,
      review,
    };
  } catch (e) {
    console.error("[exam-results] DB query failed:", e);
    notFound();
  }

  return <ExamResultsClient data={payload} />;
}
