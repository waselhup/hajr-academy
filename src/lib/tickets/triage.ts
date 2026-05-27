/**
 * Sprint 3 — AI ticket triage.
 *
 * Calls Claude Haiku to categorize an incoming support ticket into one
 * of {TECHNICAL, FINANCIAL, PEDAGOGICAL, SUGGESTION, GENERAL} and assign
 * a priority. Falls back to a deterministic keyword regex when the
 * Anthropic API is unavailable or the response cannot be parsed.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { TicketCategory, TicketPriority } from "@prisma/client";

const HAIKU = "claude-haiku-4-5-20251001";

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export interface TriageResult {
  category: TicketCategory;
  priority: TicketPriority;
  aiUsed: boolean;
}

const VALID_CATEGORIES: TicketCategory[] = [
  "TECHNICAL",
  "FINANCIAL",
  "PEDAGOGICAL",
  "SUGGESTION",
  "GENERAL",
];
const VALID_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

/**
 * Deterministic keyword-based fallback. Bilingual (AR + EN).
 * Used when Claude is unavailable, errored, or returned a bad shape.
 */
export function regexTriage(subject: string, body: string): TriageResult {
  const text = `${subject}\n${body}`.toLowerCase();

  let category: TicketCategory = "GENERAL";
  if (/دفع|فاتورة|سداد|payment|invoice|refund|charge|billing|دفعة/i.test(text)) {
    category = "FINANCIAL";
  } else if (
    /زوم|خطأ|عطل|تسجيل دخول|bug|zoom|login|error|crash|تطبيق|broken|offline/i.test(text)
  ) {
    category = "TECHNICAL";
  } else if (
    /واجب|درس|تعليم|معلم|teacher|homework|lesson|grade|assignment|curriculum|pedagog/i.test(text)
  ) {
    category = "PEDAGOGICAL";
  } else if (/اقتراح|فكرة|suggest|idea|feature request|تطوير|تحسين/i.test(text)) {
    category = "SUGGESTION";
  }

  // Priority: keywords like "urgent", "emergency", or financial issues get bumped.
  let priority: TicketPriority = "MEDIUM";
  if (/عاجل|طارئ|urgent|emergency|asap|critical/i.test(text)) {
    priority = "URGENT";
  } else if (category === "FINANCIAL" || category === "TECHNICAL") {
    priority = "HIGH";
  } else if (category === "SUGGESTION") {
    priority = "LOW";
  }

  return { category, priority, aiUsed: false };
}

/**
 * Try Claude first, fall back to regex on any failure.
 */
export async function triageTicket(
  subject: string,
  body: string
): Promise<TriageResult> {
  const fallback = () => regexTriage(subject, body);

  if (!anthropic) return fallback();

  try {
    const sys = `You are a triage assistant for an Arabic/English English-language academy.
Categorize a support ticket into EXACTLY ONE of:
- TECHNICAL    (login, zoom, bugs, app errors, infrastructure)
- FINANCIAL    (payments, invoices, refunds, billing, fees)
- PEDAGOGICAL  (teachers, lessons, homework, curriculum, grades)
- SUGGESTION   (feature requests, ideas, improvements)
- GENERAL      (other)

Also assign priority:
- URGENT  (blocking, payment failure, security)
- HIGH    (major frustration, can't access service)
- MEDIUM  (default for issues)
- LOW     (informational, suggestions)

Respond ONLY with valid JSON: {"category":"...","priority":"..."} — no prose.`;

    const msg = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 100,
      system: sys,
      messages: [
        {
          role: "user",
          content: `Subject: ${subject}\nBody: ${body.slice(0, 1500)}`,
        },
      ],
    });

    const block = msg.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") return fallback();

    // Extract JSON — may be wrapped in code fences.
    const jsonText = block.text.replace(/```(?:json)?/gi, "").trim();
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (!match) return fallback();

    const parsed = JSON.parse(match[0]) as {
      category?: string;
      priority?: string;
    };

    const category = VALID_CATEGORIES.includes(parsed.category as TicketCategory)
      ? (parsed.category as TicketCategory)
      : "GENERAL";
    const priority = VALID_PRIORITIES.includes(parsed.priority as TicketPriority)
      ? (parsed.priority as TicketPriority)
      : "MEDIUM";

    return { category, priority, aiUsed: true };
  } catch (e) {
    console.warn("[tickets/triage] AI failed, regex fallback:", e);
    return fallback();
  }
}
