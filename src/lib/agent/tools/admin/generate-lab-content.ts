import Anthropic from "@anthropic-ai/sdk";
import type { AgentTool, AgentContext } from "@/lib/agent/types";

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

/**
 * Admin agent tool: draft a new English Lab exercise on a given topic
 * and level — e.g. "Write a B2 Reading exercise about Vision 2030".
 * Returns exercise content as JSON for the admin to review and save;
 * it does NOT auto-create the exercise.
 */
export const generateLabContent: AgentTool = {
  name: "generate_lab_content",
  description:
    "Draft a new English Lab exercise on a topic and CEFR level. Returns ready-to-review exercise content (title, content JSON). Does not save it — the admin reviews and creates it via the lab UI.",
  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["READING", "GRAMMAR", "VOCABULARY", "WRITING", "LISTENING", "SPEAKING"],
        description: "Exercise type",
      },
      level: {
        type: "string",
        enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
        description: "CEFR level",
      },
      topic: {
        type: "string",
        description: "Topic or theme for the exercise",
      },
    },
    required: ["type", "level", "topic"],
  },

  handler: async (input: Record<string, unknown>): Promise<unknown> => {
    try {
      const type = typeof input.type === "string" ? input.type : "READING";
      const level = typeof input.level === "string" ? input.level : "B1";
      const topic =
        typeof input.topic === "string" ? input.topic : "general English";

      if (!anthropic) {
        return {
          error:
            "AI content generation is unavailable (no API key configured). Create the exercise manually in the lab UI.",
        };
      }

      const system = `You are an expert ESL curriculum designer creating exercises for the Saudi STEP test platform "Hajr Academy".

Create a ${type} exercise at CEFR level ${level} on the topic: "${topic}".

Return ONLY valid JSON in this exact shape (no prose):
{
  "title": "<English title>",
  "titleAr": "<Arabic title>",
  "description": "<one-line English description>",
  "descriptionAr": "<one-line Arabic description>",
  "estimatedMinutes": <number>,
  "content": { ... type-specific content ... }
}

Content shape by type:
- READING: { "text": "<200-400 word passage>", "questions": [{"id":"q1","question":"...","options":[{"id":"a","text":"..."},...],"correct":"a"}] } (5 questions)
- GRAMMAR/VOCABULARY: { "instructions":"...", "items":[{"id":"q1","question":"...","options":[{"id":"a","text":"..."},...],"correct":"a"}] } (8 items)
- WRITING: { "prompt":"...", "minWords":<n>, "maxWords":<n>, "rubric":["...","..."] }
- LISTENING: { "transcript":"...", "questions":[{"id":"q1","question":"...","options":[...],"correct":"a"}] }
- SPEAKING: { "prompt":"...", "targetText":"<model answer>", "scoringCriteria":["..."] }

Use real, level-appropriate English. For Saudi cultural relevance where natural.`;

      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system,
        messages: [
          {
            role: "user",
            content: `Generate the ${type} exercise about "${topic}" at level ${level}.`,
          },
        ],
      });

      const text = res.content[0]?.type === "text" ? res.content[0].text : "";
      let draft: unknown;
      try {
        draft = JSON.parse(text);
      } catch {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        draft =
          start >= 0 && end > start
            ? JSON.parse(text.slice(start, end + 1))
            : null;
      }

      if (!draft) {
        return { error: "Could not generate valid exercise content. Try again." };
      }

      return {
        draft,
        type,
        level,
        topic,
        note: "Review this draft and create the exercise in the lab UI. It is not yet saved.",
      };
    } catch {
      return { error: "Failed to generate lab content" };
    }
  },
};
