import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSkillLevels } from "@/lib/lab/recommender";

export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/lab/students/[studentId] — a student's lab progress.
 *
 * Returns all six skill levels (with history), recent attempts, and the
 * manual-review queue (writing/speaking attempts not yet teacher-reviewed).
 * Available to teachers and admins.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
      include: { user: { select: { name: true, nameAr: true, email: true } } },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const skillLevels = await ensureSkillLevels(student.id);

    const recentAttempts = await prisma.labAttempt.findMany({
      where: { studentId: student.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { exercise: { select: { title: true, titleAr: true, type: true } } },
    });

    // Manual-review queue: speaking/writing attempts without a teacher score.
    const reviewQueue = await prisma.labAttempt.findMany({
      where: {
        studentId: student.id,
        status: "COMPLETED",
        teacherScore: null,
        exercise: { type: { in: ["SPEAKING", "WRITING"] } },
      },
      orderBy: { completedAt: "desc" },
      include: { exercise: { select: { title: true, type: true } } },
    });

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.user.nameAr ?? student.user.name,
        email: student.user.email,
        englishLevel: student.englishLevel,
      },
      skillLevels: skillLevels.map((l) => ({
        skill: l.skill,
        currentLevel: l.currentLevel,
        confidence: Number(l.confidence),
        totalAttempts: l.totalAttempts,
        totalPoints: l.totalPoints,
        levelHistory: l.levelHistory,
        lastAssessedAt: l.lastAssessedAt?.toISOString() ?? null,
      })),
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id,
        exerciseTitle: a.exercise.titleAr ?? a.exercise.title,
        type: a.exercise.type,
        score: a.score != null ? Number(a.score) : null,
        completedAt: a.completedAt?.toISOString() ?? null,
        timeSpentSec: a.timeSpentSec,
      })),
      reviewQueue: reviewQueue.map((a) => ({
        id: a.id,
        exerciseTitle: a.exercise.title,
        type: a.exercise.type,
        score: a.score != null ? Number(a.score) : null,
        completedAt: a.completedAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    console.error("[api/teacher/lab/students/[studentId]] failed:", e);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
