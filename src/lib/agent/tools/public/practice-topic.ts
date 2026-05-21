import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Public assistant tool: a student asks to practise a specific topic —
 * e.g. "I want to practise verb tenses". Finds matching published lab
 * exercises by tag/title and returns them with links.
 */
export const practiceTopic: AgentTool = {
  name: "practice_topic",
  description:
    "Find English Lab exercises for a specific topic the student wants to practise (e.g. 'verb tenses', 'reading inference'). Returns matching exercises with links.",
  input_schema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "The topic or keyword to practise",
      },
      limit: { type: "number", description: "How many exercises (default 5)" },
    },
    required: ["topic"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const topic = typeof input.topic === "string" ? input.topic.trim() : "";
      if (!topic) {
        return { error: "Please tell me which topic you want to practise." };
      }
      const limit =
        typeof input.limit === "number" ? Math.min(input.limit, 10) : 5;

      // Normalise the topic into a tag-friendly slug as well.
      const slug = topic.toLowerCase().replace(/\s+/g, "-");

      const exercises = await context.prisma.labExercise.findMany({
        where: {
          isPublished: true,
          OR: [
            { tags: { has: slug } },
            { tags: { has: topic.toLowerCase() } },
            { title: { contains: topic, mode: "insensitive" } },
            { titleAr: { contains: topic, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: { level: "asc" },
        select: {
          id: true,
          type: true,
          level: true,
          title: true,
          titleAr: true,
          estimatedMinutes: true,
        },
      });

      if (exercises.length === 0) {
        return {
          exercises: [],
          message: `No exercises found for "${topic}". Try a broader topic, or browse the lab by skill.`,
        };
      }

      return {
        topic,
        exercises: exercises.map((e) => ({
          id: e.id,
          title: context.locale === "ar" ? e.titleAr : e.title,
          type: e.type,
          level: e.level,
          estimatedMinutes: e.estimatedMinutes,
          link: `/${context.locale}/student/lab/exercise/${e.id}`,
        })),
        count: exercises.length,
      };
    } catch {
      return { error: "Failed to find practice exercises" };
    }
  },
};
