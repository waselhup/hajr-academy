import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const queryTeachers: AgentTool = {
  name: "query_teachers",
  description: "Search teachers by name or specialization",
  input_schema: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search by teacher name or email",
      },
      specialization: {
        type: "string",
        description: "Filter by specialization (e.g., STEP, IELTS, General English)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default 20)",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const search = typeof input.search === "string" ? input.search.trim().toLowerCase() : undefined;
      const specialization = typeof input.specialization === "string" ? input.specialization.trim().toLowerCase() : undefined;
      const limit = typeof input.limit === "number" ? Math.min(input.limit, 50) : 20;

      const where: Record<string, unknown> = {
        active: true,
      };

      if (search) {
        where.user = {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        };
      }

      if (specialization) {
        where.specializations = { has: specialization };
      }

      const teachers = await context.prisma.teacherProfile.findMany({
        where,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          classes: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const results = teachers.map((t) => ({
        id: t.id,
        name: t.user.name,
        email: t.user.email,
        specializations: t.specializations,
        rating: t.rating ? Number(t.rating) : null,
        totalStudents: t.totalStudents,
        activeClasses: t.classes.length,
        salaryBase: Number(t.salaryBase),
      }));

      return {
        teachers: results,
        count: results.length,
        filters: { search, specialization, limit },
      };
    } catch (error) {
      return {
        error: `Failed to query teachers: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
