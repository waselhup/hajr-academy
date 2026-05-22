import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Admin tool — "ايش وضع عقود المدارس؟"
 * / "What's the status of school contracts?"
 */
export const querySchoolContracts: AgentTool = {
  name: "query_school_contracts",
  description:
    "Get an overview of B2B partner-school contracts: counts by status (draft/active/completed/cancelled), total active contract value in SAR, and contracts expiring within 60 days.",
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

      const contracts = await context.prisma.schoolContract.findMany({
        include: {
          school: { select: { nameEn: true, nameAr: true } },
        },
      });

      const byStatus: Record<string, number> = {
        DRAFT: 0,
        ACTIVE: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      };
      let activeValue = 0;
      for (const c of contracts) {
        byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
        if (c.status === "ACTIVE") {
          activeValue += Number(c.totalAmount) + Number(c.vatAmount);
        }
      }

      // Contracts expiring within 60 days.
      const soon = new Date(Date.now() + 60 * 86400_000);
      const expiringSoon = contracts
        .filter(
          (c) =>
            c.status === "ACTIVE" &&
            c.endDate <= soon &&
            c.endDate >= new Date()
        )
        .map((c) => ({
          school: c.school.nameEn,
          endDate: c.endDate.toISOString().slice(0, 10),
          value: Number(c.totalAmount) + Number(c.vatAmount),
        }));

      return {
        totalContracts: contracts.length,
        byStatus,
        activeContractValueSar: Math.round(activeValue * 100) / 100,
        expiringSoon,
      };
    } catch (error) {
      return {
        error: `Failed to get school contracts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
