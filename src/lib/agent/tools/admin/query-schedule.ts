import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const querySchedule: AgentTool = {
  name: "query_schedule",
  description: "View schedule for a day or week, find conflicts",
  input_schema: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "Date to view schedule for (ISO format, e.g., 2026-05-20). Defaults to today.",
      },
      teacherId: {
        type: "string",
        description: "Filter by teacher profile ID",
      },
      view: {
        type: "string",
        enum: ["day", "week"],
        description: "View mode: single day or full week",
      },
    },
    required: ["view"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const dateStr = typeof input.date === "string" ? input.date.trim() : undefined;
      const teacherId = typeof input.teacherId === "string" ? input.teacherId.trim() : undefined;
      const view = typeof input.view === "string" ? input.view.trim() : "day";

      const baseDate = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(baseDate.getTime())) {
        return { error: "Invalid date format. Use ISO format (e.g., 2026-05-20)" };
      }

      // Calculate date range
      let startDate: Date;
      let endDate: Date;

      if (view === "week") {
        const dayOfWeek = baseDate.getDay();
        startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(baseDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(baseDate);
        endDate.setHours(23, 59, 59, 999);
      }

      const where: Record<string, unknown> = {
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (teacherId) {
        where.class = { teacherId };
      }

      const sessions = await context.prisma.classSession.findMany({
        where,
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: { select: { name: true } },
                },
              },
              program: { select: { code: true, nameEn: true, nameAr: true } },
              enrollments: {
                where: { status: "ACTIVE" },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { scheduledDate: "asc" },
      });

      // Organize by day
      const schedule: Record<string, Array<Record<string, unknown>>> = {};

      for (const session of sessions) {
        const dayKey = session.scheduledDate.toISOString().split("T")[0];
        if (!schedule[dayKey]) {
          schedule[dayKey] = [];
        }

        schedule[dayKey].push({
          sessionId: session.id,
          className: session.class.name,
          cohortCode: session.class.cohortCode,
          program: session.class.program.code,
          teacher: session.class.teacher.user.name,
          timeSlot: session.class.timeSlot,
          durationMinutes: session.class.durationMinutes,
          scheduledDate: session.scheduledDate.toISOString(),
          status: session.status,
          enrolledStudents: session.class.enrollments.length,
        });
      }

      // Detect conflicts (overlapping sessions for the same teacher)
      const conflicts: Array<{
        teacher: string;
        date: string;
        sessions: string[];
        timeSlot: string;
      }> = [];

      for (const [day, daySessions] of Object.entries(schedule)) {
        const teacherSessions: Record<string, Array<Record<string, unknown>>> = {};

        for (const session of daySessions) {
          const teacher = session.teacher as string;
          if (!teacherSessions[teacher]) {
            teacherSessions[teacher] = [];
          }
          teacherSessions[teacher].push(session);
        }

        for (const [teacher, tSessions] of Object.entries(teacherSessions)) {
          if (tSessions.length > 1) {
            // Check for time slot overlaps
            const timeSlots = tSessions.map((s) => s.timeSlot as string);
            const uniqueSlots = new Set(timeSlots);
            if (uniqueSlots.size < tSessions.length) {
              conflicts.push({
                teacher,
                date: day,
                sessions: tSessions.map((s) => `${s.className} (${s.cohortCode})`),
                timeSlot: tSessions[0].timeSlot as string,
              });
            }
          }
        }
      }

      return {
        view,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        schedule,
        totalSessions: sessions.length,
        conflicts,
        hasConflicts: conflicts.length > 0,
      };
    } catch (error) {
      return {
        error: `Failed to query schedule: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
