import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { dispatch } from "@/lib/comms/dispatcher";

/**
 * Admin agent tool: broadcast an announcement to a class or a role —
 * e.g. "Send a message to all parents of class B that tomorrow's class
 * is cancelled."
 */
export const broadcastAnnouncement: AgentTool = {
  name: "broadcast_announcement",
  description:
    "Broadcast an announcement to all students in a class, or to all users of a role. Confirm the message with the admin before calling — this delivers immediately.",
  input_schema: {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: ["class", "role"],
        description: "Broadcast to a class roster or to a whole role",
      },
      classId: {
        type: "string",
        description: "Class ID (required when target is 'class')",
      },
      role: {
        type: "string",
        enum: ["STUDENT", "TEACHER", "PARENT"],
        description: "Role (required when target is 'role')",
      },
      subject: { type: "string", description: "Announcement subject" },
      body: { type: "string", description: "Announcement body" },
      channels: {
        type: "array",
        items: { type: "string", enum: ["EMAIL", "SMS", "WHATSAPP", "IN_APP"] },
        description: "Delivery channels (default: IN_APP + EMAIL)",
      },
    },
    required: ["target", "body"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (context.userRole !== "ADMIN" && context.userRole !== "SUPER_ADMIN") {
        return { error: "Only admins can broadcast announcements." };
      }
      const target = typeof input.target === "string" ? input.target : "";
      const subject = typeof input.subject === "string" ? input.subject : "";
      const body = typeof input.body === "string" ? input.body.trim() : "";
      const channels = Array.isArray(input.channels)
        ? (input.channels as string[]).filter((c) =>
            ["EMAIL", "SMS", "WHATSAPP", "IN_APP"].includes(c)
          )
        : ["IN_APP", "EMAIL"];

      if (!body) return { error: "body is required" };

      const base = {
        trigger: "MANUAL" as const,
        subject,
        bodyEn: body,
        bodyAr: body,
        channels: channels as ("EMAIL" | "SMS" | "WHATSAPP" | "IN_APP")[],
        notificationType: "SYSTEM_ANNOUNCEMENT" as const,
        priority: "HIGH" as const,
      };

      let result;
      if (target === "class") {
        const classId =
          typeof input.classId === "string" ? input.classId : "";
        if (!classId) return { error: "classId is required for a class broadcast" };
        const cls = await context.prisma.class.findUnique({
          where: { id: classId },
          select: { name: true },
        });
        if (!cls) return { error: "Class not found" };
        result = await dispatch({ ...base, toClassId: classId });
        return {
          success: true,
          target: `class ${cls.name}`,
          sent: result.sent,
          failed: result.failed,
        };
      } else if (target === "role") {
        const role = typeof input.role === "string" ? input.role : "";
        if (!["STUDENT", "TEACHER", "PARENT"].includes(role)) {
          return { error: "Valid role is required for a role broadcast" };
        }
        result = await dispatch({
          ...base,
          toRole: role as "STUDENT" | "TEACHER" | "PARENT",
        });
        return {
          success: true,
          target: `all ${role.toLowerCase()}s`,
          sent: result.sent,
          failed: result.failed,
        };
      }
      return { error: "Invalid target" };
    } catch (error) {
      return {
        error: `Failed to broadcast: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
