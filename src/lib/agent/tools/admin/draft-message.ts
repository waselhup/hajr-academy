import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const draftMessage: AgentTool = {
  name: "draft_message",
  description: "Draft a message for admin review (does NOT send)",
  input_schema: {
    type: "object",
    properties: {
      recipientType: {
        type: "string",
        enum: ["student", "parent", "teacher", "class"],
        description: "Type of recipient",
      },
      recipientId: {
        type: "string",
        description: "ID of the recipient (student/parent/teacher profile ID or class ID)",
      },
      subject: {
        type: "string",
        description: "Message subject",
      },
      content: {
        type: "string",
        description: "Message body content",
      },
      channel: {
        type: "string",
        enum: ["email", "sms", "in_app"],
        description: "Delivery channel",
      },
    },
    required: ["recipientType", "recipientId", "subject", "content", "channel"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const recipientType = typeof input.recipientType === "string" ? input.recipientType.trim() : "";
      const recipientId = typeof input.recipientId === "string" ? input.recipientId.trim() : "";
      const subject = typeof input.subject === "string" ? input.subject.trim() : "";
      const content = typeof input.content === "string" ? input.content.trim() : "";
      const channel = typeof input.channel === "string" ? input.channel.trim() : "in_app";

      if (!recipientType || !recipientId || !subject || !content) {
        return { error: "recipientType, recipientId, subject, and content are all required" };
      }

      let recipientName = "";
      let recipientEmail = "";
      let recipientPhone = "";
      let recipientCount = 1;

      if (recipientType === "student") {
        const student = await context.prisma.studentProfile.findUnique({
          where: { id: recipientId },
          include: { user: { select: { name: true, email: true, phone: true } } },
        });
        if (!student) return { error: "Student not found" };
        recipientName = student.user.name;
        recipientEmail = student.user.email;
        recipientPhone = student.user.phone ?? "";
      } else if (recipientType === "parent") {
        const parent = await context.prisma.parentProfile.findUnique({
          where: { id: recipientId },
          include: { user: { select: { name: true, email: true, phone: true } } },
        });
        if (!parent) return { error: "Parent not found" };
        recipientName = parent.user.name;
        recipientEmail = parent.user.email;
        recipientPhone = parent.user.phone ?? "";
      } else if (recipientType === "teacher") {
        const teacher = await context.prisma.teacherProfile.findUnique({
          where: { id: recipientId },
          include: { user: { select: { name: true, email: true, phone: true } } },
        });
        if (!teacher) return { error: "Teacher not found" };
        recipientName = teacher.user.name;
        recipientEmail = teacher.user.email;
        recipientPhone = teacher.user.phone ?? "";
      } else if (recipientType === "class") {
        const classData = await context.prisma.class.findUnique({
          where: { id: recipientId },
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
              include: {
                student: {
                  include: {
                    user: { select: { name: true, email: true } },
                  },
                },
              },
            },
          },
        });
        if (!classData) return { error: "Class not found" };
        recipientName = `All students in ${classData.name} (${classData.cohortCode})`;
        recipientCount = classData.enrollments.length;
        recipientEmail = classData.enrollments
          .map((e) => e.student.user.email)
          .join(", ");
      }

      const contactInfo =
        channel === "email"
          ? recipientEmail
          : channel === "sms"
            ? recipientPhone
            : recipientName;

      return {
        preview: {
          to: recipientName,
          contactInfo,
          subject,
          body: content,
          channel,
        },
        recipientCount,
        note: "This is a DRAFT preview only. The message has NOT been sent. Confirm with the admin before sending.",
      };
    } catch (error) {
      return {
        error: `Failed to draft message: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
