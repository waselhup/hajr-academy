import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { getParentProfileId, getChildSkillLevels } from "@/lib/parent/children";
import { resolveChildForParent } from "@/lib/parent/resolve-child";

/**
 * Parent tool — "كيف وضع ابني في الـ Speaking؟"
 * / "How is my child doing in Speaking?"
 */
export const getChildProgress: AgentTool = {
  name: "get_child_progress",
  description:
    "Get a parent's child's English Lab progress — CEFR levels per skill (Speaking, Listening, Reading, Writing, Grammar, Vocabulary). Optionally filter to one skill. Requires PARENT authentication.",
  input_schema: {
    type: "object",
    properties: {
      childName: {
        type: "string",
        description:
          "The child's name. Optional if the parent has only one child.",
      },
      skill: {
        type: "string",
        description:
          "Optional skill filter: SPEAKING, LISTENING, READING, WRITING, GRAMMAR, VOCABULARY.",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (!context.userId || context.userRole !== "PARENT") {
        return {
          error:
            "This feature is for parents only. / هذه الميزة لأولياء الأمور فقط.",
        };
      }

      const parentId = await getParentProfileId(context.userId);
      if (!parentId) {
        return { error: "Parent profile not found. / لم يتم العثور على الملف." };
      }

      const child = await resolveChildForParent(
        parentId,
        typeof input.childName === "string" ? input.childName : undefined
      );
      if ("error" in child) return child;

      const skills = await getChildSkillLevels(child.studentId);
      const filter =
        typeof input.skill === "string"
          ? input.skill.trim().toUpperCase()
          : null;
      const filtered = filter
        ? skills.filter((s) => s.skill === filter)
        : skills;

      return {
        childName: child.name,
        skills: filtered.map((s) => ({
          skill: s.skill,
          level: s.currentLevel,
          points: s.totalPoints,
          attempts: s.totalAttempts,
        })),
      };
    } catch (error) {
      return {
        error: `Failed to get progress: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
