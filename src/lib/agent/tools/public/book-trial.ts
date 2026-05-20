import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const bookTrial: AgentTool = {
  name: "book_trial",
  description:
    "Submit a trial class request. Collects student/parent info and notifies the academy team.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Student or parent full name (required)",
      },
      phone: {
        type: "string",
        description:
          "Phone number starting with 05 or +966 (required)",
      },
      email: {
        type: "string",
        description: "Email address (optional)",
      },
      childGrade: {
        type: "string",
        description:
          "Child's school grade or education level, e.g. 'Grade 10' or 'University' (optional)",
      },
      preferredProgram: {
        type: "string",
        description:
          "Preferred program: STEP_PREP, PRIVATE, UNI_PREP, SCHOOL, or ENGLISH_LAB (optional)",
      },
      preferredTime: {
        type: "string",
        description:
          "Preferred class time or day, e.g. 'evenings', 'Sunday 6pm' (optional)",
      },
      notes: {
        type: "string",
        description: "Additional notes or questions (optional)",
      },
    },
    required: ["name", "phone"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      // --- Validation ---
      const name =
        typeof input.name === "string" ? input.name.trim() : "";
      const phone =
        typeof input.phone === "string" ? input.phone.trim() : "";
      const email =
        typeof input.email === "string" ? input.email.trim() : undefined;
      const childGrade =
        typeof input.childGrade === "string"
          ? input.childGrade.trim()
          : undefined;
      const preferredProgram =
        typeof input.preferredProgram === "string"
          ? input.preferredProgram.trim()
          : undefined;
      const preferredTime =
        typeof input.preferredTime === "string"
          ? input.preferredTime.trim()
          : undefined;
      const notes =
        typeof input.notes === "string" ? input.notes.trim() : undefined;

      if (!name) {
        return {
          error:
            "Name is required. / الاسم مطلوب.",
        };
      }

      if (!phone) {
        return {
          error:
            "Phone number is required. / رقم الجوال مطلوب.",
        };
      }

      // Basic Saudi phone validation
      const cleanPhone = phone.replace(/\s|-/g, "");
      if (
        !cleanPhone.startsWith("05") &&
        !cleanPhone.startsWith("+966") &&
        !cleanPhone.startsWith("966")
      ) {
        return {
          error:
            "Phone number must start with 05 or +966. / رقم الجوال يجب أن يبدأ بـ 05 أو 966+.",
        };
      }

      // --- Create trial request ---
      const trialRequest = await context.prisma.trialRequest.create({
        data: {
          name,
          phone: cleanPhone,
          email: email || null,
          childGrade: childGrade || null,
          preferredProgram: preferredProgram || null,
          preferredTime: preferredTime || null,
          notes: notes || null,
          source: "public_assistant",
          status: "NEW",
        },
      });

      // --- Notify all ADMIN users ---
      const admins = await context.prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "SUPER_ADMIN"] },
          isActive: true,
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        await context.prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "SYSTEM_ANNOUNCEMENT" as const,
            title: "New Trial Request",
            titleAr: "طلب حصة تجريبية جديد",
            message: `New trial request from ${name} (${cleanPhone})${
              preferredProgram ? ` — interested in ${preferredProgram}` : ""
            }`,
            messageAr: `طلب حصة تجريبية جديد من ${name} (${cleanPhone})${
              preferredProgram ? ` — مهتم بـ ${preferredProgram}` : ""
            }`,
            channels: ["IN_APP"],
            isRead: false,
          })),
        });
      }

      return {
        success: true,
        trialRequestId: trialRequest.id,
        message:
          "Trial class request submitted successfully! Our team will contact you within 24 hours to schedule your free trial class.",
        messageAr:
          "تم تقديم طلب الحصة التجريبية بنجاح! سيتواصل فريقنا معك خلال ٢٤ ساعة لتحديد موعد حصتك التجريبية المجانية.",
        submittedData: {
          name,
          phone: cleanPhone,
          email: email || null,
          childGrade: childGrade || null,
          preferredProgram: preferredProgram || null,
          preferredTime: preferredTime || null,
        },
      };
    } catch (error) {
      return {
        error: `Failed to submit trial request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
