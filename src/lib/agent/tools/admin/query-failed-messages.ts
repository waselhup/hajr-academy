import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Admin agent tool: list messages that failed to send —
 * e.g. "Did any messages fail today?"
 */
export const queryFailedMessages: AgentTool = {
  name: "query_failed_messages",
  description:
    "List communication messages that failed to send, with the channel, recipient, and error reason. Useful for spotting delivery problems.",
  input_schema: {
    type: "object",
    properties: {
      sinceHours: {
        type: "number",
        description: "Look back this many hours (default 24)",
      },
      limit: { type: "number", description: "Maximum results (default 20)" },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const sinceHours =
        typeof input.sinceHours === "number" ? input.sinceHours : 24;
      const limit =
        typeof input.limit === "number" ? Math.min(input.limit, 50) : 20;
      const since = new Date(Date.now() - sinceHours * 3600_000);

      const failed = await context.prisma.message.findMany({
        where: { status: "FAILED", createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { toUser: { select: { name: true } } },
      });

      return {
        count: failed.length,
        sinceHours,
        failures: failed.map((m) => ({
          id: m.id,
          channel: m.channel,
          recipient: m.toUser?.name ?? "—",
          subject: m.subject,
          error: m.errorMessage ?? "Unknown error",
          triggerType: m.triggerType,
          createdAt: m.createdAt,
        })),
        note:
          failed.length === 0
            ? `No failed messages in the last ${sinceHours} hours.`
            : undefined,
      };
    } catch {
      return { error: "Failed to query failed messages" };
    }
  },
};
