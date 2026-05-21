import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/lab/attempts/[id] — save in-progress attempt state.
 * Body: { submission?, timeSpentSec? }
 * Only the owning student may update, and only while IN_PROGRESS.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const attempt = await prisma.labAttempt.findUnique({
      where: { id: params.id },
      select: { id: true, studentId: true, status: true },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (attempt.studentId !== student.id) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Attempt already finished" }, { status: 409 });
    }

    const body = await req.json();
    const data: { submission?: object; timeSpentSec?: number } = {};
    if (body.submission !== undefined) data.submission = body.submission;
    if (typeof body.timeSpentSec === "number") {
      data.timeSpentSec = Math.max(0, Math.round(body.timeSpentSec));
    }

    const updated = await prisma.labAttempt.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ attempt: updated });
  } catch (e) {
    console.error("[api/lab/attempts/[id]] PATCH failed:", e);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}

/**
 * GET /api/lab/attempts/[id] — fetch an attempt (owner, or teacher/admin).
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
    const attempt = await prisma.labAttempt.findUnique({
      where: { id: params.id },
      include: { exercise: true },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = session.user.role;
    if (role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student || attempt.studentId !== student.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ attempt });
  } catch (e) {
    console.error("[api/lab/attempts/[id]] GET failed:", e);
    return NextResponse.json({ error: "Failed to load attempt" }, { status: 500 });
  }
}
