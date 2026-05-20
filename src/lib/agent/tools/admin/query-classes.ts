import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const queryClasses: AgentTool = {
  name: "query_classes",
  description: "Search classes by program, teacher, or status",
  input_schema: {
    type: "object",
    properties: {
      program: {
        type: "string",
        enum: ["STEP_PREP", "PRIVATE", "UNI_PREP", "SCHOOL", "ENGLISH_LAB"],
        description: "Filter by program code",
      },
      teacher: {
        type: "string",
        description: "Filter by teacher name",
      },
      status: {
        type: "string",
        enum: ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"],
        description: "Filter by class status",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const program = typeof input.program === "string" ? input.program.trim() : undefined;
      const teacher = typeof input.teacher === "string" ? input.teacher.trim().toLowerCase() : undefined;
      const status = typeof input.status === "string" ? input.status.trim() : undefined;

      const where: Record<string, unknown> = {};

      if (program) {
        where.program = { code: program };
      }

      if (teacher) {
        where.teacher = {
          user: { name: { contains: teacher, mode: "insensitive" } },
        };
      }

      if (status) {
        where.status = status;
      }

      const classes = await context.prisma.class.findMany({
        where,
        include: {
          program: {
            select: { code: true, nameEn: true, nameAr: true },
          },
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
          enrollments: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const results = classes.map((c) => ({
        id: c.id,
        name: c.name,
        cohortCode: c.cohortCode,
        program: {
          code: c.program.code,
          nameEn: c.program.nameEn,
          nameAr: c.program.nameAr,
        },
        teacher: c.teacher.user.name,
        scheduleDays: c.scheduleDays,
        timeSlot: c.timeSlot,
        enrolledCount: c.enrollments.length,
        maxStudents: c.maxStudents,
        status: c.status,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null,
      }));

      return {
        classes: results,
        count: results.length,
        filters: { program, teacher, status },
      };
    } catch (error) {
      return {
        error: `Failed to query classes: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
