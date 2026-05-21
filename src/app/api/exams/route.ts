import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams — list published mock exams. For students, each exam
 * includes their best previous score.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exams = await prisma.testExam.findMany({
      where: { isPublished: true },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        type: true,
        testType: true,
        title: true,
        titleAr: true,
        description: true,
        totalQuestions: true,
        totalMinutes: true,
        passingScore: true,
        difficulty: true,
        sectionStructure: true,
      },
    });

    let bestScores = new Map<string, number>();
    let inProgress = new Map<string, string>();
    if (session.user.role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (student) {
        const attempts = await prisma.examAttempt.findMany({
          where: {
            studentId: student.id,
            examId: { in: exams.map((e) => e.id) },
          },
          select: { examId: true, totalScore: true, status: true, id: true },
        });
        for (const a of attempts) {
          if (a.status === "COMPLETED" && a.totalScore != null) {
            const prev = bestScores.get(a.examId) ?? -1;
            bestScores.set(a.examId, Math.max(prev, Number(a.totalScore)));
          }
          if (a.status === "IN_PROGRESS") {
            inProgress.set(a.examId, a.id);
          }
        }
      }
    }

    return NextResponse.json({
      exams: exams.map((e) => ({
        ...e,
        bestScore: bestScores.get(e.id) ?? null,
        inProgressAttemptId: inProgress.get(e.id) ?? null,
      })),
    });
  } catch (e) {
    console.error("[api/exams] failed:", e);
    return NextResponse.json({ error: "Failed to load exams" }, { status: 500 });
  }
}
