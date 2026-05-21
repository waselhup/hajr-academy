import Anthropic from "@anthropic-ai/sdk";
import type { AgentTool, AgentContext } from "@/lib/agent/types";

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

/**
 * Public assistant tool: a student asks why an answer was wrong —
 * e.g. "Explain why my answer is incorrect". Given a question ID, the
 * tool fetches it and produces a clear explanation in the student's
 * language.
 */
export const explainQuestion: AgentTool = {
  name: "explain_question",
  description:
    "Explain a STEP test-bank question — why the correct answer is correct and why a given wrong answer is incorrect. Provide questionId; optionally the student's wrong answer.",
  input_schema: {
    type: "object",
    properties: {
      questionId: {
        type: "string",
        description: "The TestQuestion ID to explain",
      },
      studentAnswer: {
        type: "string",
        description: "The answer the student chose (optional)",
      },
    },
    required: ["questionId"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const questionId =
        typeof input.questionId === "string" ? input.questionId : undefined;
      if (!questionId) {
        return { error: "questionId is required" };
      }

      const question = await context.prisma.testQuestion.findUnique({
        where: { id: questionId },
      });
      if (!question) {
        return { error: "Question not found" };
      }

      const studentAnswer =
        typeof input.studentAnswer === "string" ? input.studentAnswer : null;

      // If a stored explanation exists, prefer it (no AI cost).
      const stored =
        context.locale === "ar"
          ? question.explanationAr ?? question.explanation
          : question.explanation;

      if (stored && !studentAnswer) {
        return {
          questionText: question.questionText,
          explanation: stored,
          correctAnswer: question.correctAnswer,
          source: "stored",
        };
      }

      // Otherwise, generate a tailored explanation.
      if (!anthropic) {
        return {
          questionText: question.questionText,
          explanation:
            stored ??
            "Explanation is unavailable right now. Please ask your teacher.",
          correctAnswer: question.correctAnswer,
          source: "fallback",
        };
      }

      const lang = context.locale === "ar" ? "Arabic" : "English";
      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: `You are a patient English teacher. Explain clearly in ${lang}, at a level a STEP test student understands. Be concise (3-5 sentences).`,
        messages: [
          {
            role: "user",
            content: [
              `Question: ${question.questionText}`,
              question.passage ? `Passage: ${question.passage}` : "",
              `Options: ${JSON.stringify(question.options)}`,
              `Correct answer: ${JSON.stringify(question.correctAnswer)}`,
              studentAnswer ? `The student chose: ${studentAnswer}` : "",
              studentAnswer
                ? "Explain why the correct answer is right and why the student's choice is wrong."
                : "Explain why the correct answer is right.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      });

      const explanation =
        res.content[0]?.type === "text" ? res.content[0].text : stored ?? "";

      return {
        questionText: question.questionText,
        explanation,
        correctAnswer: question.correctAnswer,
        source: "generated",
      };
    } catch {
      return { error: "Failed to explain the question" };
    }
  },
};
