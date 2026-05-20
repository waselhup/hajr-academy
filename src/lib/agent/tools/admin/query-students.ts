import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const queryStudents: AgentTool = {
  name: "query_students",
  description: "Search students by name, level, package, gender, or school",
  input_schema: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search by student name, email, or phone",
      },
      level: {
        type: "string",
        enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
        description: "Filter by English level",
      },
      package: {
        type: "string",
        enum: ["ESSENTIAL", "INTEGRATED", "PRIVATE", "SCHOOL"],
        description: "Filter by active package type",
      },
      gender: {
        type: "string",
        enum: ["MALE", "FEMALE"],
        description: "Filter by gender",
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
      const level = typeof input.level === "string" ? input.level.trim() : undefined;
      const packageType = typeof input.package === "string" ? input.package.trim() : undefined;
      const gender = typeof input.gender === "string" ? input.gender.trim() : undefined;
      const limit = typeof input.limit === "number" ? Math.min(input.limit, 50) : 20;

      const where: Record<string, unknown> = {
        user: { isActive: true },
      };

      if (search) {
        where.user = {
          ...where.user as Record<string, unknown>,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        };
      }

      if (level) {
        where.englishLevel = level;
      }

      if (packageType) {
        where.activePackage = packageType;
      }

      if (gender) {
        where.gender = gender;
      }

      const students = await context.prisma.studentProfile.findMany({
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
          enrollments: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
          attendances: {
            select: { status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const results = students.map((s) => {
        const totalAttendance = s.attendances.length;
        const presentCount = s.attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
        const attendanceRate =
          totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 1000) / 10
            : null;

        return {
          id: s.id,
          name: s.user.name,
          email: s.user.email,
          phone: s.user.phone,
          level: s.englishLevel,
          gender: s.gender,
          package: s.activePackage,
          schoolName: s.schoolName,
          attendanceRate,
          enrolledClasses: s.enrollments.length,
        };
      });

      return {
        students: results,
        count: results.length,
        filters: { search, level, package: packageType, gender, limit },
      };
    } catch (error) {
      return {
        error: `Failed to query students: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
