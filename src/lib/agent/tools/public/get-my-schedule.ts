import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getMySchedule: AgentTool = {
  name: "get_my_schedule",
  description:
    "Get the student's upcoming class schedule (requires authentication as STUDENT)",
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
            "You must be logged in to view your schedule. / يجب تسجيل الدخول لعرض جدولك.",
        };
      }

      if (context.userRole !== "STUDENT") {
        return {
          error:
            "This feature is available for students only. / هذه الميزة متاحة للطلاب فقط.",
        };
      }

      // Find the student's profile
      const studentProfile = await context.prisma.studentProfile.findUnique({
        where: { userId: context.userId },
        select: { id: true },
      });

      if (!studentProfile) {
        return {
          error:
            "Student profile not found. / لم يتم العثور على ملف الطالب.",
        };
      }

      // Get active enrollments with class info
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const enrollments = await context.prisma.enrollment.findMany({
        where: {
          studentId: studentProfile.id,
          status: "ACTIVE",
        },
        include: {
          class: {
            include: {
              sessions: {
                where: {
                  scheduledDate: {
                    gte: now,
                    lte: nextWeek,
                  },
                },
                orderBy: { scheduledDate: "asc" },
              },
              teacher: {
                include: {
                  user: {
                    select: { name: true, nameAr: true },
                  },
                },
              },
              program: {
                select: { nameEn: true, nameAr: true },
              },
            },
          },
        },
      });

      const upcomingSessions = enrollments.flatMap((enrollment) =>
        enrollment.class.sessions.map((session) => ({
          className: enrollment.class.name,
          classNameAr: enrollment.class.nameAr || enrollment.class.name,
          program: enrollment.class.program.nameEn,
          programAr: enrollment.class.program.nameAr,
          date: session.scheduledDate.toISOString().split("T")[0],
          time: enrollment.class.timeSlot,
          durationMinutes: enrollment.class.durationMinutes,
          teacher:
            enrollment.class.teacher.user.nameAr ||
            enrollment.class.teacher.user.name,
          status: session.status,
          zoomJoinUrl: session.zoomJoinUrl || null,
        }))
      );

      // Sort by date
      upcomingSessions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return {
        schedule: upcomingSessions,
        count: upcomingSessions.length,
        periodStart: now.toISOString().split("T")[0],
        periodEnd: nextWeek.toISOString().split("T")[0],
        message:
          upcomingSessions.length > 0
            ? undefined
            : "No upcoming sessions in the next 7 days. / لا توجد جلسات قادمة في الأيام السبعة القادمة.",
      };
    } catch (error) {
      return {
        error: `Failed to get schedule: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
