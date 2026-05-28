/**
 * GET /api/teacher/library/students/[id]/activity
 *   — teacher views one student's library activity (must teach them)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const { id: studentId } = await params;

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  // Teacher must currently teach this student
  if (!isAdmin) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!teacherProfile) {
      return NextResponse.json({ ok: false, error: "no teacher profile" }, { status: 403 });
    }
    const taughtClasses = await prisma.class.findMany({
      where: { teacherId: teacherProfile.id },
      select: { id: true },
    });
    const enrolled = await prisma.enrollment.findFirst({
      where: {
        studentId,
        classId: { in: taughtClasses.map((c) => c.id) },
        status: "ACTIVE",
      },
    });
    if (!enrolled) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  const [progress, attempts] = await Promise.all([
    prisma.libraryProgress.findMany({
      where: { studentId },
      orderBy: { lastAccessAt: "desc" },
      include: {
        libraryItem: {
          select: { id: true, title: true, titleAr: true, type: true, durationMinutes: true },
        },
      },
      take: 100,
    }),
    prisma.libraryExerciseAttempt.findMany({
      where: { studentId },
      orderBy: { completedAt: "desc" },
      include: {
        libraryItem: { select: { id: true, title: true, titleAr: true } },
      },
      take: 50,
    }),
  ]);

  const totalTime = progress.reduce((acc, p) => acc + p.timeSpentSec, 0);
  const completed = progress.filter((p) => p.status === "COMPLETED").length;

  return NextResponse.json({
    ok: true,
    summary: {
      itemsOpened: progress.length,
      itemsCompleted: completed,
      totalTimeSec: totalTime,
    },
    progress,
    attempts,
  });
}
