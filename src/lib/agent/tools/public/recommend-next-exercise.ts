import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { recommendExercises } from "@/lib/lab/recommender";

/**
 * Public assistant tool: a student asks what to practise next —
 * e.g. "What's my next exercise?"
 */
export const recommendNextExercise: AgentTool = {
  name: "recommend_next_exercise",
  description:
    "Recommend the logged-in student's next English Lab exercises, targeting their weakest skill. Requires authentication as STUDENT. Returns exercises with their IDs so they can be linked.",
  input_schema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "How many to suggest (default 3)" },
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
            "You must be logged in to get recommendations. / يجب تسجيل الدخول للحصول على توصيات.",
        };
      }
      if (context.userRole !== "STUDENT") {
        return {
          error:
            "This feature is available for students only. / هذه الميزة متاحة للطلاب فقط.",
        };
      }

      const student = await context.prisma.studentProfile.findUnique({
        where: { userId: context.userId },
        select: { id: true },
      });
      if (!student) {
        return { error: "Student profile not found. / لم يتم العثور على ملف الطالب." };
      }

      const limit =
        typeof input.limit === "number" ? Math.min(input.limit, 5) : 3;
      const recommendations = await recommendExercises(student.id, limit);

      return {
        recommendations: recommendations.map((r) => ({
          id: r.id,
          title: context.locale === "ar" ? r.titleAr : r.title,
          type: r.type,
          level: r.level,
          estimatedMinutes: r.estimatedMinutes,
          reason: context.locale === "ar" ? r.reasonAr : r.reason,
          link: `/${context.locale}/student/lab/exercise/${r.id}`,
        })),
        count: recommendations.length,
        note:
          recommendations.length === 0
            ? "No exercises available right now."
            : undefined,
      };
    } catch {
      return { error: "Failed to recommend an exercise" };
    }
  },
};
