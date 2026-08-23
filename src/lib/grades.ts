/**
 * School grade levels offered at checkout.
 *
 * Values are stored as-is on PurchaseOrder.gradeLevel and copied to
 * StudentProfile.gradeLevel when an admin provisions the account. Numeric
 * values ("1".."12") are what the rest of the app already expects — e.g.
 * the library age-tier logic runs parseInt() over gradeLevel.
 */
export type GradeOption = { value: string; ar: string; en: string };

export const GRADE_OPTIONS: GradeOption[] = [
  { value: "1", ar: "الصف الأول الابتدائي", en: "Grade 1" },
  { value: "2", ar: "الصف الثاني الابتدائي", en: "Grade 2" },
  { value: "3", ar: "الصف الثالث الابتدائي", en: "Grade 3" },
  { value: "4", ar: "الصف الرابع الابتدائي", en: "Grade 4" },
  { value: "5", ar: "الصف الخامس الابتدائي", en: "Grade 5" },
  { value: "6", ar: "الصف السادس الابتدائي", en: "Grade 6" },
  { value: "7", ar: "الأول المتوسط", en: "Grade 7" },
  { value: "8", ar: "الثاني المتوسط", en: "Grade 8" },
  { value: "9", ar: "الثالث المتوسط", en: "Grade 9" },
  { value: "10", ar: "الأول الثانوي", en: "Grade 10" },
  { value: "11", ar: "الثاني الثانوي", en: "Grade 11" },
  { value: "12", ar: "الثالث الثانوي", en: "Grade 12" },
  { value: "UNIVERSITY", ar: "جامعي", en: "University" },
  { value: "ADULT", ar: "بالغ / غير ذلك", en: "Adult / other" },
];

export const GRADE_VALUES = GRADE_OPTIONS.map((g) => g.value) as [string, ...string[]];

/** Human label for a stored grade value; falls back to the raw value. */
export function gradeLabel(value: string | null | undefined, isAr: boolean): string | null {
  if (!value) return null;
  const found = GRADE_OPTIONS.find((g) => g.value === value);
  if (!found) return value;
  return isAr ? found.ar : found.en;
}
