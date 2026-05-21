import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/lab/review — submit a manual teacher review for a
 * lab attempt (typically a speaking or writing submission).
 *
 * Body: { attemptId, teacherReview, teacherScore? }
 *
 * The teacher's review and score are stored alongside the AI evaluation;
 * they do not overwrite the AI score.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { attemptId, teacherReview } = body;
    if (!attemptId || !teacherReview) {
      return NextResponse.json(
        { error: "attemptId and teacherReview are required" },
        { status: 400 }
      );
    }

    const attempt = await prisma.labAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    let teacherScore: number | undefined;
    if (body.teacherScore !== undefined && body.teacherScore !== null) {
      const n = Number(body.teacherScore);
      if (Number.isFinite(n)) {
        teacherScore = Math.max(0, Math.min(100, Math.round(n * 100) / 100));
      }
    }

    const updated = await prisma.labAttempt.update({
      where: { id: attemptId },
      data: {
        teacherReview: String(teacherReview),
        teacherScore,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "LAB_ATTEMPT_REVIEWED",
      entity: "LabAttempt",
      entityId: attemptId,
      metadata: { teacherScore: teacherScore ?? null },
    });

    return NextResponse.json({ attempt: updated });
  } catch (e) {
    console.error("[api/teacher/lab/review] failed:", e);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
