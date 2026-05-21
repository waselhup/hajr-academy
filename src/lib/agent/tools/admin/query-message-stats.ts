import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Admin agent tool: report message volume and delivery stats —
 * e.g. "How many messages did we send this week?"
 */
export const queryMessageStats: AgentTool = {
  name: "query_message_stats",
  description:
    "Report communication statistics — message volume today/this week/this month, delivery rates by channel, and the SMS cost this month.",
  input_schema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["today", "week", "month"],
        description: "Time period (default: week)",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const period =
        typeof input.period === "string" ? input.period : "week";
      const now = new Date();
      let since: Date;
      if (period === "today") {
        since = new Date(now);
        since.setHours(0, 0, 0, 0);
      } else if (period === "month") {
        since = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        since = new Date(now.getTime() - 7 * 86400_000);
      }

      const messages = await context.prisma.message.findMany({
        where: { createdAt: { gte: since } },
        select: { channel: true, status: true },
      });

      const byChannel: Record<
        string,
        { total: number; sent: number; failed: number }
      > = {};
      for (const m of messages) {
        byChannel[m.channel] ??= { total: 0, sent: 0, failed: 0 };
        byChannel[m.channel].total++;
        if (["SENT", "DELIVERED", "READ"].includes(m.status)) {
          byChannel[m.channel].sent++;
        }
        if (m.status === "FAILED") byChannel[m.channel].failed++;
      }

      const smsCount = byChannel.SMS?.sent ?? 0;

      return {
        period,
        totalMessages: messages.length,
        byChannel: Object.entries(byChannel).map(([channel, c]) => ({
          channel,
          total: c.total,
          sent: c.sent,
          failed: c.failed,
          deliveryRate:
            c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0,
        })),
        smsCostSar: Math.round(smsCount * 0.05 * 100) / 100,
      };
    } catch {
      return { error: "Failed to query message stats" };
    }
  },
};
