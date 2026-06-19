// Lab Studio v2 — block engine.
// An exercise's `content` JSON is { version: 2, instructions?, blocks: Block[] }.
// One exercise = an ordered list of blocks the teacher mixes freely (e.g. a
// reading PASSAGE + a few MCQ, or a listening MEDIA clip + FILL_BLANK).
// Objective blocks auto-grade; SHORT_TEXT/RECORD go to AI/teacher review.
import { z } from "zod";

export type BlockKind =
  | "PASSAGE"
  | "MEDIA"
  | "MCQ"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "WORD_ORDER"
  | "MATCHING"
  | "SHORT_TEXT"
  | "RECORD";

export const OBJECTIVE_KINDS: BlockKind[] = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "WORD_ORDER", "MATCHING"];
export const SUBJECTIVE_KINDS: BlockKind[] = ["SHORT_TEXT", "RECORD"];
export const DISPLAY_KINDS: BlockKind[] = ["PASSAGE", "MEDIA"];

export const isObjective = (k: BlockKind) => OBJECTIVE_KINDS.includes(k);
export const isSubjective = (k: BlockKind) => SUBJECTIVE_KINDS.includes(k);
export const isGradable = (k: BlockKind) => isObjective(k) || isSubjective(k);

// ─── Zod schemas (validated server-side on save) ───
const base = { id: z.string().min(1), points: z.number().int().min(0).max(100).optional() };

const zPassage = z.object({ ...base, kind: z.literal("PASSAGE"), text: z.string().min(1), textAr: z.string().optional() });
const zMedia = z.object({
  ...base, kind: z.literal("MEDIA"),
  mediaKind: z.enum(["AUDIO", "VIDEO"]),
  path: z.string().min(1), fileName: z.string().optional(), mimeType: z.string().optional(), durationSec: z.number().optional(),
});
const zMcq = z.object({
  ...base, kind: z.literal("MCQ"),
  prompt: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2).max(8),
  correctOptionId: z.string().min(1),
  explanation: z.string().optional(),
});
const zTrueFalse = z.object({ ...base, kind: z.literal("TRUE_FALSE"), prompt: z.string().min(1), answer: z.boolean(), explanation: z.string().optional() });
const zFillBlank = z.object({
  ...base, kind: z.literal("FILL_BLANK"),
  // text uses {{1}} {{2}} markers for gaps
  text: z.string().min(1),
  blanks: z.array(z.object({ index: z.number().int().min(1), accept: z.array(z.string().min(1)).min(1) })).min(1),
});
const zWordOrder = z.object({ ...base, kind: z.literal("WORD_ORDER"), prompt: z.string().optional(), tokens: z.array(z.string().min(1)).min(2).max(20) });
const zMatching = z.object({
  ...base, kind: z.literal("MATCHING"),
  prompt: z.string().optional(),
  pairs: z.array(z.object({ id: z.string().min(1), left: z.string().min(1), right: z.string().min(1) })).min(2).max(10),
});
const zShortText = z.object({ ...base, kind: z.literal("SHORT_TEXT"), prompt: z.string().min(1), minWords: z.number().int().optional(), maxWords: z.number().int().optional() });
const zRecord = z.object({ ...base, kind: z.literal("RECORD"), prompt: z.string().min(1), mediaKind: z.enum(["AUDIO", "VIDEO"]).default("AUDIO"), targetText: z.string().optional() });

export const blockSchema = z.discriminatedUnion("kind", [
  zPassage, zMedia, zMcq, zTrueFalse, zFillBlank, zWordOrder, zMatching, zShortText, zRecord,
]);
export type Block = z.infer<typeof blockSchema>;

export const labContentSchema = z.object({
  version: z.literal(2),
  instructions: z.string().optional(),
  blocks: z.array(blockSchema).min(1).max(40),
});
export type LabContent = z.infer<typeof labContentSchema>;

/** Block 'kind' is present and equals 2 → new block engine; else legacy content. */
export function isBlockContent(content: unknown): content is LabContent {
  return !!content && typeof content === "object" && (content as any).version === 2 && Array.isArray((content as any).blocks);
}

// ─── Builder metadata (labels/icons for the "Add block" menu) ───
export const BLOCK_META: Record<BlockKind, { en: string; ar: string; icon: string; hint: string }> = {
  PASSAGE:    { en: "Reading passage", ar: "نص للقراءة",        icon: "BookOpen",     hint: "A text students read (no answer)" },
  MEDIA:      { en: "Audio / Video",   ar: "صوت / فيديو",        icon: "Headphones",   hint: "A clip to listen to or watch" },
  MCQ:        { en: "Multiple choice",  ar: "اختيار من متعدد",   icon: "ListChecks",   hint: "One correct option" },
  TRUE_FALSE: { en: "True / False",     ar: "صح / خطأ",           icon: "ToggleLeft",   hint: "A statement that is true or false" },
  FILL_BLANK: { en: "Fill the blanks",  ar: "املأ الفراغات",     icon: "TextCursorInput", hint: "Use {{1}}, {{2}} for gaps" },
  WORD_ORDER: { en: "Word order",       ar: "ترتيب الكلمات",     icon: "ArrowRightLeft", hint: "Students reorder scrambled words" },
  MATCHING:   { en: "Matching pairs",   ar: "توصيل",             icon: "Link2",        hint: "Match left items to right items" },
  SHORT_TEXT: { en: "Writing",          ar: "كتابة",             icon: "PenLine",      hint: "Open answer (AI / teacher graded)" },
  RECORD:     { en: "Speaking",         ar: "تحدّث",             icon: "Mic",          hint: "Student records audio/video" },
};

/** Sum of objective points (used as the exercise's auto-graded max). */
export function objectivePoints(blocks: Block[]): number {
  return blocks.filter((b) => isObjective(b.kind)).reduce((s, b) => s + (b.points ?? 1), 0);
}

/** Normalise a typed answer for tolerant comparison (case, spaces, AR diacritics). */
export function normalizeAnswer(s: string): string {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // Arabic diacritics + tatweel
    .replace(/[.,!?;:'"()\-_]/g, "")
    .replace(/\s+/g, " ");
}
