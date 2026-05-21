import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/attempts/[attemptId] — detailed exam results.
 *
 * Returns the graded attempt with a question-by-question review:
 * each question, the student's answer, the correct answer, and the
 * explanation. Correct answers ARE included here because the exam is
 * already submitted. Accessible to the owning student and teachers/admins.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        exam: true,
        answers: { include: { question: true } },
        student: { include: { user: { select: { name: true, nameAr: true } } } },
      },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = session.user.role;
    if (role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student || attempt.studentId !== student.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build the question-by-question review, ordered by exam order.
    const order = await prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      orderBy: { orderIndex: "asc" },
      select: { questionId: true, orderIndex: true, sectionOrder: true },
    });
    const orderMap = new Map(order.map((o) => [o.questionId, o]));
    const answerByQ = new Map(attempt.answers.map((a) => [a.questionId, a]));

    const review = order.map((o) => {
      const a = answerByQ.get(o.questionId);
      const q = a?.question;
      return {
        orderIndex: o.orderIndex,
        section: q?.section ?? null,
        questionText: q?.questionText ?? "",
        passage: q?.passage ?? null,
        type: q?.type ?? null,
        options: q?.options ?? null,
        topic: q?.topic ?? null,
        yourAnswer: a?.answer ?? null,
        correctAnswer: q?.correctAnswer ?? null,
        isCorrect: a?.isCorrect ?? null,
        pointsEarned: a ? Number(a.pointsEarned) : 0,
        explanation: q?.explanation ?? null,
        explanationAr: q?.explanationAr ?? null,
        aiEval: a?.aiEval ?? null,
      };
    });

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        timeSpentSec: attempt.timeSpentSec,
        totalScore: attempt.totalScore != null ? Number(attempt.totalScore) : null,
        sectionScores: attempt.sectionScores,
        percentile: attempt.percentile,
        passed: attempt.passed,
        writingEval: attempt.writingEval,
        studentName:
          attempt.student.user.nameAr ?? attempt.student.user.name,
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        titleAr: attempt.exam.titleAr,
        totalMinutes: attempt.exam.totalMinutes,
        passingScore: attempt.exam.passingScore,
        sectionStructure: attempt.exam.sectionStructure,
      },
      review,
    });
  } catch (e) {
    console.error("[api/exams/attempts/[attemptId]] failed:", e);
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }
}
