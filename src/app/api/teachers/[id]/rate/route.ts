/**
 * Sprint 3 — Student/parent submits a rating for a teacher.
 *
 * POST /api/teachers/[id]/rate  body: { rating: 1-5, comment?, sessionId? }
 *
 * Eligibility: caller must be STUDENT (enrolled in a class taught by the
 * teacher) or PARENT of such a student. Unique per (teacher, rater, session).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "STUDENT" && role !== "PARENT") {
    return NextResponse.json({ error: "Only students or parents can rate" }, { status: 403 });
  }
  const { id: teacherId } = await params;

  let body: { rating?: number; comment?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rating = Math.round(Number(body.rating ?? 0));
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }
  const comment = body.comment ? String(body.comment).trim().slice(0, 1000) : null;

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true, classes: { select: { id: true } } },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }
  const teacherClassIds = teacher.classes.map((c) => c.id);

  // Eligibility check.
  let eligible = false;
  if (role === "STUDENT") {
    const sp = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        enrollments: { select: { classId: true } },
      },
    });
    eligible = !!sp?.enrollments.some((e) => teacherClassIds.includes(e.classId));
  } else if (role === "PARENT") {
    const pp = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        childLinks: {
          include: {
            student: {
              include: { enrollments: { select: { classId: true } } },
            },
          },
        },
      },
    });
    eligible =
      pp?.childLinks.some((l) =>
        l.student.enrollments.some((e) => teacherClassIds.includes(e.classId))
      ) ?? false;
  }
  if (!eligible) {
    return NextResponse.json(
      { error: "You are not eligible to rate this teacher" },
      { status: 403 }
    );
  }

  // Upsert via unique (teacherId, raterId, sessionId).
  const sessionId = body.sessionId ?? null;
  const rated = await prisma.teacherRating.upsert({
    where: {
      teacherId_raterId_sessionId: {
        teacherId,
        raterId: session.user.id,
        sessionId: sessionId as string,
      },
    },
    create: {
      teacherId,
      raterId: session.user.id,
      raterRole: role,
      sessionId,
      rating,
      comment,
    },
    update: { rating, comment },
  });

  // Recompute teacher's avg + cache on TeacherProfile.rating.
  await refreshTeacherRating(teacherId);

  await audit.mutation(session.user.id, "TEACHER_RATED", "TeacherRating", rated.id, {
    teacherId,
    rating,
  });

  return NextResponse.json({ rating: rated }, { status: 201 });
}

async function refreshTeacherRating(teacherId: string) {
  const agg = await prisma.teacherRating.aggregate({
    where: { teacherId, isApproved: true },
    _avg: { rating: true },
  });
  await prisma.teacherProfile.update({
    where: { id: teacherId },
    data: {
      rating: agg._avg.rating
        ? Number(agg._avg.rating.toFixed(2))
        : null,
    },
  });
}
