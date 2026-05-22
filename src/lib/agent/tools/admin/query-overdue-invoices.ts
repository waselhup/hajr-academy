import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Admin tool — "في فواتير متأخرة؟" / "Any overdue invoices?"
 * Lists overdue invoices with student names, amounts, and days overdue.
 */
export const queryOverdueInvoices: AgentTool = {
  name: "query_overdue_invoices",
  description:
    "List all overdue invoices (past due date, still unpaid) with the student name, amount in SAR, due date, and how many days overdue. Use for questions about late or unpaid invoices and collections.",
  input_schema: {
    type: "object",
    properties: {},
  },

  handler: async (
    _input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (context.userRole !== "ADMIN" && context.userRole !== "SUPER_ADMIN") {
        return { error: "Admins only." };
      }

      const now = new Date();
      const overdue = await context.prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceStatus: "OVERDUE" },
            { invoiceStatus: "PENDING", dueDate: { lt: now } },
          ],
        },
        orderBy: { dueDate: "asc" },
        take: 100,
        include: {
          student: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      });

      const invoices = overdue.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        studentName: inv.student.user.name,
        studentEmail: inv.student.user.email,
        amountSar: Number(inv.totalSar),
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        daysOverdue: Math.max(
          0,
          Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400_000)
        ),
      }));

      return {
        count: invoices.length,
        totalOverdueSar: +invoices
          .reduce((s, i) => s + i.amountSar, 0)
          .toFixed(2),
        invoices,
      };
    } catch (error) {
      return {
        error: `Failed to query overdue invoices: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
