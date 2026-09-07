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
 * Teaching hours the academy runs, KSA time — 3:00 PM to 9:00 PM.
 *
 * ONE HOUR each, and the buyer may tick several.
 *
 * These used to be two two-hour blocks ("3–5" and "6–8"), which told the
 * buyer the lesson lasted two hours. It does not, and a customer who believes
 * it does has been mis-sold before the first class. Single hours also give the
 * scheduler something it can actually use: a family that can do 4, 5 or 7 is
 * placeable, while a family that ticked "3–5" is not.
 *
 * Values are 24-hour ranges so they sort and compare as strings; the labels
 * carry the ص/م wording. Western digits throughout — the platform rule.
 */
export const TIME_WINDOWS: Choice[] = [
  { value: "15:00-16:00", ar: "3:00 – 4:00 مساءً", en: "3:00 – 4:00 PM" },
  { value: "16:00-17:00", ar: "4:00 – 5:00 مساءً", en: "4:00 – 5:00 PM" },
  { value: "17:00-18:00", ar: "5:00 – 6:00 مساءً", en: "5:00 – 6:00 PM" },
  { value: "18:00-19:00", ar: "6:00 – 7:00 مساءً", en: "6:00 – 7:00 PM" },
  { value: "19:00-20:00", ar: "7:00 – 8:00 مساءً", en: "7:00 – 8:00 PM" },
  { value: "20:00-21:00", ar: "8:00 – 9:00 مساءً", en: "8:00 – 9:00 PM" },
];

/**
 * Labels for display, keyed by stored value.
 *
 * Includes the two retired two-hour blocks: orders placed before the change
 * still hold them, and a past order must keep rendering the window the
 * customer actually chose rather than a dash.
 */
export const TIME_WINDOW_LABELS: Record<string, { ar: string; en: string }> = {
  ...Object.fromEntries(TIME_WINDOWS.map((t) => [t.value, { ar: t.ar, en: t.en }])),
  // Retired — kept so historical rows still read correctly.
  "15:00-17:00": { ar: "3:00 – 5:00 مساءً", en: "3:00 – 5:00 PM" },
  "18:00-20:00": { ar: "6:00 – 8:00 مساءً", en: "6:00 – 8:00 PM" },
};

export const GRADE_VALUES = GRADE_LEVELS.map((g) => g.value);
export const TIME_VALUES = TIME_WINDOWS.map((t) => t.value);

/**
 * Several chosen hours travel in one string column, comma-separated.
 *
 * A Postgres array column was the obvious alternative and is the wrong tool
 * here: added through `db push` it arrives with no default, so every insert
 * that omits it fails with P2011 — the trap that broke convert-to-teacher.
 * A comma-joined list needs no migration, and every existing single-value row
 * is already a valid list of one.
 */
export const TIME_SEPARATOR = ",";

export function parseTimes(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(TIME_SEPARATOR)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function serializeTimes(values: string[]): string {
  // Stored in the order the hours run, not the order they were clicked, so
  // two families who chose the same hours produce the same string.
  const order = new Map(TIME_VALUES.map((v, i) => [v, i]));
  return [...new Set(values)]
    .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
    .join(TIME_SEPARATOR);
}

/** Render a stored value for display. Falls back to the raw value so an
 *  older row with an unknown key still shows something truthful. */
export function gradeLabel(value: string | null | undefined, isAr: boolean): string {
  if (!value) return "—";
  const g = GRADE_LEVELS.find((x) => x.value === value);
  return g ? (isAr ? g.ar : g.en) : value;
}

/**
 * Render one or several stored hours.
 *
 * Handles a bare single value as well as a comma-separated list, so it works
 * unchanged on rows written before multi-select existed. An unknown key falls
 * through as its raw value rather than a dash — a truthful "18:00-20:00"
 * beats a "—" that hides what the customer picked.
 */
export function timeLabel(value: string | null | undefined, isAr: boolean): string {
  const parts = parseTimes(value);
  if (parts.length === 0) return "—";
  return parts
    .map((p) => {
      const t = TIME_WINDOW_LABELS[p];
      return t ? (isAr ? t.ar : t.en) : p;
    })
    .join(isAr ? " • " : " • ");
}
