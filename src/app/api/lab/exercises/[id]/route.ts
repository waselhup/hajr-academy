import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/lab/exercises/[id] — full exercise detail including content.
 * Any authenticated user may read a published exercise; the creator and
 * admins may also read drafts.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exercise = await prisma.labExercise.findUnique({
      where: { id: params.id },
    });
    if (!exercise) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    const isOwner = exercise.createdBy === session.user.id;
    if (!exercise.isPublished && !isAdmin && !isOwner) {
      return NextResponse.json({ error: "Not available" }, { status: 403 });
    }

    return NextResponse.json({ exercise });
  } catch (e) {
    console.error("[api/lab/exercises/[id]] failed:", e);
    return NextResponse.json({ error: "Failed to load exercise" }, { status: 500 });
  }
}
