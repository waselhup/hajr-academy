import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/exams/stats — mock-exam attempt statistics.
 *
 * Returns per-exam attempt counts, average scores, and pass rates.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const exams = await prisma.testExam.findMany({
      select: {
        id: true,
        title: true,
        titleAr: true,
        type: true,
        passingScore: true,
        totalQuestions: true,
      },
    });

    const completedAttempts = await prisma.examAttempt.findMany({
      where: { status: "COMPLETED" },
      select: { examId: true, totalScore: true, passed: true },
    });

    // Aggregate completed attempts per exam.
    const perExam = new Map<
      string,
      { count: number; scoreSum: number; passCount: number }
    >();
    for (const a of completedAttempts) {
      const agg = perExam.get(a.examId) ?? {
        count: 0,
        scoreSum: 0,
        passCount: 0,
      };
      agg.count += 1;
      agg.scoreSum += Number(a.totalScore ?? 0);
      if (a.passed) agg.passCount += 1;
      perExam.set(a.examId, agg);
    }

    const inProgress = await prisma.examAttempt.count({
      where: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({
      totalExams: exams.length,
      totalCompletedAttempts: completedAttempts.length,
      inProgressAttempts: inProgress,
      exams: exams.map((e) => {
        const agg = perExam.get(e.id);
        return {
          id: e.id,
          title: e.titleAr ?? e.title,
          type: e.type,
          totalQuestions: e.totalQuestions,
          passingScore: e.passingScore,
          attempts: agg?.count ?? 0,
          avgScore:
            agg && agg.count > 0
              ? Math.round((agg.scoreSum / agg.count) * 100) / 100
              : null,
          passRate:
            agg && agg.count > 0
              ? Math.round((agg.passCount / agg.count) * 10000) / 100
              : null,
        };
      }),
    });
  } catch (e) {
    console.error("[api/admin/exams/stats] failed:", e);
    return NextResponse.json({ error: "Failed to load exam stats" }, { status: 500 });
  }
}
