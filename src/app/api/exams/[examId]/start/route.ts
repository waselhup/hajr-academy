import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/exams/[examId]/start — begin a mock exam attempt.
 *
 * Creates an ExamAttempt and returns the exam's questions WITHOUT their
 * correct answers (the answer key never reaches the client). If the
 * student already has an IN_PROGRESS attempt for this exam, that attempt
 * is resumed with its saved answers.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { examId: string } }
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

    const exam = await prisma.testExam.findUnique({
      where: { id: params.examId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: { question: true },
        },
      },
    });
    if (!exam || !exam.isPublished) {
      return NextResponse.json({ error: "Exam not available" }, { status: 404 });
    }

    // Resume an in-progress attempt if one exists.
    let attempt = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: student.id, status: "IN_PROGRESS" },
      include: { answers: true },
    });
    let resumed = true;

    if (!attempt) {
      resumed = false;
      attempt = await prisma.examAttempt.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          status: "IN_PROGRESS",
        },
        include: { answers: true },
      });
      await logAudit({
        userId: session.user.id,
        action: "EXAM_STARTED",
        entity: "ExamAttempt",
        entityId: attempt.id,
        metadata: { examId: exam.id },
      });
    }

    // Server-authoritative deadline.
    const deadline = new Date(
      attempt.startedAt.getTime() + exam.totalMinutes * 60_000
    );

    // Strip correct answers / explanations before sending to the client.
    const questions = exam.questions.map((eq) => ({
      examQuestionId: eq.id,
      questionId: eq.questionId,
      orderIndex: eq.orderIndex,
      sectionOrder: eq.sectionOrder,
      section: eq.question.section,
      type: eq.question.type,
      difficulty: eq.question.difficulty,
      questionText: eq.question.questionText,
      questionAudio: eq.question.questionAudio,
      passage: eq.question.passage,
      // Options without the isCorrect flag.
      options: Array.isArray(eq.question.options)
        ? (eq.question.options as { id: string; text: string }[]).map((o) => ({
            id: o.id,
            text: o.text,
          }))
        : null,
    }));

    // Saved answers for resume.
    const savedAnswers = (attempt.answers ?? []).reduce(
      (acc, a) => {
        acc[a.questionId] = a.answer;
        return acc;
      },
      {} as Record<string, unknown>
    );

    return NextResponse.json({
      attemptId: attempt.id,
      resumed,
      startedAt: attempt.startedAt.toISOString(),
      deadline: deadline.toISOString(),
      totalMinutes: exam.totalMinutes,
      exam: {
        id: exam.id,
        title: exam.title,
        titleAr: exam.titleAr,
        sectionStructure: exam.sectionStructure,
        passingScore: exam.passingScore,
      },
      questions,
      savedAnswers,
    });
  } catch (e) {
    console.error("[api/exams/[examId]/start] failed:", e);
    return NextResponse.json({ error: "Failed to start exam" }, { status: 500 });
  }
}
