/**
 * Placement scoring + CEFR mapping + program recommendations.
 *
 * Pure functions — no DB access. Persistence happens in API routes.
 */
import type { CefrLevel, PlacementVariant, PackageType } from "@prisma/client";

export type Question = {
  id: string;
  textEn: string;
  textAr: string;
  options: Array<{ en: string; ar: string }>;
  correct: number;
  points: number;
  audioUrl?: string | null;
};

export type SectionScore = {
  sectionId: string;
  type: string;
  titleEn: string;
  titleAr: string;
  score: number;
  max: number;
  percent: number;
};

export type ScoredAttempt = {
  score: number;
  maxScore: number;
  percent: number;
  cefrLevel: CefrLevel;
  sectionBreakdown: Record<string, SectionScore>;
};

export type Recommendation = {
  programCode: string;
  packageType: PackageType;
  confidence: number;
  reasonEn: string;
  reasonAr: string;
};

/**
 * Score one attempt across all sections.
 *
 * Inputs:
 *   sections — array of { id, type, titleEn, titleAr, questions, maxScore }
 *   answers  — { [sectionId]: { [questionId]: number } }
 */
export function scoreAttempt(
  sections: Array<{
    id: string;
    type: string;
    titleEn: string;
    titleAr: string;
    questions: Question[];
    maxScore: number;
  }>,
  answers: Record<string, Record<string, number>>
): ScoredAttempt {
  const breakdown: Record<string, SectionScore> = {};
  let totalScore = 0;
  let totalMax = 0;

  for (const s of sections) {
    let sec = 0;
    let max = 0;
    const sectionAnswers = answers[s.id] ?? {};
    for (const q of s.questions) {
      max += q.points;
      const a = sectionAnswers[q.id];
      if (typeof a === "number" && a === q.correct) {
        sec += q.points;
      }
    }
    const percent = max > 0 ? (sec / max) * 100 : 0;
    breakdown[s.id] = {
      sectionId: s.id,
      type: s.type,
      titleEn: s.titleEn,
      titleAr: s.titleAr,
      score: sec,
      max,
      percent: Math.round(percent * 100) / 100,
    };
    totalScore += sec;
    totalMax += max;
  }

  const overall = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  return {
    score: totalScore,
    maxScore: totalMax,
    percent: Math.round(overall * 100) / 100,
    cefrLevel: percentToCefr(overall),
    sectionBreakdown: breakdown,
  };
}

export function percentToCefr(pct: number): CefrLevel {
  if (pct >= 90) return "C2";
  if (pct >= 80) return "C1";
  if (pct >= 65) return "B2";
  if (pct >= 50) return "B1";
  if (pct >= 35) return "A2";
  return "A1";
}

/**
 * Recommend up to 3 programs ranked by confidence. Variant biases the
 * package mix (STEP_PREP/IELTS_PREP get pushed up if the user took the
 * matching test).
 */
export function recommendPrograms(
  cefr: CefrLevel,
  variant: PlacementVariant
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (cefr === "A1" || cefr === "A2") {
    recs.push({
      programCode: "ENGLISH_LAB",
      packageType: "ESSENTIAL",
      confidence: 0.95,
      reasonEn: "Build foundations with English Lab + Essential package.",
      reasonAr: "بناء الأساسيات مع مختبر اللغة وباقة Essential.",
    });
  } else if (cefr === "B1") {
    recs.push({
      programCode: "UNI_PREP",
      packageType: "INTEGRATED",
      confidence: 0.85,
      reasonEn: "Integrated package matches your intermediate level.",
      reasonAr: "باقة Integrated تناسب مستواك المتوسط.",
    });
  } else if (cefr === "B2") {
    recs.push({
      programCode: "UNI_PREP",
      packageType: "INTEGRATED",
      confidence: 0.8,
      reasonEn: "Integrated package + targeted test prep.",
      reasonAr: "باقة Integrated مع تحضير موجّه للاختبار.",
    });
    if (variant === "STEP_PREP" || variant === "IELTS_PREP") {
      recs.push({
        programCode: "STEP_PREP",
        packageType: variant === "STEP_PREP" ? "STEP_PREP_PKG" : "IELTS_PREP_PKG",
        confidence: 0.9,
        reasonEn: `Your ${variant === "STEP_PREP" ? "STEP" : "IELTS"} prep package.`,
        reasonAr: `باقة تحضير ${variant === "STEP_PREP" ? "ستيب" : "آيلتس"} المناسبة لك.`,
      });
    }
  } else {
    // C1 / C2
    recs.push({
      programCode: "PRIVATE",
      packageType: "PRIVATE",
      confidence: 0.85,
      reasonEn: "Private package to push toward fluency.",
      reasonAr: "باقة خاصة للوصول إلى الطلاقة.",
    });
    if (variant === "STEP_PREP" || variant === "IELTS_PREP") {
      recs.push({
        programCode: "STEP_PREP",
        packageType: variant === "STEP_PREP" ? "STEP_PREP_PKG" : "IELTS_PREP_PKG",
        confidence: 0.95,
        reasonEn: `Specialized ${variant === "STEP_PREP" ? "STEP" : "IELTS"} preparation for your level.`,
        reasonAr: `تحضير متخصص لـ ${variant === "STEP_PREP" ? "ستيب" : "آيلتس"} مناسب لمستواك.`,
      });
    }
  }

  // Always offer English Lab as a safety net up to B1.
  if ((cefr === "B1" || cefr === "A1" || cefr === "A2") && recs.length < 3) {
    recs.push({
      programCode: "ENGLISH_LAB",
      packageType: "ESSENTIAL",
      confidence: 0.6,
      reasonEn: "English Lab strengthens fundamentals at your own pace.",
      reasonAr: "مختبر اللغة يدعم الأساسيات بإيقاعك.",
    });
  }

  return recs.slice(0, 3);
}
