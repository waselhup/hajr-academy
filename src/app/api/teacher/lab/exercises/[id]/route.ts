import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * PUT /api/teacher/lab/exercises/[id] — update an exercise.
 * Only the creator, or an admin, may edit.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin && session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const exercise = await prisma.labExercise.findUnique({
      where: { id: params.id },
      select: { id: true, createdBy: true },
    });
    if (!exercise) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isAdmin && exercise.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Not your exercise" }, { status: 403 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.titleAr !== undefined) data.titleAr = String(body.titleAr);
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description) : null;
    }
    if (body.descriptionAr !== undefined) {
      data.descriptionAr = body.descriptionAr ? String(body.descriptionAr) : null;
    }
    if (body.content !== undefined) data.content = body.content;
    if (typeof body.estimatedMinutes === "number") {
      data.estimatedMinutes = body.estimatedMinutes;
    }
    if (typeof body.pointsValue === "number") data.pointsValue = body.pointsValue;
    if (Array.isArray(body.tags)) data.tags = body.tags.map(String);
    if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;

    const updated = await prisma.labExercise.update({
      where: { id: params.id },
      data,
    });

    await logAudit({
      userId: session.user.id,
      action: "LAB_EXERCISE_UPDATED",
      entity: "LabExercise",
      entityId: params.id,
    });

    return NextResponse.json({ exercise: updated });
  } catch (e) {
    console.error("[api/teacher/lab/exercises/[id]] PUT failed:", e);
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
  }
}

/**
 * DELETE /api/teacher/lab/exercises/[id] — delete an exercise.
 * Only the creator or an admin may delete.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin && session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const exercise = await prisma.labExercise.findUnique({
      where: { id: params.id },
      select: { id: true, createdBy: true },
    });
    if (!exercise) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isAdmin && exercise.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Not your exercise" }, { status: 403 });
    }

    await prisma.labExercise.delete({ where: { id: params.id } });

    await logAudit({
      userId: session.user.id,
      action: "LAB_EXERCISE_DELETED",
      entity: "LabExercise",
      entityId: params.id,
    });

    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error("[api/teacher/lab/exercises/[id]] DELETE failed:", e);
    return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
  }
}
