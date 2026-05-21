import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Public assistant tool: a logged-in user asks whether they have new
 * messages or notifications — e.g. "Do I have any new messages?"
 */
export const checkMyMessages: AgentTool = {
  name: "check_my_messages",
  description:
    "Check the logged-in user's unread messages and notifications. Requires authentication.",
  input_schema: {
    type: "object",
    properties: {},
  },

  handler: async (
    _input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (!context.userId) {
        return {
          error:
            "You must be logged in to check messages. / يجب تسجيل الدخول لمراجعة رسائلك.",
        };
      }

      const [unreadMessages, unreadNotifications, recent] = await Promise.all([
        context.prisma.message.count({
          where: {
            toUserId: context.userId,
            channel: "IN_APP",
            triggerType: "MANUAL",
            readAt: null,
          },
        }),
        context.prisma.notification.count({
          where: { userId: context.userId, isRead: false },
        }),
        context.prisma.message.findMany({
          where: {
            toUserId: context.userId,
            channel: "IN_APP",
            triggerType: "MANUAL",
            readAt: null,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { fromUser: { select: { name: true } } },
        }),
      ]);

      return {
        unreadMessages,
        unreadNotifications,
        recentMessages: recent.map((m) => ({
          from: m.fromUser.name,
          preview: m.body.slice(0, 100),
          at: m.createdAt,
        })),
        summary:
          unreadMessages + unreadNotifications === 0
            ? "You're all caught up — no unread messages or notifications."
            : `You have ${unreadMessages} unread message(s) and ${unreadNotifications} unread notification(s).`,
      };
    } catch {
      return { error: "Failed to check messages" };
    }
  },
};
