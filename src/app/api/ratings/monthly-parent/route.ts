/**
 * POST /api/ratings/monthly-parent — parent rates their child's teacher
 * for the current month (one rating per parent+teacher per month).
 *
 * Body: { teacherId, studentId, rating 1-5, comment?, improved? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireRole("PARENT");
  const body = (await req.json().catch(() => ({}))) as {
    teacherId?: string;
    studentId?: string;
    rating?: number;
    comment?: string;
    improved?: string;
  };
  if (!body.teacherId || !body.studentId) {
    return NextResponse.json(
      { ok: false, error: "teacherId + studentId required" },
      { status: 400 }
    );
  }
  const rating = Math.round(Number(body.rating ?? 0));
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "rating 1-5" }, { status: 400 });
  }

  // Eligibility: parent must be linked to this student, and student must be
  // enrolled in a class taught by this teacher.
  const pp = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      childLinks: { where: { studentId: body.studentId } },
    },
  });
  if (!pp || pp.childLinks.length === 0) {
    return NextResponse.json({ ok: false, error: "not your child" }, { status: 403 });
  }
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: body.teacherId },
    select: { id: true, classes: { select: { id: true } } },
  });
  if (!teacher) return NextResponse.json({ ok: false, error: "teacher not found" }, { status: 404 });
  const classIds = teacher.classes.map((c) => c.id);
  const enrolled = await prisma.enrollment.findFirst({
    where: { studentId: body.studentId, classId: { in: classIds }, status: "ACTIVE" },
  });
  if (!enrolled) {
    return NextResponse.json({ ok: false, error: "child not in class" }, { status: 403 });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const rated = await prisma.teacherRating.upsert({
    where: {
      teacherRating_monthly_uniq: {
        teacherId: body.teacherId,
        raterId: session.user.id,
        kind: "PARENT_MONTHLY",
        year,
        month,
      },
    },
    create: {
      teacherId: body.teacherId,
      raterId: session.user.id,
      raterRole: "PARENT",
      kind: "PARENT_MONTHLY",
      rating,
      comment: body.comment ?? null,
      improved: body.improved ?? null,
      year,
      month,
    },
    update: {
      rating,
      comment: body.comment ?? null,
      improved: body.improved ?? null,
    },
  });

  await audit.mutation(session.user.id, "TEACHER_RATED_PARENT_MONTHLY", "TeacherRating", rated.id);
  return NextResponse.json({ ok: true, rating: rated });
}

// PUT — parent "skips" the monthly rating (records dismissal so they don't see
// the gate again this month). We just upsert a 0-rated row with a flag.
export async function DELETE(req: NextRequest) {
  const session = await requireRole("PARENT");
  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");
  if (!teacherId) {
    return NextResponse.json({ ok: false, error: "teacherId" }, { status: 400 });
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  await prisma.teacherRating
    .upsert({
      where: {
        teacherRating_monthly_uniq: {
          teacherId,
          raterId: session.user.id,
          kind: "PARENT_MONTHLY",
          year,
          month,
        },
      },
      create: {
        teacherId,
        raterId: session.user.id,
        raterRole: "PARENT",
        kind: "PARENT_MONTHLY",
        rating: 0,
        comment: "[skipped]",
        year,
        month,
      },
      update: { comment: "[skipped]" },
    })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
