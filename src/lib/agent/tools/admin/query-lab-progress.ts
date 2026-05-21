import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Admin agent tool: report English Lab progress for students in a class
 * or a single skill — e.g. "How are class B's students doing in Speaking?"
 */
export const queryLabProgress: AgentTool = {
  name: "query_lab_progress",
  description:
    "Report English Lab progress for students. Filter by class, by a single skill (SPEAKING/LISTENING/WRITING/READING/GRAMMAR/VOCABULARY), or get an overall view. Returns each student's CEFR level and recent activity.",
  input_schema: {
    type: "object",
    properties: {
      classId: {
        type: "string",
        description: "Filter to students enrolled in this class",
      },
      skill: {
        type: "string",
        enum: ["SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY"],
        description: "Filter to a single English skill",
      },
      limit: { type: "number", description: "Maximum students (default 20)" },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const classId = typeof input.classId === "string" ? input.classId : undefined;
      const skill = typeof input.skill === "string" ? input.skill : undefined;
      const limit =
        typeof input.limit === "number" ? Math.min(input.limit, 50) : 20;

      // Resolve the student set.
      const studentWhere: Record<string, unknown> = {};
      if (classId) {
        studentWhere.enrollments = {
          some: { classId, status: "ACTIVE" },
        };
      }

      const students = await context.prisma.studentProfile.findMany({
        where: studentWhere,
        take: limit,
        include: {
          user: { select: { name: true, nameAr: true } },
          skillLevels: skill
            ? { where: { skill: skill as never } }
            : true,
          _count: { select: { labAttempts: true } },
        },
      });

      const rows = students.map((s) => {
        const levels = s.skillLevels.map((l) => ({
          skill: l.skill,
          level: l.currentLevel,
          confidence: Number(l.confidence),
          totalAttempts: l.totalAttempts,
        }));
        return {
          studentId: s.id,
          name: s.user.nameAr ?? s.user.name,
          totalLabAttempts: s._count.labAttempts,
          skillLevels: levels,
        };
      });

      return {
        students: rows,
        count: rows.length,
        filters: { classId, skill },
      };
    } catch {
      return { error: "Failed to query lab progress" };
    }
  },
};
