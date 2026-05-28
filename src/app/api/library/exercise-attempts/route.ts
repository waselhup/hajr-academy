/**
 * POST /api/library/exercise-attempts — student submits exercise answers
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification/xp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireRole("STUDENT");
  const body = (await req.json().catch(() => ({}))) as {
    libraryItemId?: string;
    score?: number;
    answers?: unknown;
  };
  if (!body.libraryItemId || body.answers === undefined) {
    return NextResponse.json(
      { ok: false, error: "libraryItemId and answers required" },
      { status: 400 }
    );
  }
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!studentProfile) {
    return NextResponse.json({ ok: false, error: "no student profile" }, { status: 400 });
  }

  const item = await prisma.libraryItem.findUnique({
    where: { id: body.libraryItemId },
    select: { id: true, isPublished: true, type: true },
  });
  if (!item || !item.isPublished || item.type !== "EXERCISE") {
    return NextResponse.json({ ok: false, error: "item not available" }, { status: 404 });
  }

  const score = Math.max(0, Math.min(100, Math.round(body.score ?? 0)));

  const attempt = await prisma.libraryExerciseAttempt.create({
    data: {
      libraryItemId: item.id,
      studentId: studentProfile.id,
      score,
      answersJson: body.answers as never,
    },
  });

  // Mark progress as completed
  try {
    await prisma.libraryProgress.upsert({
      where: {
        studentId_libraryItemId: {
          studentId: studentProfile.id,
          libraryItemId: item.id,
        },
      },
      create: {
        studentId: studentProfile.id,
        libraryItemId: item.id,
        status: "COMPLETED",
        progressPct: 100,
        completedAt: new Date(),
      },
      update: {
        status: "COMPLETED",
        progressPct: 100,
        completedAt: new Date(),
      },
    });
  } catch {}

  awardXp({
    studentId: studentProfile.id,
    reason: "library_exercise_passed",
    points: score >= 70 ? 10 : 3,
  }).catch(() => {});

  return NextResponse.json({ ok: true, attempt });
}
