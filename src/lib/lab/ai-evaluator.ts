/**
 * AI evaluation service for the English Lab.
 *
 * Wraps the Anthropic SDK with specialised, JSON-strict prompts for
 * evaluating speaking, writing, and essay submissions. Multiple-choice
 * and listening grading is pure JS (no AI cost).
 *
 * Design notes:
 * - Haiku for short submissions (< 200 words), Sonnet for detailed analysis.
 * - Every result is parsed defensively with a fallback shape.
 * - If the Anthropic API key is missing or the call fails, evaluation
 *   returns { needsManualReview: true } instead of throwing — the UI
 *   then shows "Manual review pending" (spec quality rule #13).
 * - Identical submissions are cached by content hash (in-memory).
 */
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-6";

// Anthropic pricing (USD per 1M tokens) — mirrors lib/agent/types.ts PRICING.
const PRICING: Record<string, { input: number; output: number }> = {
  [SONNET]: { input: 3.0, output: 15.0 },
  [HAIKU]: { input: 1.0, output: 5.0 },
};

export interface EvaluationUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface WritingEvaluation {
  score: number;
  breakdown: {
    taskResponse: number;
    coherence: number;
    vocabulary: number;
    grammar: number;
  };
  feedback: string;
  feedbackEn: string;
  correctedText: string;
  suggestions: string[];
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  needsManualReview?: boolean;
  usage?: EvaluationUsage;
}

export interface SpeakingEvaluation {
  score: number;
  fluency: number;
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  feedback: string;
  feedbackEn: string;
  suggestions: string[];
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  needsManualReview?: boolean;
  usage?: EvaluationUsage;
}

export interface ListeningResult {
  total: number;
  correct: number;
  score: number;
  perQuestion: { questionId: string; selected: string; correct: string; isCorrect: boolean }[];
}

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────

const cache = new Map<string, unknown>();

function hashInput(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function cost(model: string, inT: number, outT: number): number {
  const p = PRICING[model] ?? PRICING[HAIKU];
  return (inT * p.input + outT * p.output) / 1_000_000;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Extract the first JSON object from a model response, tolerating prose around it. */
function parseJsonBlock(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampScore(n: unknown, max = 100): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, Math.round(v * 100) / 100));
}

function asCefr(v: unknown): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  const s = String(v).toUpperCase();
  return (["A1", "A2", "B1", "B2", "C1", "C2"].includes(s) ? s : "B1") as
    | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
}

async function callModel(
  model: string,
  system: string,
  userContent: string
): Promise<{ text: string; usage: EvaluationUsage } | null> {
  if (!anthropic) return null;
  try {
    const res = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userContent }],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "";
    return {
      text,
      usage: {
        model,
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        costUsd: cost(model, res.usage.input_tokens, res.usage.output_tokens),
      },
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Writing / Essay evaluation
// ──────────────────────────────────────────────────────────────

const WRITING_SYSTEM = `You are an expert English teacher evaluating a student's writing for the Saudi STEP test.

CRITERIA:
1. Task Response (does it answer the prompt?)
2. Coherence & Cohesion (logical flow, linking words)
3. Vocabulary (range, accuracy)
4. Grammar (range, accuracy)

Return JSON ONLY in this exact format, with no text before or after:
{
  "score": <0-100>,
  "breakdown": {
    "taskResponse": <0-25>,
    "coherence": <0-25>,
    "vocabulary": <0-25>,
    "grammar": <0-25>
  },
  "feedback": "<2-3 sentences in Arabic>",
  "feedbackEn": "<2-3 sentences in English>",
  "correctedText": "<the same essay with corrections applied>",
  "suggestions": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "cefrLevel": "<A1|A2|B1|B2|C1|C2>"
}

Be honest but constructive. Match feedback complexity to the student's level.`;

function writingFallback(text: string): WritingEvaluation {
  return {
    score: 0,
    breakdown: { taskResponse: 0, coherence: 0, vocabulary: 0, grammar: 0 },
    feedback: "تعذّر إجراء التقييم الآلي الآن. سيقوم المعلّم بمراجعة إجابتك.",
    feedbackEn: "Automatic evaluation is unavailable right now. A teacher will review your work.",
    correctedText: text,
    suggestions: [],
    cefrLevel: "B1",
    needsManualReview: true,
  };
}

function normalizeWriting(obj: Record<string, unknown>, text: string): WritingEvaluation {
  const b = (obj.breakdown ?? {}) as Record<string, unknown>;
  return {
    score: clampScore(obj.score),
    breakdown: {
      taskResponse: clampScore(b.taskResponse, 25),
      coherence: clampScore(b.coherence, 25),
      vocabulary: clampScore(b.vocabulary, 25),
      grammar: clampScore(b.grammar, 25),
    },
    feedback: typeof obj.feedback === "string" ? obj.feedback : "",
    feedbackEn: typeof obj.feedbackEn === "string" ? obj.feedbackEn : "",
    correctedText: typeof obj.correctedText === "string" ? obj.correctedText : text,
    suggestions: Array.isArray(obj.suggestions) ? obj.suggestions.map(String).slice(0, 5) : [],
    cefrLevel: asCefr(obj.cefrLevel),
  };
}

/**
 * Evaluate a writing or essay submission. Short pieces use Haiku; longer or
 * essay-style pieces use Sonnet for a more detailed analysis.
 */
export async function evaluateWriting(
  text: string,
  prompt: string,
  rubric: string[],
  level: string
): Promise<WritingEvaluation> {
  const key = hashInput(["writing", text, prompt, level]);
  const cached = cache.get(key);
  if (cached) return cached as WritingEvaluation;

  const model = wordCount(text) < 200 ? HAIKU : SONNET;
  const userContent = [
    `STUDENT LEVEL: ${level}`,
    `PROMPT: ${prompt}`,
    `RUBRIC FOCUS: ${rubric.join(", ")}`,
    `STUDENT WRITING:`,
    text,
  ].join("\n\n");

  const result = await callModel(model, WRITING_SYSTEM, userContent);
  if (!result) {
    return writingFallback(text);
  }

  const parsed = parseJsonBlock(result.text);
  if (!parsed) {
    return writingFallback(text);
  }

  const evaluation = normalizeWriting(parsed, text);
  evaluation.usage = result.usage;
  cache.set(key, evaluation);
  return evaluation;
}

/** Detailed STEP-style essay evaluation. Always uses Sonnet. */
export async function evaluateEssay(
  text: string,
  prompt: string,
  level: string
): Promise<WritingEvaluation> {
  const key = hashInput(["essay", text, prompt, level]);
  const cached = cache.get(key);
  if (cached) return cached as WritingEvaluation;

  const userContent = [
    `STUDENT LEVEL: ${level}`,
    `THIS IS A STEP EXAM ESSAY. Evaluate strictly against STEP writing standards.`,
    `PROMPT: ${prompt}`,
    `STUDENT ESSAY:`,
    text,
  ].join("\n\n");

  const result = await callModel(SONNET, WRITING_SYSTEM, userContent);
  if (!result) {
    return writingFallback(text);
  }

  const parsed = parseJsonBlock(result.text);
  if (!parsed) {
    return writingFallback(text);
  }

  const evaluation = normalizeWriting(parsed, text);
  evaluation.usage = result.usage;
  cache.set(key, evaluation);
  return evaluation;
}

// ──────────────────────────────────────────────────────────────
// Speaking evaluation
// ──────────────────────────────────────────────────────────────

const SPEAKING_SYSTEM = `You are an expert English speaking examiner evaluating a student's spoken response for the Saudi STEP test. You are given a TRANSCRIPT of what the student said.

CRITERIA:
1. Fluency (smoothness, pace, hesitation)
2. Pronunciation (clarity — judged from likely transcript accuracy)
3. Grammar (accuracy and range)
4. Vocabulary (range and appropriacy)

Return JSON ONLY in this exact format, with no text before or after:
{
  "score": <0-100>,
  "fluency": <0-100>,
  "pronunciation": <0-100>,
  "grammar": <0-100>,
  "vocabulary": <0-100>,
  "feedback": "<2-3 sentences in Arabic>",
  "feedbackEn": "<2-3 sentences in English>",
  "suggestions": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "cefrLevel": "<A1|A2|B1|B2|C1|C2>"
}

Be honest but encouraging. Match feedback complexity to the student's level.`;

function speakingFallback(): SpeakingEvaluation {
  return {
    score: 0,
    fluency: 0,
    pronunciation: 0,
    grammar: 0,
    vocabulary: 0,
    feedback: "تعذّر إجراء التقييم الآلي الآن. سيقوم المعلّم بمراجعة تسجيلك.",
    feedbackEn: "Automatic evaluation is unavailable right now. A teacher will review your recording.",
    suggestions: [],
    cefrLevel: "B1",
    needsManualReview: true,
  };
}

/**
 * Evaluate a speaking submission from its transcript.
 * Short responses use Haiku; longer ones use Sonnet.
 */
export async function evaluateSpeaking(
  transcript: string,
  targetText: string,
  level: string
): Promise<SpeakingEvaluation> {
  const key = hashInput(["speaking", transcript, targetText, level]);
  const cached = cache.get(key);
  if (cached) return cached as SpeakingEvaluation;

  if (!transcript.trim()) {
    return speakingFallback();
  }

  const model = wordCount(transcript) < 200 ? HAIKU : SONNET;
  const userContent = [
    `STUDENT LEVEL: ${level}`,
    `EXPECTED / MODEL ANSWER (for reference only): ${targetText}`,
    `STUDENT TRANSCRIPT:`,
    transcript,
  ].join("\n\n");

  const result = await callModel(model, SPEAKING_SYSTEM, userContent);
  if (!result) {
    return speakingFallback();
  }

  const parsed = parseJsonBlock(result.text);
  if (!parsed) {
    return speakingFallback();
  }

  const evaluation: SpeakingEvaluation = {
    score: clampScore(parsed.score),
    fluency: clampScore(parsed.fluency),
    pronunciation: clampScore(parsed.pronunciation),
    grammar: clampScore(parsed.grammar),
    vocabulary: clampScore(parsed.vocabulary),
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    feedbackEn: typeof parsed.feedbackEn === "string" ? parsed.feedbackEn : "",
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map(String).slice(0, 5)
      : [],
    cefrLevel: asCefr(parsed.cefrLevel),
    usage: result.usage,
  };
  cache.set(key, evaluation);
  return evaluation;
}

// ──────────────────────────────────────────────────────────────
// Multiple-choice & listening grading (pure JS, no AI)
// ──────────────────────────────────────────────────────────────

/** Compare a single answer to the correct one. No AI needed. */
export function evaluateMultipleChoice(answer: unknown, correct: unknown): boolean {
  if (Array.isArray(correct) && Array.isArray(answer)) {
    if (correct.length !== answer.length) return false;
    const a = [...answer].map(String).sort();
    const c = [...correct].map(String).sort();
    return a.every((v, i) => v === c[i]);
  }
  return String(answer).trim().toLowerCase() === String(correct).trim().toLowerCase();
}

/**
 * Grade a set of listening answers against the correct answers.
 * `answers` is { questionId -> selected }, `correctMap` is { questionId -> correct }.
 */
export function gradeListening(
  answers: Record<string, string>,
  correctMap: Record<string, string>
): ListeningResult {
  const ids = Object.keys(correctMap);
  const perQuestion = ids.map((qid) => {
    const selected = answers[qid] ?? "";
    const correct = correctMap[qid];
    return {
      questionId: qid,
      selected,
      correct,
      isCorrect: evaluateMultipleChoice(selected, correct),
    };
  });
  const correctCount = perQuestion.filter((q) => q.isCorrect).length;
  const total = ids.length;
  return {
    total,
    correct: correctCount,
    score: total > 0 ? Math.round((correctCount / total) * 10000) / 100 : 0,
    perQuestion,
  };
}

/** Whether AI evaluation is currently available (key configured). */
export function isAiEvaluationAvailable(): boolean {
  return anthropic !== null;
}
