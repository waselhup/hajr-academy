/**
 * POST /api/ratings/post-session — student rates a teacher right after class.
 * Body: { sessionId, rating 1-5, studentNoteForParent? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireRole("STUDENT");
  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    rating?: number;
    studentNoteForParent?: string;
  };
  if (!body.sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
  }
  const rating = Math.round(Number(body.rating ?? 0));
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "rating 1-5" }, { status: 400 });
  }

  const cs = await prisma.classSession.findUnique({
    where: { id: body.sessionId },
    include: { class: { select: { teacherId: true } } },
  });
  if (!cs) {
    return NextResponse.json({ ok: false, error: "session not found" }, { status: 404 });
  }

  // Eligibility: student must have an attendance row for this session
  const sp = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!sp) {
    return NextResponse.json({ ok: false, error: "no student profile" }, { status: 400 });
  }
  const att = await prisma.attendance.findFirst({
    where: { sessionId: cs.id, studentId: sp.id },
  });
  if (!att) {
    return NextResponse.json({ ok: false, error: "not enrolled in session" }, { status: 403 });
  }

  const rated = await prisma.teacherRating.upsert({
    where: {
      teacherId_raterId_sessionId: {
        teacherId: cs.class.teacherId,
        raterId: session.user.id,
        sessionId: cs.id,
      },
    },
    create: {
      teacherId: cs.class.teacherId,
      raterId: session.user.id,
      raterRole: "STUDENT",
      sessionId: cs.id,
      rating,
      kind: "POST_SESSION",
      studentNoteForParent: body.studentNoteForParent ?? null,
    },
    update: {
      rating,
      kind: "POST_SESSION",
      studentNoteForParent: body.studentNoteForParent ?? null,
    },
  });

  await refreshTeacherRating(cs.class.teacherId);
  await audit.mutation(session.user.id, "TEACHER_RATED_POST_SESSION", "TeacherRating", rated.id);

  return NextResponse.json({ ok: true, rating: rated });
}

async function refreshTeacherRating(teacherId: string) {
  const agg = await prisma.teacherRating.aggregate({
    where: { teacherId, isApproved: true, kind: "POST_SESSION" },
    _avg: { rating: true },
  });
  await prisma.teacherProfile.update({
    where: { id: teacherId },
    data: { rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null },
  });
}
