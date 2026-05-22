import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { getFinanceStats, getRevenueCharts } from "@/lib/finance/stats";
import { AdminFinanceClient } from "./finance-client";

export const dynamic = "force-dynamic";

/**
 * /admin/finance — finance KPI dashboard with revenue + subscription charts.
 */
export default async function AdminFinancePage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Finance");

  let stats = null;
  let charts = null;
  try {
    [stats, charts] = await Promise.all([
      getFinanceStats(),
      getRevenueCharts(),
    ]);
  } catch (e) {
    console.error("[admin-finance] failed to load:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      <AdminFinanceClient stats={stats} charts={charts} />
    </div>
  );
}
