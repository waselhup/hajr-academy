import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { evaluateEssay, evaluateMultipleChoice } from "@/lib/lab/ai-evaluator";

export const dynamic = "force-dynamic";

/**
 * POST /api/exams/[attemptId]/submit — grade and finalise a mock exam.
 *
 * Body: { answers?: { [questionId]: answer }, timeSpentSec? }
 *
 * The exam timer is server-authoritative: if the submission arrives
 * after startedAt + totalMinutes, it is still accepted (a late/auto
 * submit) and graded with whatever answers were saved.
 *
 * Grading:
 * - MC sections graded instantly by JS comparison.
 * - WRITING/ESSAY questions evaluated by the AI essay evaluator.
 * - Section scores, total score, pass/fail, and percentile are computed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        exam: {
          include: {
            questions: { include: { question: true } },
          },
        },
        answers: true,
      },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (attempt.studentId !== student.id) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }
    if (attempt.status === "COMPLETED") {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const incomingAnswers = (body.answers ?? {}) as Record<string, unknown>;

    // Merge any last-minute answers with already-saved ones.
    const answerMap: Record<string, unknown> = {};
    for (const a of attempt.answers) answerMap[a.questionId] = a.answer;
    for (const [qid, val] of Object.entries(incomingAnswers)) {
      answerMap[qid] = val;
    }

    // Server-authoritative time: clamp time spent to the exam window.
    const examMs = attempt.exam.totalMinutes * 60_000;
    const elapsedMs = Date.now() - attempt.startedAt.getTime();
    const timeSpentSec = Math.min(
      Math.round(examMs / 1000),
      typeof body.timeSpentSec === "number"
        ? Math.round(body.timeSpentSec)
        : Math.round(elapsedMs / 1000)
    );

    // Grade each question.
    const sectionTotals: Record<string, { correct: number; total: number }> = {};
    let writingEval: Record<string, unknown> | null = null;
    const answerWrites: {
      questionId: string;
      answer: unknown;
      isCorrect: boolean | null;
      pointsEarned: number;
      aiEval: Record<string, unknown> | null;
    }[] = [];

    for (const eq of attempt.exam.questions) {
      const q = eq.question;
      const section = q.section;
      sectionTotals[section] ??= { correct: 0, total: 0 };
      sectionTotals[section].total += 1;

      const studentAnswer = answerMap[eq.questionId];

      if (q.type === "ESSAY" || section === "WRITING") {
        // AI-evaluate the essay; score contributes proportionally.
        const text = String(
          (studentAnswer as Record<string, unknown>)?.text ?? studentAnswer ?? ""
        );
        const evaluation = await evaluateEssay(text, q.questionText, "B1");
        writingEval = evaluation as unknown as Record<string, unknown>;
        // Essay counts as "correct fraction" = score/100 for the section.
        const frac = evaluation.score / 100;
        sectionTotals[section].correct += frac;
        answerWrites.push({
          questionId: eq.questionId,
          answer: studentAnswer ?? null,
          isCorrect: null,
          pointsEarned: Math.round(frac * 100) / 100,
          aiEval: evaluation as unknown as Record<string, unknown>,
        });
      } else {
        const isCorrect = evaluateMultipleChoice(
          studentAnswer,
          q.correctAnswer
        );
        if (isCorrect) sectionTotals[section].correct += 1;
        answerWrites.push({
          questionId: eq.questionId,
          answer: studentAnswer ?? null,
          isCorrect,
          pointsEarned: isCorrect ? 1 : 0,
          aiEval: null,
        });
      }
    }

    // Section scores as percentages; total = mean across answered questions.
    const sectionScores: Record<string, number> = {};
    let totalCorrect = 0;
    let totalQuestions = 0;
    for (const [section, t] of Object.entries(sectionTotals)) {
      sectionScores[section] =
        t.total > 0 ? Math.round((t.correct / t.total) * 10000) / 100 : 0;
      totalCorrect += t.correct;
      totalQuestions += t.total;
    }
    const totalScore =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
        : 0;
    const passed = totalScore >= attempt.exam.passingScore;

    // Percentile vs other completed attempts of the same exam.
    const otherScores = await prisma.examAttempt.findMany({
      where: {
        examId: attempt.examId,
        status: "COMPLETED",
        totalScore: { not: null },
      },
      select: { totalScore: true },
    });
    const scores = otherScores.map((o) => Number(o.totalScore));
    const below = scores.filter((s) => s < totalScore).length;
    const percentile =
      scores.length > 0
        ? Math.round((below / scores.length) * 100)
        : 100;

    // Persist: answers + finalised attempt, in one transaction.
    await prisma.$transaction([
      ...answerWrites.map((aw) =>
        prisma.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: params.attemptId,
              questionId: aw.questionId,
            },
          },
          create: {
            attemptId: params.attemptId,
            questionId: aw.questionId,
            answer: (aw.answer ?? {}) as object,
            isCorrect: aw.isCorrect,
            pointsEarned: aw.pointsEarned,
            aiEval: (aw.aiEval ?? undefined) as Prisma.InputJsonValue | undefined,
          },
          update: {
            answer: (aw.answer ?? {}) as object,
            isCorrect: aw.isCorrect,
            pointsEarned: aw.pointsEarned,
            aiEval: (aw.aiEval ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        })
      ),
      prisma.examAttempt.update({
        where: { id: params.attemptId },
        data: {
          status: "COMPLETED",
          submittedAt: new Date(),
          timeSpentSec,
          sectionScores,
          totalScore,
          percentile,
          passed,
          writingEval: (writingEval ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      }),
    ]);

    await logAudit({
      userId: session.user.id,
      action: "EXAM_SUBMITTED",
      entity: "ExamAttempt",
      entityId: params.attemptId,
      metadata: { examId: attempt.examId, totalScore, passed, percentile },
    });

    return NextResponse.json({
      attemptId: params.attemptId,
      totalScore,
      sectionScores,
      passed,
      percentile,
    });
  } catch (e) {
    console.error("[api/exams/[attemptId]/submit] failed:", e);
    return NextResponse.json({ error: "Failed to submit exam" }, { status: 500 });
  }
}
