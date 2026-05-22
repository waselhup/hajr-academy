import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { getFinanceStats } from "@/lib/finance/stats";

/**
 * Admin tool — "كم دخلنا هذا الشهر؟" / "How much revenue this month?"
 * Returns MRR, revenue figures, outstanding/overdue balances and churn.
 */
export const queryRevenue: AgentTool = {
  name: "query_revenue",
  description:
    "Get current finance KPIs: MRR (monthly recurring revenue), revenue this month/quarter/year, outstanding and overdue invoice totals, active subscription count, and churn rate. Use for questions about how much money the academy is making.",
  input_schema: {
    type: "object",
    properties: {},
  },

  handler: async (
    _input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (context.userRole !== "ADMIN" && context.userRole !== "SUPER_ADMIN") {
        return { error: "Admins only." };
      }
      const stats = await getFinanceStats();
      return {
        currency: "SAR",
        mrr: stats.mrr,
        revenueThisMonth: stats.revenueThisMonth,
        revenueThisQuarter: stats.revenueThisQuarter,
        revenueThisYear: stats.revenueThisYear,
        outstanding: stats.outstanding,
        overdue: stats.overdue,
        activeSubscriptions: stats.activeSubscriptions,
        churnRatePercent: stats.churnRate,
      };
    } catch (error) {
      return {
        error: `Failed to get revenue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
