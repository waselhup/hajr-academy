import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { ensureSkillLevels } from "@/lib/lab/recommender";

/**
 * Public assistant tool: a student asks about their own English skill
 * levels — e.g. "What's my level in Grammar?"
 */
export const getMySkillLevels: AgentTool = {
  name: "get_my_skill_levels",
  description:
    "Get the logged-in student's English skill levels across all six skills (Speaking, Listening, Writing, Reading, Grammar, Vocabulary). Requires authentication as STUDENT.",
  input_schema: {
    type: "object",
    properties: {
      skill: {
        type: "string",
        enum: ["SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY"],
        description: "Optionally ask about just one skill",
      },
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
            "You must be logged in to see your skill levels. / يجب تسجيل الدخول لعرض مستوياتك.",
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

      const levels = await ensureSkillLevels(student.id);
      const skill = typeof input.skill === "string" ? input.skill : undefined;
      const filtered = skill
        ? levels.filter((l) => l.skill === skill)
        : levels;

      return {
        skillLevels: filtered.map((l) => ({
          skill: l.skill,
          level: l.currentLevel,
          confidence: Number(l.confidence),
          totalAttempts: l.totalAttempts,
          totalPoints: l.totalPoints,
        })),
        note:
          filtered.every((l) => l.totalAttempts === 0)
            ? "No lab attempts yet — complete exercises to build your skill profile."
            : undefined,
      };
    } catch {
      return { error: "Failed to get skill levels" };
    }
  },
};
