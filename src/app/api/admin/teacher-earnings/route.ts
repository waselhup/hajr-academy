import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/teacher-earnings
 * List teacher earnings for admin review. Query: status, teacherId, from, to.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const where: Prisma.TeacherEarningWhereInput = {};
  const status = sp.get("status");
  if (status && ["PENDING", "APPROVED", "PAID"].includes(status)) {
    where.status = status as any;
  }
  const teacherId = sp.get("teacherId");
  if (teacherId) where.teacherId = teacherId;

  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as any).gte = new Date(from);
    if (to) (where.createdAt as any).lte = new Date(to);
  }

  const earnings = await prisma.teacherEarning.findMany({
    where,
    include: {
      teacher: {
        include: { user: { select: { name: true, nameAr: true, email: true } } },
      },
      classSession: {
        include: { class: { select: { name: true, nameAr: true, cohortCode: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    earnings: earnings.map((e) => ({
      id: e.id,
      teacherId: e.teacherId,
      teacherName: e.teacher.user.nameAr ?? e.teacher.user.name,
      teacherEmail: e.teacher.user.email,
      className: e.classSession?.class
        ? e.classSession.class.nameAr ?? e.classSession.class.name
        : "—",
      cohortCode: e.classSession?.class?.cohortCode ?? null,
      date: (e.classSession?.scheduledDate ?? e.createdAt).toISOString(),
      hoursWorked: Number(e.hoursWorked),
      hourlyRate: Number(e.hourlyRate),
      amount: Number(e.amount),
      status: e.status,
      approvedAt: e.approvedAt?.toISOString() ?? null,
      paidAt: e.paidAt?.toISOString() ?? null,
    })),
  });
}
