import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminSubscriptionsClient } from "./subscriptions-client";

export const dynamic = "force-dynamic";

/** /admin/finance/subscriptions — subscription management table. */
export default async function AdminSubscriptionsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Finance");

  let subscriptions: Awaited<ReturnType<typeof loadSubs>> = [];
  try {
    subscriptions = await loadSubs();
  } catch (e) {
    console.error("[admin-subscriptions] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("subscriptions")}</h1>
      <AdminSubscriptionsClient subscriptions={subscriptions} />
    </div>
  );
}

async function loadSubs() {
  const rows = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      student: { include: { user: { select: { name: true } } } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    studentName: s.student.user.name,
    packageType: s.packageType,
    status: s.status,
    totalWithVat: Number(s.totalWithVat),
    currentPeriodStart: s.currentPeriodStart.toISOString(),
    nextBillingDate: s.nextBillingDate?.toISOString() ?? null,
    autoRenew: s.autoRenew,
  }));
}
