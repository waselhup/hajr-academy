/**
 * The Language Exchange Programme's entry criteria, in one place.
 *
 * The public form, the API validator and the admin review screen all read
 * these — so an option can never exist on the form but be rejected by the
 * server, and a stored value can never render as a raw enum in the admin's
 * inbox.
 */

/** 12–45, per the owner's published criteria. */
export const MIN_AGE = 12;
export const MAX_AGE = 45;

/**
 * Minimum A2. The programme is an EXCHANGE, not a native-speaker volunteer
 * pool — a learner who can hold a basic conversation qualifies, which is why
 * A2 is on the list at all.
 */
export const ENGLISH_LEVELS = ["A2", "B1", "B2", "C1_C2"] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export const ENGLISH_LEVEL_LABEL: Record<
  EnglishLevel,
  { en: string; ar: string }
> = {
  A2: {
    en: "A2 (Elementary) — can hold basic, everyday conversations",
    ar: "A2 (مبتدئ) — أستطيع إجراء محادثات يومية بسيطة",
  },
  B1: {
    en: "B1 (Intermediate) — can express opinions and discuss familiar topics",
    ar: "B1 (متوسط) — أستطيع التعبير عن رأيي ومناقشة مواضيع مألوفة",
  },
  B2: {
    en: "B2 (Upper-Intermediate) — fluent in most discussions",
    ar: "B2 (فوق المتوسط) — أتحدث بطلاقة في معظم النقاشات",
  },
  C1_C2: {
    en: "C1/C2 (Advanced / Proficient) — highly fluent",
    ar: "C1/C2 (متقدم) — طلاقة عالية",
  },
};

/**
 * Availability is captured in GMT/UTC, not the applicant's local time.
 *
 * Applicants are worldwide; "evening" means nothing to the admin pairing them
 * with a Saudi student unless it is anchored to a shared clock.
 */
export const AVAILABILITY_WINDOWS = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHT",
] as const;
export type AvailabilityWindow = (typeof AVAILABILITY_WINDOWS)[number];

export const AVAILABILITY_LABEL: Record<
  AvailabilityWindow,
  { en: string; ar: string; range: string }
> = {
  MORNING: { en: "Morning", ar: "صباحاً", range: "08:00 – 12:00 GMT" },
  AFTERNOON: { en: "Afternoon", ar: "ظهراً", range: "12:00 – 16:00 GMT" },
  EVENING: { en: "Evening", ar: "مساءً", range: "16:00 – 20:00 GMT" },
  NIGHT: { en: "Night", ar: "ليلاً", range: "20:00 – 00:00 GMT" },
};

export const GENDERS = ["MALE", "FEMALE"] as const;
export const GENDER_LABEL: Record<string, { en: string; ar: string }> = {
  MALE: { en: "Male", ar: "ذكر" },
  FEMALE: { en: "Female", ar: "أنثى" },
};

/** Render stored values for the admin inbox, tolerating legacy blanks. */
export function levelLabel(v: string | null | undefined, isAr: boolean): string {
  if (!v) return "—";
  const l = ENGLISH_LEVEL_LABEL[v as EnglishLevel];
  return l ? (isAr ? l.ar : l.en) : v;
}

export function windowsLabel(
  v: string[] | null | undefined,
  isAr: boolean
): string {
  if (!v || v.length === 0) return "—";
  return v
    .map((w) => {
      const l = AVAILABILITY_LABEL[w as AvailabilityWindow];
      return l ? `${isAr ? l.ar : l.en} (${l.range})` : w;
    })
    .join(isAr ? "، " : ", ");
}

export function genderLabel(v: string | null | undefined, isAr: boolean): string {
  if (!v) return "—";
  const l = GENDER_LABEL[v];
  return l ? (isAr ? l.ar : l.en) : v;
}

/**
 * A Telegram identity is a @username OR a phone number — the two look nothing
 * alike, so one permissive rule beats two strict ones that each reject half
 * the real answers. Usernames are 5–32 chars of letters/digits/underscore per
 * Telegram's own rule; a phone is digits with an optional +.
 */
export const TELEGRAM_PATTERN = /^(@?[A-Za-z][A-Za-z0-9_]{4,31}|\+?[0-9][0-9\s\-().]{5,})$/;

export function isValidTelegram(v: string): boolean {
  return TELEGRAM_PATTERN.test(v.trim());
}

/** Strip a leading @ so the stored value is canonical. */
export function normalizeTelegram(v: string): string {
  return v.trim().replace(/^@+/, "");
}

/**
 * Deep link for the admin inbox. Telegram resolves t.me/<username> but has no
 * reliable link for a bare phone number, so that case returns null and the
 * admin sees plain text instead of a link that would 404.
 */
export function telegramLink(v: string | null | undefined): string | null {
  if (!v) return null;
  const handle = normalizeTelegram(v);
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(handle)
    ? `https://t.me/${handle}`
    : null;
}
