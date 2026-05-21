import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/lab/attempts — start a new attempt at a lab exercise.
 * Body: { exerciseId }
 * If an IN_PROGRESS attempt already exists for this student+exercise,
 * it is returned instead of creating a duplicate.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  try {
    const { exerciseId } = await req.json();
    if (!exerciseId) {
      return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const exercise = await prisma.labExercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, isPublished: true },
    });
    if (!exercise || !exercise.isPublished) {
      return NextResponse.json({ error: "Exercise not available" }, { status: 404 });
    }

    // Reuse an in-progress attempt if one exists.
    const existing = await prisma.labAttempt.findFirst({
      where: { studentId: student.id, exerciseId, status: "IN_PROGRESS" },
    });
    if (existing) {
      return NextResponse.json({ attempt: existing, resumed: true });
    }

    const attempt = await prisma.labAttempt.create({
      data: {
        exerciseId,
        studentId: student.id,
        status: "IN_PROGRESS",
        submission: {},
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "LAB_ATTEMPT_STARTED",
      entity: "LabAttempt",
      entityId: attempt.id,
      metadata: { exerciseId },
    });

    return NextResponse.json({ attempt, resumed: false });
  } catch (e) {
    console.error("[api/lab/attempts] POST failed:", e);
    return NextResponse.json({ error: "Failed to start attempt" }, { status: 500 });
  }
}
