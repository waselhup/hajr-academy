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
  try {
    codes = await loadCodes();
  } catch (e) {
    console.error("[admin-promo-codes] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("promoCodes")}</h1>
      <AdminPromoCodesClient codes={codes} />
    </div>
  );
}

async function loadCodes() {
  const rows = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscriptions: true } } },
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
  }));
}
