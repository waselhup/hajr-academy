import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Public tool — "متى موعد دفعتي الجاية؟" / "When is my next payment?"
 * Returns the student's subscription status, next billing date, and any
 * unpaid invoices.
 */
export const checkMyBilling: AgentTool = {
  name: "check_my_billing",
  description:
    "Get the logged-in student's billing summary: current subscription package and status, next billing date, monthly amount, and a list of any unpaid or overdue invoices. Use for questions about subscription, next payment date, or amount owed.",
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
            "You must be logged in to view billing. / يجب تسجيل الدخول لعرض الفوترة.",
        };
      }
      if (context.userRole !== "STUDENT") {
        return {
          error:
            "Billing details are available for students. / تفاصيل الفوترة متاحة للطلاب.",
        };
      }

      const student = await context.prisma.studentProfile.findUnique({
        where: { userId: context.userId },
        select: { id: true },
      });
      if (!student) {
        return {
          error:
            "Student profile not found. / لم يتم العثور على ملف الطالب.",
        };
      }

      const [subscription, unpaid] = await Promise.all([
        context.prisma.subscription.findFirst({
          where: { studentId: student.id },
          orderBy: { createdAt: "desc" },
        }),
        context.prisma.invoice.findMany({
          where: {
            studentId: student.id,
            invoiceStatus: { in: ["PENDING", "OVERDUE"] },
          },
          orderBy: { dueDate: "asc" },
        }),
      ]);

      return {
        subscription: subscription
          ? {
              package: subscription.packageType,
              status: subscription.status,
              monthlyAmountSar: Number(subscription.totalWithVat),
              nextBillingDate:
                subscription.nextBillingDate?.toISOString().slice(0, 10) ??
                null,
              autoRenew: subscription.autoRenew,
              currentPeriodEnds: subscription.currentPeriodEnd
                .toISOString()
                .slice(0, 10),
            }
          : null,
        unpaidInvoices: unpaid.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          amountSar: Number(inv.totalSar),
          status: inv.invoiceStatus,
          dueDate: inv.dueDate.toISOString().slice(0, 10),
        })),
        totalDueSar: +unpaid
          .reduce((s, i) => s + Number(i.totalSar), 0)
          .toFixed(2),
      };
    } catch (error) {
      return {
        error: `Failed to load billing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
