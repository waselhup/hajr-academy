import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Admin tool — "كم ولي أمر فعّال هذا الشهر؟"
 * / "How many active parents this month?"
 */
export const queryParentEngagement: AgentTool = {
  name: "query_parent_engagement",
  description:
    "Get parent-engagement metrics: total parent accounts, how many are linked to a student, parent invites issued/accepted/pending, and the invite acceptance rate.",
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

      const now = new Date();

      const [
        totalParents,
        linkedParents,
        totalInvites,
        acceptedInvites,
        pendingInvites,
        invitesThisMonth,
      ] = await Promise.all([
        context.prisma.parentProfile.count(),
        context.prisma.parentProfile.count({
          where: { childLinks: { some: {} } },
        }),
        context.prisma.parentInvite.count(),
        context.prisma.parentInvite.count({ where: { status: "ACCEPTED" } }),
        context.prisma.parentInvite.count({
          where: { status: "PENDING", expiresAt: { gte: now } },
        }),
        context.prisma.parentInvite.count({
          where: {
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          },
        }),
      ]);

      const acceptanceRate =
        totalInvites > 0
          ? Math.round((acceptedInvites / totalInvites) * 1000) / 10
          : 0;

      return {
        totalParents,
        linkedParents,
        unlinkedParents: totalParents - linkedParents,
        invites: {
          total: totalInvites,
          accepted: acceptedInvites,
          pending: pendingInvites,
          issuedThisMonth: invitesThisMonth,
          acceptanceRatePercent: acceptanceRate,
        },
      };
    } catch (error) {
      return {
        error: `Failed to get parent engagement: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
