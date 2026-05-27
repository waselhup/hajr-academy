/**
 * Payment Request service — used by teacher + marketer creation flows
 * and admin approval. Encapsulates the integration with TeacherEarning /
 * Commission so marking a request PAID also marks the underlying rows.
 */
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export interface PendingEarnings {
  pendingAmount: number;
  approvedAmount: number;
  totalAvailable: number;
}

/**
 * For TEACHER: sum APPROVED+unpaid TeacherEarning rows.
 * For MARKETER: sum APPROVED+unpaid Commission rows.
 */
export async function getAvailableEarnings(
  userId: string,
  role: Role
): Promise<PendingEarnings> {
  if (role === "TEACHER") {
    const tp = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tp) return { pendingAmount: 0, approvedAmount: 0, totalAvailable: 0 };
    const [pendingAgg, approvedAgg] = await Promise.all([
      prisma.teacherEarning.aggregate({
        where: { teacherId: tp.id, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.teacherEarning.aggregate({
        where: { teacherId: tp.id, status: "APPROVED" },
        _sum: { amount: true },
      }),
    ]);
    return {
      pendingAmount: Number(pendingAgg._sum.amount ?? 0),
      approvedAmount: Number(approvedAgg._sum.amount ?? 0),
      totalAvailable: Number(approvedAgg._sum.amount ?? 0),
    };
  }
  if (role === "MARKETER") {
    const mp = await prisma.marketerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!mp) return { pendingAmount: 0, approvedAmount: 0, totalAvailable: 0 };
    const [pendingAgg, approvedAgg] = await Promise.all([
      prisma.commission.aggregate({
        where: { marketerId: mp.id, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { marketerId: mp.id, status: "APPROVED" },
        _sum: { amount: true },
      }),
    ]);
    return {
      pendingAmount: Number(pendingAgg._sum.amount ?? 0),
      approvedAmount: Number(approvedAgg._sum.amount ?? 0),
      totalAvailable: Number(approvedAgg._sum.amount ?? 0),
    };
  }
  return { pendingAmount: 0, approvedAmount: 0, totalAvailable: 0 };
}

/**
 * On marking a payment request PAID, also mark the underlying
 * TeacherEarning / Commission rows in [periodStart, periodEnd] as PAID.
 */
export async function markUnderlyingPaid(params: {
  requesterId: string;
  requesterRole: Role;
  periodStart: Date;
  periodEnd: Date;
  paidById: string;
}): Promise<{ teacherEarningsUpdated: number; commissionsUpdated: number }> {
  const { requesterId, requesterRole, periodStart, periodEnd, paidById } = params;
  if (requesterRole === "TEACHER") {
    const tp = await prisma.teacherProfile.findUnique({
      where: { userId: requesterId },
      select: { id: true },
    });
    if (!tp) return { teacherEarningsUpdated: 0, commissionsUpdated: 0 };
    const upd = await prisma.teacherEarning.updateMany({
      where: {
        teacherId: tp.id,
        status: "APPROVED",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      data: { status: "PAID", paidAt: new Date() },
    });
    return { teacherEarningsUpdated: upd.count, commissionsUpdated: 0 };
  }
  if (requesterRole === "MARKETER") {
    const mp = await prisma.marketerProfile.findUnique({
      where: { userId: requesterId },
      select: { id: true },
    });
    if (!mp) return { teacherEarningsUpdated: 0, commissionsUpdated: 0 };
    const upd = await prisma.commission.updateMany({
      where: {
        marketerId: mp.id,
        status: "APPROVED",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      data: { status: "PAID", paidBy: paidById, paidAt: new Date() },
    });
    return { teacherEarningsUpdated: 0, commissionsUpdated: upd.count };
  }
  return { teacherEarningsUpdated: 0, commissionsUpdated: 0 };
}
