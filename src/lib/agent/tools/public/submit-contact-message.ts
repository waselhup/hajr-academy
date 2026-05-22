import type { AgentTool, AgentContext } from "@/lib/agent/types";

const SUBJECTS = [
  "GENERAL",
  "PROGRAMS",
  "PRICING",
  "SUPPORT",
  "COMPLAINT",
  "PARTNERSHIP",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * submit_contact_message — lets the public assistant capture a contact
 * request from a visitor when it can't fully answer their question.
 * Persists a ContactSubmission and notifies the academy team, exactly
 * like the /contact form.
 */
export const submitContactMessage: AgentTool = {
  name: "submit_contact_message",
  description:
    "Send a message to the Hajr Academy team on behalf of a visitor. " +
    "Use this when the visitor has a question you cannot answer and " +
    "wants the team to follow up. Collect their name, email, and the " +
    "message first, then call this tool.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Visitor full name (required)" },
      email: { type: "string", description: "Visitor email address (required)" },
      phone: { type: "string", description: "Phone number (optional)" },
      subject: {
        type: "string",
        description:
          "One of: GENERAL, PROGRAMS, PRICING, SUPPORT, COMPLAINT, PARTNERSHIP",
      },
      message: {
        type: "string",
        description: "The visitor's question or message for the team (required)",
      },
    },
    required: ["name", "email", "message"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const email = typeof input.email === "string" ? input.email.trim() : "";
      const phone =
        typeof input.phone === "string" ? input.phone.trim() : undefined;
      const message =
        typeof input.message === "string" ? input.message.trim() : "";
      const rawSubject =
        typeof input.subject === "string"
          ? input.subject.trim().toUpperCase()
          : "GENERAL";
      const subject = SUBJECTS.includes(rawSubject) ? rawSubject : "GENERAL";

      if (!name) {
        return { error: "Name is required. / الاسم مطلوب." };
      }
      if (!email || !EMAIL_RE.test(email)) {
        return {
          error:
            "A valid email is required. / البريد الإلكتروني الصحيح مطلوب.",
        };
      }
      if (!message) {
        return { error: "A message is required. / الرسالة مطلوبة." };
      }

      const submission = await context.prisma.contactSubmission.create({
        data: {
          name,
          email,
          phone: phone || null,
          subject,
          message,
          source: "public_assistant",
          status: "NEW",
        },
      });

      // Notify all admins in-app.
      const admins = await context.prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await context.prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "SYSTEM_ANNOUNCEMENT" as const,
            title: "New contact request",
            titleAr: "طلب تواصل جديد",
            body: `${name}: ${message.slice(0, 120)}`,
            bodyAr: `${name}: ${message.slice(0, 120)}`,
            actionUrl: "/admin/communications/contacts",
            actionLabel: "View request",
            actionLabelAr: "عرض الطلب",
            priority: "HIGH" as const,
            refType: "ContactSubmission",
            refId: submission.id,
            isRead: false,
          })),
        });
      }

      return {
        success: true,
        contactId: submission.id,
        message:
          "Your message has been sent to our team. We'll reply within 24 hours.",
        messageAr:
          "تم إرسال رسالتك لفريقنا. سنرد عليك خلال ٢٤ ساعة.",
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
