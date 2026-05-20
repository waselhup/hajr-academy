import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getClassSummary: AgentTool = {
  name: "get_class_summary",
  description: "Get detailed summary for a specific class",
  input_schema: {
    type: "object",
    properties: {
      classId: {
        type: "string",
        description: "The class ID to get the summary for",
      },
    },
    required: ["classId"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const classId = typeof input.classId === "string" ? input.classId.trim() : "";

      if (!classId) {
        return { error: "classId is required" };
      }

      const classData = await context.prisma.class.findUnique({
        where: { id: classId },
        include: {
          program: {
            select: { code: true, nameEn: true, nameAr: true },
          },
          teacher: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              student: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
          sessions: {
            orderBy: { scheduledDate: "desc" },
            take: 20,
            include: {
              attendances: {
                select: { status: true },
              },
            },
          },
        },
      });

      if (!classData) {
        return { error: "Class not found" };
      }

      const now = new Date();

      // Calculate overall attendance rate from sessions
      let totalAttendanceRecords = 0;
      let totalPresent = 0;
      for (const session of classData.sessions) {
        totalAttendanceRecords += session.attendances.length;
        totalPresent += session.attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
      }
      const attendanceRate =
        totalAttendanceRecords > 0
          ? Math.round((totalPresent / totalAttendanceRecords) * 1000) / 10
          : null;

      // Split sessions into recent (past) and upcoming
      const recentSessions = classData.sessions
        .filter((s) => new Date(s.scheduledDate) <= now)
        .slice(0, 5)
        .map((s) => ({
          date: s.scheduledDate.toISOString(),
          status: s.status,
          attendees: s.attendances.filter(
            (a) => a.status === "PRESENT" || a.status === "LATE"
          ).length,
          totalStudents: s.attendances.length,
        }));

      const upcomingSessions = classData.sessions
        .filter((s) => new Date(s.scheduledDate) > now)
        .reverse()
        .slice(0, 5)
        .map((s) => ({
          date: s.scheduledDate.toISOString(),
          status: s.status,
        }));

      return {
        class: {
          name: classData.name,
          cohortCode: classData.cohortCode,
          program: classData.program,
          teacher: classData.teacher.user.name,
          teacherEmail: classData.teacher.user.email,
          scheduleDays: classData.scheduleDays,
          timeSlot: classData.timeSlot,
          durationMinutes: classData.durationMinutes,
          maxStudents: classData.maxStudents,
          status: classData.status,
          startDate: classData.startDate.toISOString(),
          endDate: classData.endDate?.toISOString() ?? null,
          pricePerMonth: Number(classData.pricePerMonth),
        },
        enrollment: {
          count: classData.enrollments.length,
          capacity: classData.maxStudents,
          utilizationPercent:
            Math.round(
              (classData.enrollments.length / classData.maxStudents) * 1000
            ) / 10,
          students: classData.enrollments.map((e) => ({
            name: e.student.user.name,
            level: e.student.englishLevel,
          })),
        },
        attendance: {
          overallRate: attendanceRate,
          totalSessions: classData.sessions.length,
        },
        recentSessions,
        upcomingSessions,
      };
    } catch (error) {
      return {
        error: `Failed to get class summary: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
