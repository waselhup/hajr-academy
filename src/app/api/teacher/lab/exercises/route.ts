import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const EXERCISE_TYPES = [
  "SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY",
];
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * GET /api/teacher/lab/exercises — exercises created by this teacher
 * (plus, with ?scope=library, the public published library).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const scope = req.nextUrl.searchParams.get("scope");
    const where =
      scope === "library"
        ? { isPublished: true }
        : { createdBy: session.user.id };

    const exercises = await prisma.labExercise.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        level: true,
        title: true,
        titleAr: true,
        estimatedMinutes: true,
        pointsValue: true,
        tags: true,
        isPublished: true,
        createdBy: true,
        createdAt: true,
        _count: { select: { attempts: true } },
      },
    });

    return NextResponse.json({ exercises });
  } catch (e) {
    console.error("[api/teacher/lab/exercises] GET failed:", e);
    return NextResponse.json({ error: "Failed to load exercises" }, { status: 500 });
  }
}

/**
 * POST /api/teacher/lab/exercises — create a new lab exercise.
 * Body: { type, level, title, titleAr, description?, descriptionAr?,
 *         content, estimatedMinutes?, pointsValue?, tags?, isPublished? }
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
    const { type, level, title, titleAr, content } = body;

    if (!type || !EXERCISE_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid exercise type" }, { status: 400 });
    }
    if (!level || !CEFR_LEVELS.includes(level)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }
    if (!title || !titleAr) {
      return NextResponse.json(
        { error: "title and titleAr are required" },
        { status: 400 }
      );
    }
    if (!content || typeof content !== "object") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const exercise = await prisma.labExercise.create({
      data: {
        type,
        level,
        title: String(title),
        titleAr: String(titleAr),
        description: body.description ? String(body.description) : null,
        descriptionAr: body.descriptionAr ? String(body.descriptionAr) : null,
        content,
        estimatedMinutes:
          typeof body.estimatedMinutes === "number" ? body.estimatedMinutes : 10,
        pointsValue: typeof body.pointsValue === "number" ? body.pointsValue : 10,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        isPublished: body.isPublished === true,
        createdBy: session.user.id,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "LAB_EXERCISE_CREATED",
      entity: "LabExercise",
      entityId: exercise.id,
      metadata: { type, level, isPublished: exercise.isPublished },
    });

    return NextResponse.json({ exercise });
  } catch (e) {
    console.error("[api/teacher/lab/exercises] POST failed:", e);
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
  }
}
