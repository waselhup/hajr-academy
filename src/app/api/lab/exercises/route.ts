import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const EXERCISE_TYPES = [
  "SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY",
];
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * GET /api/lab/exercises — list published lab exercises.
 * Query params: skill (ExerciseType), level (CefrLevel), tag, limit.
 * For students, each exercise includes their own attempt status.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const skill = sp.get("skill");
    const level = sp.get("level");
    const tag = sp.get("tag");
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "60", 10)));

    const where: Prisma.LabExerciseWhereInput = { isPublished: true };
    if (skill && EXERCISE_TYPES.includes(skill)) {
      where.type = skill as Prisma.LabExerciseWhereInput["type"];
    }
    if (level && CEFR_LEVELS.includes(level)) {
      where.level = level as Prisma.LabExerciseWhereInput["level"];
    }
    if (tag) where.tags = { has: tag };

    const exercises = await prisma.labExercise.findMany({
      where,
      orderBy: [{ level: "asc" }, { createdAt: "asc" }],
      take: limit,
      select: {
        id: true,
        type: true,
        level: true,
        title: true,
        titleAr: true,
        description: true,
        descriptionAr: true,
        estimatedMinutes: true,
        pointsValue: true,
        tags: true,
      },
    });

    // Attach this student's attempt status, if they are a student.
    let attemptMap = new Map<string, { status: string; score: number | null }>();
    if (session.user.role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (student) {
        const attempts = await prisma.labAttempt.findMany({
          where: {
            studentId: student.id,
            exerciseId: { in: exercises.map((e) => e.id) },
          },
          orderBy: { startedAt: "desc" },
          select: { exerciseId: true, status: true, score: true },
        });
        for (const a of attempts) {
          if (!attemptMap.has(a.exerciseId)) {
            attemptMap.set(a.exerciseId, {
              status: a.status,
              score: a.score ? Number(a.score) : null,
            });
          }
        }
      }
    }

    return NextResponse.json({
      exercises: exercises.map((e) => ({
        ...e,
        attempt: attemptMap.get(e.id) ?? null,
      })),
    });
  } catch (e) {
    console.error("[api/lab/exercises] failed:", e);
    return NextResponse.json({ error: "Failed to load exercises" }, { status: 500 });
  }
}
