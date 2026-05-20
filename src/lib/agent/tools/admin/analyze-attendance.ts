import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const analyzeAttendance: AgentTool = {
  name: "analyze_attendance",
  description: "Generate attendance report by class, student, or period",
  input_schema: {
    type: "object",
    properties: {
      classId: {
        type: "string",
        description: "Filter attendance by class ID",
      },
      studentId: {
        type: "string",
        description: "Filter attendance by student profile ID",
      },
      month: {
        type: "number",
        description: "Filter by month (1-12)",
      },
      year: {
        type: "number",
        description: "Filter by year (e.g., 2026)",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const classId = typeof input.classId === "string" ? input.classId.trim() : undefined;
      const studentId = typeof input.studentId === "string" ? input.studentId.trim() : undefined;
      const month = typeof input.month === "number" ? input.month : undefined;
      const year = typeof input.year === "number" ? input.year : undefined;

      // Build date range filter
      let dateFilter: { gte?: Date; lte?: Date } | undefined;
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        dateFilter = { gte: startDate, lte: endDate };
      } else if (year) {
        dateFilter = {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        };
      }

      const where: Record<string, unknown> = {};

      if (studentId) {
        where.studentId = studentId;
      }

      if (classId || dateFilter) {
        where.session = {};
        if (classId) {
          (where.session as Record<string, unknown>).classId = classId;
        }
        if (dateFilter) {
          (where.session as Record<string, unknown>).scheduledDate = dateFilter;
        }
      }

      const attendances = await context.prisma.attendance.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { name: true } },
            },
          },
          session: {
            select: {
              scheduledDate: true,
              classId: true,
              class: { select: { name: true, cohortCode: true } },
            },
          },
        },
        orderBy: { session: { scheduledDate: "desc" } },
      });

      // Calculate overall stats
      const total = attendances.length;
      const present = attendances.filter((a) => a.status === "PRESENT").length;
      const late = attendances.filter((a) => a.status === "LATE").length;
      const absent = attendances.filter((a) => a.status === "ABSENT").length;
      const excused = attendances.filter((a) => a.status === "EXCUSED").length;

      const attendanceRate =
        total > 0
          ? Math.round(((present + late) / total) * 1000) / 10
          : null;

      // Breakdown by student
      const byStudent: Record<
        string,
        { name: string; present: number; late: number; absent: number; excused: number; total: number }
      > = {};

      for (const a of attendances) {
        const sid = a.studentId;
        if (!byStudent[sid]) {
          byStudent[sid] = {
            name: a.student.user.name,
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
            total: 0,
          };
        }
        byStudent[sid][a.status.toLowerCase() as "present" | "late" | "absent" | "excused"]++;
        byStudent[sid].total++;
      }

      const studentBreakdown = Object.entries(byStudent).map(
        ([id, data]) => ({
          studentId: id,
          name: data.name,
          present: data.present,
          late: data.late,
          absent: data.absent,
          excused: data.excused,
          total: data.total,
          rate:
            data.total > 0
              ? Math.round(
                  ((data.present + data.late) / data.total) * 1000
                ) / 10
              : 0,
        })
      );

      // Breakdown by class
      const byClass: Record<
        string,
        { name: string; cohortCode: string; present: number; total: number }
      > = {};

      for (const a of attendances) {
        const cid = a.session.classId;
        if (!byClass[cid]) {
          byClass[cid] = {
            name: a.session.class.name,
            cohortCode: a.session.class.cohortCode,
            present: 0,
            total: 0,
          };
        }
        if (a.status === "PRESENT" || a.status === "LATE") {
          byClass[cid].present++;
        }
        byClass[cid].total++;
      }

      const classBreakdown = Object.entries(byClass).map(
        ([id, data]) => ({
          classId: id,
          name: data.name,
          cohortCode: data.cohortCode,
          attendanceRate:
            data.total > 0
              ? Math.round((data.present / data.total) * 1000) / 10
              : 0,
          totalRecords: data.total,
        })
      );

      return {
        report: {
          filters: { classId, studentId, month, year },
          overall: {
            totalRecords: total,
            present,
            late,
            absent,
            excused,
            attendanceRate,
          },
          byStudent: studentBreakdown.sort((a, b) => a.rate - b.rate),
          byClass: classBreakdown.sort(
            (a, b) => a.attendanceRate - b.attendanceRate
          ),
        },
      };
    } catch (error) {
      return {
        error: `Failed to analyze attendance: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
