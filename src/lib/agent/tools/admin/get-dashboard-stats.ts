import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getDashboardStats: AgentTool = {
  name: "get_dashboard_stats",
  description:
    "Get quick KPI snapshot: students, classes, MRR, invoices, sessions, at-risk",
  input_schema: {
    type: "object",
    properties: {},
  },

  handler: async (
    _input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Run all queries in parallel
      const [
        totalStudents,
        activeStudents,
        totalTeachers,
        activeClasses,
        paidInvoicesThisMonth,
        pendingInvoices,
        overdueInvoices,
        liveSessionsNow,
        atRiskCount,
      ] = await Promise.all([
        // Total students
        context.prisma.studentProfile.count(),

        // Active students (with active enrollment)
        context.prisma.studentProfile.count({
          where: {
            user: { isActive: true },
            enrollments: { some: { status: "ACTIVE" } },
          },
        }),

        // Total active teachers
        context.prisma.teacherProfile.count({
          where: { active: true },
        }),

        // Active classes
        context.prisma.class.count({
          where: { status: "ACTIVE" },
        }),

        // MRR: sum of paid invoices this month
        context.prisma.invoice.findMany({
          where: {
            status: "PAID",
            month: currentMonth,
            year: currentYear,
          },
          select: { totalSar: true },
        }),

        // Outstanding pending invoices
        context.prisma.invoice.count({
          where: { status: "PENDING" },
        }),

        // Overdue invoices
        context.prisma.invoice.count({
          where: { status: "OVERDUE" },
        }),

        // Live sessions right now
        context.prisma.classSession.count({
          where: { status: "LIVE" },
        }),

        // At-risk students: low attendance or overdue invoices
        (async () => {
          const studentsWithIssues = await context.prisma.studentProfile.findMany({
            where: {
              user: { isActive: true },
              enrollments: { some: { status: "ACTIVE" } },
            },
            include: {
              attendances: { select: { status: true } },
              invoices: {
                where: { status: "OVERDUE" },
                select: { id: true },
              },
            },
          });

          let count = 0;
          for (const student of studentsWithIssues) {
            const total = student.attendances.length;
            const present = student.attendances.filter(
              (a) => a.status === "PRESENT" || a.status === "LATE"
            ).length;
            const rate = total > 0 ? (present / total) * 100 : 100;

            if (rate < 60 || student.invoices.length > 0) {
              count++;
            }
          }
          return count;
        })(),
      ]);

      const mrr = paidInvoicesThisMonth.reduce(
        (sum, inv) => sum + Number(inv.totalSar),
        0
      );

      return {
        snapshot: {
          totalStudents,
          activeStudents,
          totalTeachers,
          activeClasses,
          mrr: Math.round(mrr * 100) / 100,
          outstandingInvoices: {
            pending: pendingInvoices,
            overdue: overdueInvoices,
            total: pendingInvoices + overdueInvoices,
          },
          liveSessionsNow,
          atRiskCount,
        },
        generatedAt: now.toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to get dashboard stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
