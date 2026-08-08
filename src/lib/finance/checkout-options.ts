/**
 * The two scheduling answers collected at checkout.
 *
 * Shared by the public form, the checkout API and the admin order views, so
 * a value stored in the database always has a label somewhere to render it.
 * The stored value is the stable key — never the Arabic label, which would
 * make the data untranslatable and unqueryable.
 */

export interface Choice {
  value: string;
  ar: string;
  en: string;
}

/** Saudi school years, plus the cases that fall outside them. */
export const GRADE_LEVELS: Choice[] = [
  { value: "KG", ar: "رياض أطفال", en: "Kindergarten" },
  { value: "P1", ar: "الأول الابتدائي", en: "Grade 1" },
  { value: "P2", ar: "الثاني الابتدائي", en: "Grade 2" },
  { value: "P3", ar: "الثالث الابتدائي", en: "Grade 3" },
  { value: "P4", ar: "الرابع الابتدائي", en: "Grade 4" },
  { value: "P5", ar: "الخامس الابتدائي", en: "Grade 5" },
  { value: "P6", ar: "السادس الابتدائي", en: "Grade 6" },
  { value: "M1", ar: "الأول المتوسط", en: "Grade 7" },
  { value: "M2", ar: "الثاني المتوسط", en: "Grade 8" },
  { value: "M3", ar: "الثالث المتوسط", en: "Grade 9" },
  { value: "S1", ar: "الأول الثانوي", en: "Grade 10" },
  { value: "S2", ar: "الثاني الثانوي", en: "Grade 11" },
  { value: "S3", ar: "الثالث الثانوي", en: "Grade 12" },
  { value: "UNI", ar: "جامعي", en: "University" },
  { value: "ADULT", ar: "خريج / متعلّم كبير", en: "Graduate / adult learner" },
];

/**
 * Teaching windows the academy runs, KSA time.
 *
 * Values are 24-hour ranges so they sort and compare correctly; the labels
 * carry the ص/م wording. Western digits throughout — the platform rule.
 */
export const TIME_WINDOWS: Choice[] = [
  { value: "15:00-17:00", ar: "٣:٠٠ – ٥:٠٠ مساءً", en: "3:00 – 5:00 PM" },
  { value: "18:00-20:00", ar: "٦:٠٠ – ٨:٠٠ مساءً", en: "6:00 – 8:00 PM" },
];

// The bilingual labels above use Arabic-Indic glyphs for readability inside
// running Arabic text; the STORED value is the Western-digit range, which is
// what every table, export and report renders.
export const TIME_WINDOW_LABELS: Record<string, { ar: string; en: string }> = {
  "15:00-17:00": { ar: "3:00 – 5:00 مساءً", en: "3:00 – 5:00 PM" },
  "18:00-20:00": { ar: "6:00 – 8:00 مساءً", en: "6:00 – 8:00 PM" },
};

export const GRADE_VALUES = GRADE_LEVELS.map((g) => g.value);
export const TIME_VALUES = TIME_WINDOWS.map((t) => t.value);

/** Render a stored value for display. Falls back to the raw value so an
 *  older row with an unknown key still shows something truthful. */
export function gradeLabel(value: string | null | undefined, isAr: boolean): string {
  if (!value) return "—";
  const g = GRADE_LEVELS.find((x) => x.value === value);
  return g ? (isAr ? g.ar : g.en) : value;
}

export function timeLabel(value: string | null | undefined, isAr: boolean): string {
  if (!value) return "—";
  const t = TIME_WINDOW_LABELS[value];
  return t ? (isAr ? t.ar : t.en) : value;
}
