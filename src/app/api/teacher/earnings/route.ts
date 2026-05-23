import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/earnings
 * Returns the calling teacher's earnings + summary totals. Optional query:
 *   - status: PENDING | APPROVED | PAID
 *   - month:  YYYY-MM
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Teachers only" }, { status: 403 });
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "No teacher profile" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const month = sp.get("month"); // YYYY-MM

  const where: any = { teacherId: profile.id };
  if (status && ["PENDING", "APPROVED", "PAID"].includes(status)) {
    where.status = status;
  }
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map((n) => parseInt(n, 10));
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    where.createdAt = { gte: start, lt: end };
  }

  const [earnings, allByStatus, paidThisMonth, totalEarned] = await Promise.all([
    prisma.teacherEarning.findMany({
      where,
      include: {
        classSession: {
          include: { class: { select: { name: true, nameAr: true, cohortCode: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.teacherEarning.groupBy({
      by: ["status"],
      where: { teacherId: profile.id },
      _sum: { amount: true },
    }),
    prisma.teacherEarning.aggregate({
      where: {
        teacherId: profile.id,
        status: "PAID",
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    }),
    prisma.teacherEarning.aggregate({
      where: { teacherId: profile.id, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amount: true },
    }),
  ]);

  const totals = {
    pending: Number(allByStatus.find((r) => r.status === "PENDING")?._sum.amount ?? 0),
    approved: Number(allByStatus.find((r) => r.status === "APPROVED")?._sum.amount ?? 0),
    paid: Number(allByStatus.find((r) => r.status === "PAID")?._sum.amount ?? 0),
    paidThisMonth: Number(paidThisMonth._sum.amount ?? 0),
    totalEarned: Number(totalEarned._sum.amount ?? 0),
  };

  return NextResponse.json({
    hourlyRate: Number(profile.hourlyRate),
    earnings: earnings.map((e) => ({
      id: e.id,
      date: (e.classSession?.scheduledDate ?? e.createdAt).toISOString(),
      className: e.classSession?.class
        ? e.classSession.class.nameAr ?? e.classSession.class.name
        : "—",
      cohortCode: e.classSession?.class?.cohortCode ?? null,
      hoursWorked: Number(e.hoursWorked),
      hourlyRate: Number(e.hourlyRate),
      amount: Number(e.amount),
      status: e.status,
      approvedAt: e.approvedAt?.toISOString() ?? null,
      paidAt: e.paidAt?.toISOString() ?? null,
    })),
    totals,
  });
}
