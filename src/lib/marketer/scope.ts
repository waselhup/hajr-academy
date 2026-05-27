import { prisma } from "@/lib/prisma";

export async function getMarketerScope(userId: string) {
  const profile = await prisma.marketerProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true, nameAr: true, email: true, avatar: true } } },
  });
  if (!profile) return null;
  return { marketerId: profile.id, ...profile };
}

export async function getMarketerStats(marketerId: string) {
  const [referralsTotal, converted, pendingAgg, paidAgg, lifetimeAgg] = await Promise.all([
    prisma.marketerReferral.count({ where: { marketerId } }),
    prisma.marketerReferral.count({ where: { marketerId, converted: true } }),
    prisma.commission.aggregate({
      where: { marketerId, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { marketerId, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { marketerId, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amount: true },
    }),
  ]);
  return {
    referralsTotal,
    converted,
    conversionRate: referralsTotal > 0 ? (converted / referralsTotal) * 100 : 0,
    pendingAmount: Number(pendingAgg._sum.amount ?? 0),
    paidAmount: Number(paidAgg._sum.amount ?? 0),
    lifetimeEarned: Number(lifetimeAgg._sum.amount ?? 0),
  };
}
