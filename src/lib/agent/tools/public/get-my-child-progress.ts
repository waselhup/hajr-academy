import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getMyChildProgress: AgentTool = {
  name: "get_my_child_progress",
  description:
    "Get linked child's progress report (requires authentication as PARENT)",
  input_schema: {
    type: "object",
    properties: {
      childId: {
        type: "string",
        description:
          "Specific child's student profile ID. If omitted, returns progress for all linked children.",
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
            "You must be logged in to view child progress. / يجب تسجيل الدخول لعرض تقدم الطفل.",
        };
      }

      if (context.userRole !== "PARENT") {
        return {
          error:
            "This feature is available for parents only. / هذه الميزة متاحة لأولياء الأمور فقط.",
        };
      }

      const childId =
        typeof input.childId === "string"
          ? input.childId.trim()
          : undefined;

      // Find the parent profile
      const parentProfile = await context.prisma.parentProfile.findUnique({
        where: { userId: context.userId },
        select: { id: true },
      });

      if (!parentProfile) {
        return {
          error:
            "Parent profile not found. / لم يتم العثور على ملف ولي الأمر.",
        };
      }

      // Get linked children
      const linkWhere: Record<string, unknown> = {
        parentId: parentProfile.id,
      };
      if (childId) {
        linkWhere.studentId = childId;
      }

      const childLinks = await context.prisma.parentStudentLink.findMany({
        where: linkWhere,
        include: {
          student: {
            include: {
              user: {
                select: { name: true, nameAr: true },
              },
              enrollments: {
                where: { status: "ACTIVE" },
                include: {
                  class: {
                    select: {
                      name: true,
                      nameAr: true,
                      timeSlot: true,
                      scheduleDays: true,
                    },
                  },
                },
              },
              attendances: {
                select: { status: true },
                orderBy: { session: { scheduledDate: "desc" } },
                take: 30,
              },
              invoices: {
                orderBy: { createdAt: "desc" },
                take: 3,
                select: {
                  invoiceNumber: true,
                  month: true,
                  year: true,
                  totalSar: true,
                  status: true,
                  dueDate: true,
                },
              },
            },
          },
        },
      });

      if (childLinks.length === 0) {
        return {
          error: childId
            ? "No linked child found with this ID. / لم يتم العثور على طفل مرتبط بهذا المعرف."
            : "No linked children found. / لم يتم العثور على أطفال مرتبطين.",
        };
      }

      const progressReports = childLinks.map((link) => {
        const student = link.student;

        // Calculate attendance rate from recent records
        const totalAttendance = student.attendances.length;
        const presentCount = student.attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
        const attendanceRate =
          totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 1000) / 10
            : null;

        // Active classes
        const activeClasses = student.enrollments.map((e) => ({
          name: e.class.nameAr || e.class.name,
          timeSlot: e.class.timeSlot,
          days: e.class.scheduleDays,
        }));

        // Recent invoices
        const recentInvoices = student.invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          month: inv.month,
          year: inv.year,
          totalSar: Number(inv.totalSar),
          status: inv.status,
          dueDate: inv.dueDate.toISOString().split("T")[0],
        }));

        return {
          childId: student.id,
          childName: student.user.nameAr || student.user.name,
          englishLevel: student.englishLevel,
          activePackage: student.activePackage,
          attendanceRate,
          totalRecordsChecked: totalAttendance,
          activeClasses,
          activeClassCount: activeClasses.length,
          recentInvoices,
          relation: link.relation,
        };
      });

      return {
        children: progressReports,
        count: progressReports.length,
      };
    } catch (error) {
      return {
        error: `Failed to get child progress: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
