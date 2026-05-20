import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getMyInvoices: AgentTool = {
  name: "get_my_invoices",
  description:
    "Get invoice summary (requires STUDENT or PARENT authentication)",
  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["PENDING", "PAID", "OVERDUE", "WAIVED", "REFUNDED"],
        description: "Filter invoices by payment status",
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
            "You must be logged in to view invoices. / يجب تسجيل الدخول لعرض الفواتير.",
        };
      }

      if (
        context.userRole !== "STUDENT" &&
        context.userRole !== "PARENT"
      ) {
        return {
          error:
            "This feature is available for students and parents only. / هذه الميزة متاحة للطلاب وأولياء الأمور فقط.",
        };
      }

      const statusFilter =
        typeof input.status === "string"
          ? input.status.trim()
          : undefined;

      let studentIds: string[] = [];

      if (context.userRole === "STUDENT") {
        const studentProfile =
          await context.prisma.studentProfile.findUnique({
            where: { userId: context.userId },
            select: { id: true },
          });

        if (!studentProfile) {
          return {
            error:
              "Student profile not found. / لم يتم العثور على ملف الطالب.",
          };
        }

        studentIds = [studentProfile.id];
      }

      if (context.userRole === "PARENT") {
        const parentProfile =
          await context.prisma.parentProfile.findUnique({
            where: { userId: context.userId },
            select: { id: true },
          });

        if (!parentProfile) {
          return {
            error:
              "Parent profile not found. / لم يتم العثور على ملف ولي الأمر.",
          };
        }

        const childLinks =
          await context.prisma.parentStudentLink.findMany({
            where: { parentId: parentProfile.id },
            select: { studentId: true },
          });

        if (childLinks.length === 0) {
          return {
            error:
              "No linked children found. / لم يتم العثور على أطفال مرتبطين.",
          };
        }

        studentIds = childLinks.map((link) => link.studentId);
      }

      const where: Record<string, unknown> = {
        studentId: { in: studentIds },
      };

      if (statusFilter) {
        where.status = statusFilter;
      }

      const invoices = await context.prisma.invoice.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { name: true, nameAr: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const results = invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        studentName:
          inv.student.user.nameAr || inv.student.user.name,
        packageType: inv.packageType,
        month: inv.month,
        year: inv.year,
        subtotalSar: Number(inv.subtotalSar),
        vatSar: Number(inv.vatSar),
        totalSar: Number(inv.totalSar),
        status: inv.status,
        dueDate: inv.dueDate.toISOString().split("T")[0],
        paidAt: inv.paidAt?.toISOString().split("T")[0] ?? null,
        paymentMethod: inv.paymentMethod,
      }));

      const totalAmount = results.reduce(
        (sum, inv) => sum + inv.totalSar,
        0
      );
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
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          totalOverdue: Math.round(totalOverdue * 100) / 100,
        },
        filter: { status: statusFilter || "all" },
      };
    } catch (error) {
      return {
        error: `Failed to get invoices: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
