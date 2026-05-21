import type { AgentTool, AgentContext } from "@/lib/agent/types";

/**
 * Admin agent tool: identify the weakest topics in the STEP test bank —
 * questions that students answer incorrectly most often. Useful for
 * spotting poorly-worded questions or genuinely hard topics.
 */
export const queryWeakTopics: AgentTool = {
  name: "query_weak_topics",
  description:
    "Find the weakest topics in the STEP test bank — questions students get wrong most often. Returns topics ranked by accuracy, with attempt counts. Optionally filter by section.",
  input_schema: {
    type: "object",
    properties: {
      section: {
        type: "string",
        enum: ["READING", "LISTENING", "GRAMMAR", "VOCABULARY", "WRITING"],
        description: "Filter to a single test section",
      },
      limit: { type: "number", description: "Maximum topics (default 10)" },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const section =
        typeof input.section === "string" ? input.section : undefined;
      const limit =
        typeof input.limit === "number" ? Math.min(input.limit, 30) : 10;

      const where: Record<string, unknown> = { totalAttempts: { gt: 0 } };
      if (section) where.section = section;

      const questions = await context.prisma.testQuestion.findMany({
        where,
        select: {
          topic: true,
          section: true,
          totalAttempts: true,
          correctAttempts: true,
        },
      });

      // Aggregate accuracy per topic.
      const byTopic = new Map<
        string,
        { section: string; attempts: number; correct: number }
      >();
      for (const q of questions) {
        const key = q.topic ?? "Untagged";
        const agg = byTopic.get(key) ?? {
          section: q.section,
          attempts: 0,
          correct: 0,
        };
        agg.attempts += q.totalAttempts;
        agg.correct += q.correctAttempts;
        byTopic.set(key, agg);
      }

      const topics = [...byTopic.entries()]
        .map(([topic, agg]) => ({
          topic,
          section: agg.section,
          totalAttempts: agg.attempts,
          accuracy:
            agg.attempts > 0
              ? Math.round((agg.correct / agg.attempts) * 10000) / 100
              : 0,
        }))
        .filter((t) => t.totalAttempts > 0)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, limit);

      return {
        weakestTopics: topics,
        count: topics.length,
        note:
          topics.length === 0
            ? "No attempt data yet — topics need student attempts before accuracy can be measured."
            : undefined,
        filters: { section },
      };
    } catch {
      return { error: "Failed to query weak topics" };
    }
  },
};
