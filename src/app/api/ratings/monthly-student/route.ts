/**
 * POST /api/ratings/monthly-student — student rates a teacher for the month.
 * Body: { teacherId, rating 1-5, improved (Yes|No|Unsure), comment? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireRole("STUDENT");
  const body = (await req.json().catch(() => ({}))) as {
    teacherId?: string;
    rating?: number;
    improved?: string;
    comment?: string;
  };
  if (!body.teacherId) {
    return NextResponse.json({ ok: false, error: "teacherId required" }, { status: 400 });
  }
  const rating = Math.round(Number(body.rating ?? 0));
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "rating 1-5" }, { status: 400 });
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Eligibility: student must be currently enrolled with this teacher
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: body.teacherId },
    select: { id: true, classes: { select: { id: true } } },
  });
  if (!teacher) return NextResponse.json({ ok: false, error: "teacher not found" }, { status: 404 });
  const classIds = teacher.classes.map((c) => c.id);
  const sp = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, enrollments: { select: { classId: true, status: true } } },
  });
  if (!sp) return NextResponse.json({ ok: false, error: "no student profile" }, { status: 400 });
  const ok = sp.enrollments.some((e) => classIds.includes(e.classId) && e.status === "ACTIVE");
  if (!ok) return NextResponse.json({ ok: false, error: "not eligible" }, { status: 403 });

  const rated = await prisma.teacherRating.upsert({
    where: {
      teacherRating_monthly_uniq: {
        teacherId: body.teacherId,
        raterId: session.user.id,
        kind: "MONTHLY",
        year,
        month,
      },
    },
    create: {
      teacherId: body.teacherId,
      raterId: session.user.id,
      raterRole: "STUDENT",
      kind: "MONTHLY",
      rating,
      improved: body.improved ?? null,
      comment: body.comment ?? null,
      year,
      month,
    },
    update: { rating, improved: body.improved ?? null, comment: body.comment ?? null },
  });

  await audit.mutation(session.user.id, "TEACHER_RATED_MONTHLY", "TeacherRating", rated.id);
  return NextResponse.json({ ok: true, rating: rated });
}
