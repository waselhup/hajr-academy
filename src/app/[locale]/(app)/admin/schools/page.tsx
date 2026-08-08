import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { SchoolsClient } from "./_components/schools-client";

export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  let rows: any[] = [];

  try {
    const schools = await prisma.partnerSchool.findMany({
      include: {
        _count: { select: { students: true } },
        // The partner's referral code. Oldest first — the one handed out.
        promoCodes: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { code: true, value: true, isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Commission earned per partner, straight from the frozen snapshots on
    // paid orders — never recomputed from the current rate.
    const earned = await prisma.purchaseOrder.groupBy({
      by: ["partnerSchoolId"],
      where: { paymentStatus: "PAID", partnerSchoolId: { not: null } },
      _sum: { partnerCommissionSar: true, amountSar: true },
      _count: { _all: true },
    });
    const byPartner = new Map(
      earned.map((e) => [
        e.partnerSchoolId as string,
        {
          commission: Number(e._sum.partnerCommissionSar ?? 0),
          revenue: Number(e._sum.amountSar ?? 0),
          orders: e._count._all,
        },
      ])
    );

    rows = schools.map((s) => {
      const agg = byPartner.get(s.id);
      const promo = s.promoCodes[0] ?? null;
      return {
        id: s.id,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        contactName: s.contactName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        city: s.city,
        partnerType: s.partnerType ?? "SCHOOL",
        contractStart: s.contractStart.toISOString().slice(0, 10),
        contractEnd: s.contractEnd.toISOString().slice(0, 10),
        commissionPercent: Number(s.commissionPercent),
        promoCode: promo?.code ?? null,
        discountPercent: promo ? Number(promo.value) : 0,
        promoActive: promo?.isActive ?? false,
        studentCap: s.studentCap,
        active: s.active,
        students: s._count.students,
        orders: agg?.orders ?? 0,
        revenueSar: agg?.revenue ?? 0,
        commissionSar: agg?.commission ?? 0,
      };
    });
  } catch (e) {
    console.error("[admin-schools] DB query failed:", e);
  }

  return <SchoolsClient rows={rows} />;
}
