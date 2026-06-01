import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sanitizeAnswers } from "@/lib/openings/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/applications — a teacher submits their application to an
 * OPEN program opening (creative survey + optional voice intro path).
 * Body JSON: { openingId, whyQualified, answers, voicePath }
 * One application per opening is enforced by the @@unique(openingId,teacherId);
 * a duplicate returns 409 ALREADY_APPLIED.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!teacherProfile) {
      return NextResponse.json({ error: "No teacher profile" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const openingId = typeof body.openingId === "string" ? body.openingId : "";
    const whyQualified =
      typeof body.whyQualified === "string" ? body.whyQualified.trim() : "";
    const voicePath =
      typeof body.voicePath === "string" && body.voicePath.trim()
        ? body.voicePath.trim()
        : null;

    if (!openingId) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    if (whyQualified.length < 10) {
      return NextResponse.json({ error: "WHY_TOO_SHORT" }, { status: 400 });
    }

    const opening = await prisma.programOpening.findUnique({
      where: { id: openingId },
      select: { id: true, status: true },
    });
    if (!opening || opening.status !== "OPEN") {
      return NextResponse.json({ error: "OPENING_NOT_OPEN" }, { status: 400 });
    }

    const answers = sanitizeAnswers(body.answers);

    try {
      const app = await prisma.teacherApplication.create({
        data: {
          openingId: opening.id,
          teacherId: teacherProfile.id,
          status: "SUBMITTED",
          whyQualified: whyQualified.slice(0, 4000),
          answersJson: answers as Prisma.InputJsonValue,
          voiceIntroUrl: voicePath,
        },
        select: { id: true },
      });

      await audit.mutation(
        session.user.id,
        "TEACHER_APPLICATION_SUBMITTED",
        "TeacherApplication",
        app.id,
        { openingId: opening.id }
      );

      return NextResponse.json({ ok: true, id: app.id });
    } catch (e) {
      // Unique violation on (openingId, teacherId) → already applied.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return NextResponse.json({ error: "ALREADY_APPLIED" }, { status: 409 });
      }
      throw e;
    }
  } catch (e) {
    console.error("[api/teacher/applications] failed:", e);
    return NextResponse.json({ error: "SUBMIT_FAILED" }, { status: 500 });
  }
}
