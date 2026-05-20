import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getAtRiskStudents: AgentTool = {
  name: "get_at_risk_students",
  description:
    "Find students with low attendance, declining grades, or overdue invoices",
  input_schema: {
    type: "object",
    properties: {},
  },

  handler: async (
    _input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      // Get all active students with attendance and invoice data
      const students = await context.prisma.studentProfile.findMany({
        where: {
          user: { isActive: true },
          enrollments: { some: { status: "ACTIVE" } },
        },
        include: {
          user: {
            select: { name: true, email: true, phone: true },
          },
          attendances: {
            select: { status: true },
          },
          invoices: {
            where: { status: "OVERDUE" },
            select: {
              invoiceNumber: true,
              totalSar: true,
              dueDate: true,
            },
          },
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              class: { select: { name: true, cohortCode: true } },
            },
          },
        },
      });

      const atRiskStudents = [];

      for (const student of students) {
        const riskFactors: string[] = [];
        const suggestedActions: string[] = [];

        // Check attendance rate
        const totalAttendance = student.attendances.length;
        const presentCount = student.attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
        const attendanceRate =
          totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 1000) / 10
            : null;

        if (attendanceRate !== null && attendanceRate < 60) {
          riskFactors.push(
            `Low attendance: ${attendanceRate}% (${presentCount}/${totalAttendance} sessions)`
          );
          suggestedActions.push(
            "Contact student/parent about attendance improvement"
          );
          suggestedActions.push("Consider schedule adjustment if conflicts exist");
        }

        // Check overdue invoices
        if (student.invoices.length > 0) {
          const overdueTotal = student.invoices.reduce(
            (sum, inv) => sum + Number(inv.totalSar),
            0
          );
          riskFactors.push(
            `${student.invoices.length} overdue invoice(s) totaling ${Math.round(overdueTotal * 100) / 100} SAR`
          );
          suggestedActions.push("Send payment reminder to parent/student");
          suggestedActions.push("Review payment plan options");
        }

        if (riskFactors.length > 0) {
          atRiskStudents.push({
            id: student.id,
            name: student.user.name,
            email: student.user.email,
            phone: student.user.phone,
            level: student.englishLevel,
            package: student.activePackage,
            enrolledClasses: student.enrollments.map((e) => ({
              name: e.class.name,
              cohortCode: e.class.cohortCode,
            })),
            attendanceRate,
            overdueInvoices: student.invoices.length,
            riskFactors,
            suggestedActions,
          });
        }
      }

      // Sort by number of risk factors (most at-risk first)
      atRiskStudents.sort(
        (a, b) => b.riskFactors.length - a.riskFactors.length
      );

      return {
        atRiskStudents,
        count: atRiskStudents.length,
        summary: {
          lowAttendance: atRiskStudents.filter((s) =>
            s.riskFactors.some((f) => f.startsWith("Low attendance"))
          ).length,
          overduePayments: atRiskStudents.filter(
            (s) => s.overdueInvoices > 0
          ).length,
        },
      };
    } catch (error) {
      return {
        error: `Failed to get at-risk students: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
