import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/lab/stats — English Lab usage statistics.
 *
 * Returns exercise counts by type, attempt totals, completion rate,
 * and the most-attempted exercises.
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
    const [
      totalExercises,
      publishedExercises,
      byType,
      totalAttempts,
      completedAttempts,
      topExercises,
    ] = await Promise.all([
      prisma.labExercise.count(),
      prisma.labExercise.count({ where: { isPublished: true } }),
      prisma.labExercise.groupBy({
        by: ["type"],
        _count: { _all: true },
      }),
      prisma.labAttempt.count(),
      prisma.labAttempt.count({ where: { status: "COMPLETED" } }),
      prisma.labExercise.findMany({
        orderBy: { attempts: { _count: "desc" } },
        take: 10,
        select: {
          id: true,
          title: true,
          titleAr: true,
          type: true,
          level: true,
          _count: { select: { attempts: true } },
        },
      }),
    ]);

    const completionRate =
      totalAttempts > 0
        ? Math.round((completedAttempts / totalAttempts) * 10000) / 100
        : 0;

    return NextResponse.json({
      totalExercises,
      publishedExercises,
      draftExercises: totalExercises - publishedExercises,
      byType: byType.map((t) => ({ type: t.type, count: t._count._all })),
      totalAttempts,
      completedAttempts,
      completionRate,
      topExercises: topExercises.map((e) => ({
        id: e.id,
        title: e.titleAr ?? e.title,
        type: e.type,
        level: e.level,
        attempts: e._count.attempts,
      })),
    });
  } catch (e) {
    console.error("[api/admin/lab/stats] failed:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
