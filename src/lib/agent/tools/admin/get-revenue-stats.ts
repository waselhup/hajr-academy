import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getRevenueStats: AgentTool = {
  name: "get_revenue_stats",
  description: "Get revenue statistics for a given period (month, quarter, year)",
  input_schema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["month", "quarter", "year"],
        description: "The time period to analyze",
      },
    },
    required: ["period"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const period = typeof input.period === "string" ? input.period.trim() : "month";
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      let startMonth: number;
      let startYear: number;
      let prevStartMonth: number;
      let prevStartYear: number;
      let endMonth: number;
      let endYear: number;

      if (period === "month") {
        startMonth = currentMonth;
        startYear = currentYear;
        endMonth = currentMonth;
        endYear = currentYear;
        prevStartMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        prevStartYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      } else if (period === "quarter") {
        const quarterStart = Math.floor((currentMonth - 1) / 3) * 3 + 1;
        startMonth = quarterStart;
        startYear = currentYear;
        endMonth = quarterStart + 2;
        endYear = currentYear;
        const prevQuarterStart = quarterStart - 3;
        prevStartMonth = prevQuarterStart > 0 ? prevQuarterStart : prevQuarterStart + 12;
        prevStartYear = prevQuarterStart > 0 ? currentYear : currentYear - 1;
      } else {
        startMonth = 1;
        startYear = currentYear;
        endMonth = 12;
        endYear = currentYear;
        prevStartMonth = 1;
        prevStartYear = currentYear - 1;
      }

      // Current period revenue
      const currentInvoices = await context.prisma.invoice.findMany({
        where: {
          status: "PAID",
          year: period === "year" ? currentYear : undefined,
          AND:
            period !== "year"
              ? [
                  {
                    OR: [
                      { year: startYear, month: { gte: startMonth } },
                      ...(endYear > startYear
                        ? [{ year: endYear, month: { lte: endMonth } }]
                        : []),
                    ],
                  },
                  { month: { lte: endMonth } },
                ]
              : undefined,
        },
        include: {
          student: {
            include: { user: { select: { name: true } } },
          },
        },
      });

      // Previous period revenue for comparison
      const prevEndMonth = period === "quarter" ? prevStartMonth + 2 : period === "month" ? prevStartMonth : 12;
      const previousInvoices = await context.prisma.invoice.findMany({
        where: {
          status: "PAID",
          year: prevStartYear,
          month:
            period === "year"
              ? undefined
              : period === "month"
                ? prevStartMonth
                : { gte: prevStartMonth, lte: prevEndMonth },
        },
      });

      const currentRevenue = currentInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalSar),
        0
      );
      const previousRevenue = previousInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalSar),
        0
      );
      const growthPercent =
        previousRevenue > 0
          ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 1000) / 10
          : null;

      // MRR: paid invoices this month
      const mrrInvoices = await context.prisma.invoice.findMany({
        where: {
          status: "PAID",
          month: currentMonth,
          year: currentYear,
        },
      });
      const mrr = mrrInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalSar),
        0
      );

      // Revenue by program (via packageType)
      const revenueByPackage: Record<string, number> = {};
      for (const inv of currentInvoices) {
        const pkg = inv.packageType ?? "OTHER";
        revenueByPackage[pkg] = (revenueByPackage[pkg] ?? 0) + Number(inv.totalSar);
      }

      return {
        period,
        currentPeriod: {
          startMonth,
          startYear,
          endMonth,
          endYear,
        },
        revenue: {
          current: Math.round(currentRevenue * 100) / 100,
          previous: Math.round(previousRevenue * 100) / 100,
          growthPercent,
          invoiceCount: currentInvoices.length,
        },
        mrr: Math.round(mrr * 100) / 100,
        revenueByPackage: Object.entries(revenueByPackage).map(
          ([packageType, amount]) => ({
            packageType,
            amount: Math.round(amount * 100) / 100,
          })
        ),
      };
    } catch (error) {
      return {
        error: `Failed to get revenue stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
