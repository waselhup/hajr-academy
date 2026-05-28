/**
 * GET /api/parent/monthly-summary/[childId]
 *   — drives the parent-pay rating card. Returns:
 *     - average POST_SESSION rating this month
 *     - last 4 LessonSummary.teacherNotes excerpts
 *     - whether parent has already rated PARENT_MONTHLY this month
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await requireRole("PARENT", "ADMIN", "SUPER_ADMIN");
  const { childId } = await params;

  // Parent eligibility
  if (session.user.role === "PARENT") {
    const link = await prisma.parentStudentLink.findFirst({
      where: { studentId: childId, parent: { userId: session.user.id } },
    });
    if (!link) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: childId },
      include: {
        user: { select: { name: true, nameAr: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            class: {
              include: {
                teacher: { include: { user: { select: { name: true, nameAr: true } } } },
              },
            },
          },
        },
      },
    });
    if (!student) {
      return NextResponse.json({ ok: false, error: "child not found" }, { status: 404 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const teachers: Array<{
      teacherId: string;
      teacherName: string;
      avgRating: number | null;
      ratingsCount: number;
      teacherNotes: Array<{ when: Date; noteAr: string | null; noteEn: string | null }>;
      alreadyRated: boolean;
    }> = [];

    const seenTeachers = new Set<string>();
    for (const en of student.enrollments) {
      const tid = en.class.teacherId;
      if (seenTeachers.has(tid)) continue;
      seenTeachers.add(tid);

      const [agg, rated, summaries] = await Promise.all([
        prisma.teacherRating.aggregate({
          where: {
            teacherId: tid,
            raterId: student.userId,
            kind: "POST_SESSION",
            createdAt: { gte: monthStart },
          },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.teacherRating.findFirst({
          where: {
            teacherId: tid,
            raterId: session.user.id,
            kind: "PARENT_MONTHLY",
            year,
            month,
          },
          select: { id: true, comment: true },
        }),
        prisma.lessonSummary.findMany({
          where: {
            session: {
              class: { teacherId: tid, id: en.classId },
            },
            generatedAt: { gte: monthStart },
          },
          orderBy: { generatedAt: "desc" },
          take: 4,
          select: { generatedAt: true, teacherActions: true, teacherActionsAr: true },
        }),
      ]);

      teachers.push({
        teacherId: tid,
        teacherName: en.class.teacher.user.nameAr || en.class.teacher.user.name,
        avgRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
        ratingsCount: agg._count._all,
        teacherNotes: summaries.map((s) => ({
          when: s.generatedAt,
          noteAr: s.teacherActionsAr,
          noteEn: s.teacherActions,
        })),
        alreadyRated: !!rated && rated.comment !== "[skipped]",
      });
    }

    return NextResponse.json({
      ok: true,
      child: {
        id: student.id,
        name: student.user.nameAr || student.user.name,
      },
      teachers,
    });
  } catch (e) {
    console.error("[parent/monthly-summary]", e);
    return NextResponse.json({ ok: true, teachers: [] });
  }
}
