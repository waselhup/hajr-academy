import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const explainEnglish: AgentTool = {
  name: "explain_english",
  description:
    "Get English grammar or vocabulary explanation (does not query DB)",
  input_schema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description:
          "The grammar or vocabulary topic to explain, e.g. 'present perfect tense', 'articles a/an/the', 'phrasal verbs with get'",
      },
      level: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced"],
        description:
          "Student's English level to calibrate the explanation (default: beginner)",
      },
      language: {
        type: "string",
        enum: ["ar", "en"],
        description:
          "Language for the explanation: 'ar' for Arabic, 'en' for English (default: ar)",
      },
    },
    required: ["topic"],
  },

  handler: async (
    input: Record<string, unknown>,
    _context: AgentContext
  ): Promise<unknown> => {
    try {
      const topic =
        typeof input.topic === "string" ? input.topic.trim() : "";
      const level =
        typeof input.level === "string"
          ? input.level.trim()
          : "beginner";
      const language =
        typeof input.language === "string"
          ? input.language.trim()
          : "ar";

      if (!topic) {
        return {
          error:
            "Please specify the English topic you want explained. / يرجى تحديد الموضوع الذي تريد شرحه.",
        };
      }

      const validLevels = ["beginner", "intermediate", "advanced"];
      const validLanguages = ["ar", "en"];

      return {
        topic,
        level: validLevels.includes(level) ? level : "beginner",
        language: validLanguages.includes(language) ? language : "ar",
        instruction:
          "Please explain this English language topic to the student at the appropriate level. Use clear examples, and if the language is Arabic, explain in Arabic with English examples. Keep the explanation educational and encouraging.",
      };
    } catch (error) {
      return {
        error: `Failed to process topic: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
