import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/exams/[attemptId]/save-progress — auto-save exam answers.
 *
 * Body: { answers: { [questionId]: answer }, timeSpentSec? }
 *
 * Called every ~30s by the exam UI so a browser crash never loses work.
 * Upserts one ExamAnswer per question (no grading happens here).
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
      select: { id: true, studentId: true, status: true },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (attempt.studentId !== student.id) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Exam already submitted" }, { status: 409 });
    }

    const body = await req.json();
    const answers = (body.answers ?? {}) as Record<string, unknown>;
    const timeSpentSec =
      typeof body.timeSpentSec === "number"
        ? Math.max(0, Math.round(body.timeSpentSec))
        : undefined;

    // Upsert each answer. Done sequentially in a transaction for consistency.
    const entries = Object.entries(answers);
    await prisma.$transaction([
      ...entries.map(([questionId, answer]) =>
        prisma.examAnswer.upsert({
          where: {
            attemptId_questionId: { attemptId: params.attemptId, questionId },
          },
          create: {
            attemptId: params.attemptId,
            questionId,
            answer: answer as object,
          },
          update: { answer: answer as object },
        })
      ),
      ...(timeSpentSec !== undefined
        ? [
            prisma.examAttempt.update({
              where: { id: params.attemptId },
              data: { timeSpentSec },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ saved: true, count: entries.length });
  } catch (e) {
    console.error("[api/exams/[attemptId]/save-progress] failed:", e);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
