import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const queryInvoices: AgentTool = {
  name: "query_invoices",
  description: "Query invoices by status, month, year, student, or minimum amount",
  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["PENDING", "PAID", "OVERDUE", "WAIVED", "REFUNDED"],
        description: "Filter by payment status",
      },
      month: {
        type: "number",
        description: "Filter by month (1-12)",
      },
      year: {
        type: "number",
        description: "Filter by year (e.g., 2026)",
      },
      studentId: {
        type: "string",
        description: "Filter by student profile ID",
      },
      minAmount: {
        type: "number",
        description: "Minimum invoice total in SAR",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const status = typeof input.status === "string" ? input.status.trim() : undefined;
      const month = typeof input.month === "number" ? input.month : undefined;
      const year = typeof input.year === "number" ? input.year : undefined;
      const studentId = typeof input.studentId === "string" ? input.studentId.trim() : undefined;
      const minAmount = typeof input.minAmount === "number" ? input.minAmount : undefined;

      const where: Record<string, unknown> = {};

      if (status) where.status = status;
      if (month) where.month = month;
      if (year) where.year = year;
      if (studentId) where.studentId = studentId;
      if (minAmount) where.totalSar = { gte: minAmount };

      const invoices = await context.prisma.invoice.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const results = invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        studentName: inv.student.user.name,
        studentEmail: inv.student.user.email,
        packageType: inv.packageType,
        month: inv.month,
        year: inv.year,
        subtotalSar: Number(inv.subtotalSar),
        vatSar: Number(inv.vatSar),
        totalSar: Number(inv.totalSar),
        status: inv.status,
        dueDate: inv.dueDate.toISOString(),
        paidAt: inv.paidAt?.toISOString() ?? null,
        paymentMethod: inv.paymentMethod,
      }));

      const totalAmount = results.reduce((sum, inv) => sum + inv.totalSar, 0);
      const totalPaid = results
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + inv.totalSar, 0);
      const totalPending = results
        .filter((inv) => inv.status === "PENDING")
        .reduce((sum, inv) => sum + inv.totalSar, 0);
      const totalOverdue = results
        .filter((inv) => inv.status === "OVERDUE")
        .reduce((sum, inv) => sum + inv.totalSar, 0);

      return {
        invoices: results,
        count: results.length,
        summary: {
          total: results.length,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          totalOverdue: Math.round(totalOverdue * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
        },
        filters: { status, month, year, studentId, minAmount },
      };
    } catch (error) {
      return {
        error: `Failed to query invoices: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
