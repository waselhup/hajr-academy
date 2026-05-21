import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { recommendExercises } from "@/lib/lab/recommender";

/**
 * Admin agent tool: recommend lab exercises for a specific student this
 * week — e.g. "What exercises should I give Ali Shaker this week?"
 */
export const recommendExercisesTool: AgentTool = {
  name: "recommend_exercises",
  description:
    "Recommend English Lab exercises for a specific student, targeting their weakest skill. Provide a studentId. Returns a ranked list of exercises with titles and reasons.",
  input_schema: {
    type: "object",
    properties: {
      studentId: {
        type: "string",
        description: "The student's profile ID",
      },
      skill: {
        type: "string",
        enum: ["SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY"],
        description: "Optionally target a specific skill instead of the weakest",
      },
      limit: { type: "number", description: "How many exercises (default 5)" },
    },
    required: ["studentId"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const studentId =
        typeof input.studentId === "string" ? input.studentId : undefined;
      if (!studentId) {
        return { error: "studentId is required" };
      }
      const skill =
        typeof input.skill === "string"
          ? (input.skill as Parameters<typeof recommendExercises>[2])
          : undefined;
      const limit =
        typeof input.limit === "number" ? Math.min(input.limit, 10) : 5;

      const student = await context.prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: { select: { name: true, nameAr: true } } },
      });
      if (!student) {
        return { error: "Student not found" };
      }

      const recommendations = await recommendExercises(studentId, limit, skill);

      return {
        student: student.user.nameAr ?? student.user.name,
        recommendations: recommendations.map((r) => ({
          id: r.id,
          title: r.titleAr,
          type: r.type,
          level: r.level,
          estimatedMinutes: r.estimatedMinutes,
          reason: r.reasonAr,
        })),
        count: recommendations.length,
      };
    } catch {
      return { error: "Failed to recommend exercises" };
    }
  },
};
