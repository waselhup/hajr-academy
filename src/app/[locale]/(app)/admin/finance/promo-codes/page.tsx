import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminPromoCodesClient } from "./promo-codes-client";

export const dynamic = "force-dynamic";

/** /admin/finance/promo-codes — promo-code management. */
export default async function AdminPromoCodesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Finance");

  let codes: Awaited<ReturnType<typeof loadCodes>> = [];
  let partners: { id: string; nameEn: string; nameAr: string; partnerType: "CHARITY" | "SCHOOL" | "INDIVIDUAL" }[] = [];
  try {
    [codes, partners] = await Promise.all([loadCodes(), loadPartners()]);
  } catch (e) {
    console.error("[admin-promo-codes] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("promoCodes")}</h1>
      <AdminPromoCodesClient codes={codes} partners={partners} />
    </div>
  );
}

async function loadCodes() {
  const rows = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscriptions: true } },
      partnerSchool: { select: { nameEn: true, nameAr: true, partnerType: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: Number(c.value),
    maxUses: c.maxUses,
    currentUses: c.currentUses,
    isActive: c.isActive,
    startsAt: c.startsAt.toISOString(),
    expiresAt: c.expiresAt?.toISOString() ?? null,
    timesUsed: c._count.subscriptions,
    partnerSchoolId: c.partnerSchoolId,
    partnerNameEn: c.partnerSchool?.nameEn ?? null,
    partnerNameAr: c.partnerSchool?.nameAr ?? null,
  }));
}

/** Success Partners selectable as the "organization" a promo belongs to. */
async function loadPartners() {
  const rows = await prisma.partnerSchool.findMany({
    where: { active: true },
    select: { id: true, nameEn: true, nameAr: true, partnerType: true },
    orderBy: { nameEn: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    partnerType: (p.partnerType ?? "SCHOOL") as "CHARITY" | "SCHOOL" | "INDIVIDUAL",
  }));
}
