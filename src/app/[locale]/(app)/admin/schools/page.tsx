import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { partnerLedgers, emptyLedger } from "@/lib/finance/partner-referrals";
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

    // Earned (frozen on paid orders) and paid (entered by an admin) are
    // summed separately — see partnerLedgers().
    const ledgers = await partnerLedgers();

    rows = schools.map((s) => {
      const led = ledgers.get(s.id) ?? emptyLedger();
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
        discountRecurs: s.discountRecurs,
        promoCode: promo?.code ?? null,
        discountPercent: promo ? Number(promo.value) : 0,
        promoActive: promo?.isActive ?? false,
        studentCap: s.studentCap,
        active: s.active,
        students: s._count.students,
        orders: led.referredOrders,
        revenueSar: led.referredSalesSar,
        commissionSar: led.owedSar,
        paidSar: led.paidSar,
        remainingSar: led.remainingSar,
      };
    });
  } catch (e) {
    console.error("[admin-schools] DB query failed:", e);
  }

  return <SchoolsClient rows={rows} />;
}
