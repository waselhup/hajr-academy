/**
 * AI Lesson Summary engine.
 *
 * Given a ClassSession id, loads the session + teacher notes + attendance
 * + class context, calls Claude Haiku to generate a structured bilingual
 * summary (3-sentence summary AR+EN, key vocab w/ Arabic translation,
 * grammar points, homework, teacher actions, confidence), then upserts
 * into LessonSummary.
 *
 * Failure-isolated: callers should swallow errors so they don't break
 * webhooks. Output schema is JSON-validated; on parse failure we still
 * persist a generic fallback so the session isn't left dangling.
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5-20251001";

type VocabItem = { term: string; translationAr: string; example: string };
type GrammarItem = { point: string; example: string };

interface RawSummary {
  summaryEn: string;
  summaryAr: string;
  keyVocab: VocabItem[];
  grammarPoints: GrammarItem[];
  homework: string;
  homeworkAr: string;
  teacherActions: string;
  teacherActionsAr: string;
  confidence: number;
}

function buildPrompt(input: {
  className: string;
  classNameAr: string | null;
  teacherName: string;
  durationMin: number;
  attendanceCount: number;
  notes: string;
  transcript: string | null;
}): string {
  const context = input.transcript
    ? `Full transcript:\n${input.transcript}`
    : input.notes
    ? `Teacher's notes:\n${input.notes}`
    : `(No transcript or teacher notes available. Generate a generic but useful summary based on class name, duration, and attendance.)`;

  return [
    `You are summarizing an English lesson for Hajr Academy.`,
    ``,
    `Class: ${input.className}${input.classNameAr ? ` / ${input.classNameAr}` : ""}`,
    `Teacher: ${input.teacherName}`,
    `Duration (minutes): ${input.durationMin}`,
    `Students attended: ${input.attendanceCount}`,
    ``,
    context,
    ``,
    `From the above, produce a JSON object with this exact schema:`,
    `{`,
    `  "summaryEn": "3-sentence English summary of the lesson",`,
    `  "summaryAr": "3-sentence Arabic summary of the lesson",`,
    `  "keyVocab": [{ "term": "...", "translationAr": "...", "example": "..." }],  // 3-5 items`,
    `  "grammarPoints": [{ "point": "...", "example": "..." }],  // 2-3 items`,
    `  "homework": "Homework recommendation in English",`,
    `  "homeworkAr": "نفسه بالعربية",`,
    `  "teacherActions": "Action items for next class in English",`,
    `  "teacherActionsAr": "نفسه بالعربية",`,
    `  "confidence": 0.85`,
    `}`,
    ``,
    `Output ONLY the JSON object. No prose, no markdown fences. Confidence is a decimal 0..1 reflecting how grounded the summary is in the provided material.`,
  ].join("\n");
}

function tryParseJson(text: string): RawSummary | null {
  // Strip markdown fences if model added them.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.summaryEn === "string" &&
      typeof parsed.summaryAr === "string"
    ) {
      return parsed as RawSummary;
    }
  } catch {
    // fall through
  }
  return null;
}

function fallbackSummary(input: {
  className: string;
  classNameAr: string | null;
  attendanceCount: number;
  durationMin: number;
}): RawSummary {
  const nameAr = input.classNameAr ?? input.className;
  return {
    summaryEn: `Lesson "${input.className}" was conducted with ${input.attendanceCount} student(s) attending. The session ran for approximately ${input.durationMin} minutes. Detailed AI summary unavailable for this session.`,
    summaryAr: `تمت حصة "${nameAr}" بحضور ${input.attendanceCount} طالب. استمرت الجلسة حوالي ${input.durationMin} دقيقة. الملخص المفصل غير متاح لهذه الحصة.`,
    keyVocab: [],
    grammarPoints: [],
    homework: "Review today's class notes and prepare questions for next session.",
    homeworkAr: "راجع ملاحظات حصة اليوم وحضّر الأسئلة للجلسة القادمة.",
    teacherActions: "Add session notes after class to enable a richer AI summary.",
    teacherActionsAr: "أضف ملاحظات الجلسة بعد الحصة لتمكين ملخص ذكي أكثر تفصيلاً.",
    confidence: 0.1,
  };
}

export async function generateLessonSummary(
  sessionId: string,
  opts: { generatedById?: string | null } = {}
): Promise<{ id: string; confidence: number }> {
  const cs = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
      attendances: { where: { status: { in: ["PRESENT", "LATE"] } } },
      lessonSummary: true,
    },
  });
  if (!cs) throw new Error(`ClassSession not found: ${sessionId}`);

  // If a summary already exists with high confidence, skip regen unless explicit.
  const durationMin =
    cs.startedAt && cs.endedAt
      ? Math.round((cs.endedAt.getTime() - cs.startedAt.getTime()) / 60000)
      : 60;

  const teacherName =
    cs.class.teacher.user.nameAr ?? cs.class.teacher.user.name ?? "Teacher";
  const className = cs.class.name;
  const classNameAr = cs.class.nameAr ?? null;
  const attendanceCount = cs.attendances.length;

  // Pull a transcript if previously stored.
  const transcript = cs.lessonSummary?.transcript ?? null;
  // Strip our reminder tags from notes before sending to Claude.
  const notes = (cs.notes ?? "")
    .replace(/\[reminded:24h\]/g, "")
    .replace(/\[reminded:1h\]/g, "")
    .trim();

  let raw: RawSummary;
  try {
    const prompt = buildPrompt({
      className,
      classNameAr,
      teacherName,
      durationMin,
      attendanceCount,
      notes,
      transcript,
    });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text =
      resp.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n")
        .trim() ?? "";
    raw = tryParseJson(text) ?? fallbackSummary({
      className,
      classNameAr,
      attendanceCount,
      durationMin,
    });
  } catch (e) {
    console.error("[lesson-summary] Claude call failed:", e);
    raw = fallbackSummary({
      className,
      classNameAr,
      attendanceCount,
      durationMin,
    });
  }

  const saved = await prisma.lessonSummary.upsert({
    where: { sessionId },
    create: {
      sessionId,
      summaryEn: raw.summaryEn,
      summaryAr: raw.summaryAr,
      keyVocab: raw.keyVocab as any,
      grammarPoints: raw.grammarPoints as any,
      homework: raw.homework,
      homeworkAr: raw.homeworkAr,
      teacherActions: raw.teacherActions,
      teacherActionsAr: raw.teacherActionsAr,
      confidence: raw.confidence,
      generatedById: opts.generatedById ?? null,
    },
    update: {
      summaryEn: raw.summaryEn,
      summaryAr: raw.summaryAr,
      keyVocab: raw.keyVocab as any,
      grammarPoints: raw.grammarPoints as any,
      homework: raw.homework,
      homeworkAr: raw.homeworkAr,
      teacherActions: raw.teacherActions,
      teacherActionsAr: raw.teacherActionsAr,
      confidence: raw.confidence,
      generatedById: opts.generatedById ?? null,
      generatedAt: new Date(),
    },
    select: { id: true, confidence: true },
  });

  return {
    id: saved.id,
    confidence: saved.confidence ? Number(saved.confidence) : 0,
  };
}

/**
 * Fire-and-forget wrapper. Safe to call from webhooks.
 */
export function enqueueLessonSummary(sessionId: string): void {
  generateLessonSummary(sessionId).catch((e) =>
    console.error("[lesson-summary] async generation failed:", sessionId, e)
  );
}
