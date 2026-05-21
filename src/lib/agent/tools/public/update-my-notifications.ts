import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Public assistant tool: a user changes their own notification channel
 * preferences — e.g. "Turn off SMS, keep only email."
 */
export const updateMyNotifications: AgentTool = {
  name: "update_my_notifications",
  description:
    "Update the logged-in user's notification channel preferences (email, SMS, WhatsApp, in-app). Pass only the channels the user wants to change. Requires authentication.",
  input_schema: {
    type: "object",
    properties: {
      emailEnabled: { type: "boolean", description: "Enable/disable email" },
      smsEnabled: { type: "boolean", description: "Enable/disable SMS" },
      whatsappEnabled: {
        type: "boolean",
        description: "Enable/disable WhatsApp",
      },
      inAppEnabled: {
        type: "boolean",
        description: "Enable/disable in-app notifications",
      },
      marketingMessages: {
        type: "boolean",
        description: "Enable/disable marketing messages",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (!context.userId) {
        return {
          error:
            "You must be logged in to update preferences. / يجب تسجيل الدخول لتحديث تفضيلاتك.",
        };
      }

      const data: Record<string, boolean> = {};
      for (const key of [
        "emailEnabled",
        "smsEnabled",
        "whatsappEnabled",
        "inAppEnabled",
        "marketingMessages",
      ]) {
        if (typeof input[key] === "boolean") {
          data[key] = input[key] as boolean;
        }
      }

      if (Object.keys(data).length === 0) {
        return {
          error:
            "No preference change specified. Tell me which channels to enable or disable.",
        };
      }

      const pref = await context.prisma.notificationPreference.upsert({
        where: { userId: context.userId },
        create: { userId: context.userId, ...data },
        update: data,
      });

      return {
        success: true,
        updated: data,
        currentPreferences: {
          emailEnabled: pref.emailEnabled,
          smsEnabled: pref.smsEnabled,
          whatsappEnabled: pref.whatsappEnabled,
          inAppEnabled: pref.inAppEnabled,
          marketingMessages: pref.marketingMessages,
        },
        message: "Your notification preferences have been updated.",
      };
    } catch {
      return { error: "Failed to update notification preferences" };
    }
  },
};
