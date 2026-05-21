import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { dispatch } from "@/lib/comms/dispatcher";

/**
 * Admin agent tool: actually SEND a message to a recipient (unlike
 * `draft_message`, which only previews). Routes through the dispatcher
 * so preferences, channels, and tracking all apply.
 */
export const sendMessage: AgentTool = {
  name: "send_message",
  description:
    "Send a message to a user, a whole role, or a class — over the chosen channels. Unlike draft_message, this actually delivers. Confirm with the admin before calling.",
  input_schema: {
    type: "object",
    properties: {
      recipientType: {
        type: "string",
        enum: ["user", "role", "class"],
        description: "Who to send to",
      },
      recipientId: {
        type: "string",
        description:
          "User ID (for user), role name STUDENT/TEACHER/PARENT (for role), or class ID (for class)",
      },
      subject: { type: "string", description: "Message subject" },
      body: { type: "string", description: "Message body" },
      channels: {
        type: "array",
        items: { type: "string", enum: ["EMAIL", "SMS", "WHATSAPP", "IN_APP"] },
        description: "Delivery channels (default: IN_APP + EMAIL)",
      },
    },
    required: ["recipientType", "recipientId", "body"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (context.userRole !== "ADMIN" && context.userRole !== "SUPER_ADMIN") {
        return { error: "Only admins can send messages." };
      }
      const recipientType =
        typeof input.recipientType === "string" ? input.recipientType : "";
      const recipientId =
        typeof input.recipientId === "string" ? input.recipientId : "";
      const subject = typeof input.subject === "string" ? input.subject : "";
      const body = typeof input.body === "string" ? input.body.trim() : "";
      const channels = Array.isArray(input.channels)
        ? (input.channels as string[]).filter((c) =>
            ["EMAIL", "SMS", "WHATSAPP", "IN_APP"].includes(c)
          )
        : ["IN_APP", "EMAIL"];

      if (!recipientId || !body) {
        return { error: "recipientId and body are required" };
      }

      const dispatchParams = {
        trigger: "MANUAL" as const,
        subject,
        bodyEn: body,
        bodyAr: body,
        channels: channels as ("EMAIL" | "SMS" | "WHATSAPP" | "IN_APP")[],
        notificationType: "SYSTEM_ANNOUNCEMENT" as const,
      };

      let result;
      if (recipientType === "user") {
        result = await dispatch({ ...dispatchParams, toUserId: recipientId });
      } else if (recipientType === "role") {
        if (!["STUDENT", "TEACHER", "PARENT"].includes(recipientId)) {
          return { error: "Invalid role" };
        }
        result = await dispatch({
          ...dispatchParams,
          toRole: recipientId as "STUDENT" | "TEACHER" | "PARENT",
        });
      } else if (recipientType === "class") {
        result = await dispatch({ ...dispatchParams, toClassId: recipientId });
      } else {
        return { error: "Invalid recipientType" };
      }

      return {
        success: true,
        sent: result.sent,
        failed: result.failed,
        message: `Message dispatched: ${result.sent} sent, ${result.failed} failed.`,
      };
    } catch (error) {
      return {
        error: `Failed to send message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
