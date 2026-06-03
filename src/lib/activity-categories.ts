/**
 * Activity segmentation — maps raw AuditLog `action` strings onto a small set
 * of human-facing categories so the admin Activity view can be filtered by
 * area instead of showing one undifferentiated firehose.
 *
 * Shared by the /api/admin/activity route (for server-side filtering) and the
 * client (for tab labels + colour). Classification is prefix/keyword based so
 * new action verbs fall into a sensible bucket without code changes; anything
 * unmatched lands in "other".
 */

export const ACTIVITY_CATEGORIES = [
  "accounts", // logins, registrations, profile + role changes
  "classes", // class lifecycle, attendance, schedule, trials, openings
  "assignments", // assignments, submissions, grading, placement, exams
  "finance", // payments, invoices, refunds, payouts, commissions, promos
  "content", // library, resources, certificates, blackboards, test bank
  "tickets", // support tickets
  "comms", // contact requests, messages, notifications, parent reports
  "other", // everything else
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/**
 * Substring rules, evaluated in order — first match wins. Kept as plain
 * substrings (not regex) so they read like a glossary and are cheap to test.
 */
const RULES: { cat: ActivityCategory; needles: string[] }[] = [
  {
    cat: "finance",
    needles: [
      "PAYMENT",
      "INVOICE",
      "REFUND",
      "PAYOUT",
      "COMMISSION",
      "PROMO",
      "SUBSCRIPTION",
      "ORDER",
      "EARNING",
      "BANK",
      "RATE_UPDATED",
    ],
  },
  {
    cat: "assignments",
    needles: [
      "ASSIGNMENT",
      "SUBMISSION",
      "SUBMITTED",
      "GRADED",
      "GRADE",
      "PLACEMENT",
      "EXAM",
    ],
  },
  {
    cat: "classes",
    needles: [
      "CLASS",
      "ATTENDANCE",
      "SCHEDULE",
      "TRIAL",
      "OPENING",
      "ENROLL",
      "ENROLLMENT",
      "ZOOM",
      "MEETING",
      "SPEAKING_CLUB",
      "TECH_CHECK",
      "TEACHER_ASSIGNED",
      "STUDENT_TRANSFERRED",
      "CALENDAR",
    ],
  },
  {
    cat: "content",
    needles: [
      "LIBRARY",
      "RESOURCE",
      "CERTIFICATE",
      "BLACKBOARD",
      "TEST_BANK",
      "QUESTION",
      "LAB",
    ],
  },
  { cat: "tickets", needles: ["TICKET"] },
  {
    cat: "comms",
    needles: [
      "CONTACT",
      "MESSAGE",
      "NOTIFICATION",
      "PARENT_REPORT",
      "PARENT_INVITE",
      "TEMPLATE",
      "BROADCAST",
    ],
  },
  {
    cat: "accounts",
    needles: [
      "LOGIN",
      "LOGOUT",
      "REGISTER",
      "REGISTERED",
      "USER_",
      "PROFILE",
      "PASSWORD",
      "ROLE",
      "TEACHER_APPLICATION",
      "APPLICANT",
      "MARKETER",
      "STUDENT_CREATED",
      "ACCOUNT",
    ],
  },
];

/** Classify an AuditLog action string into an ActivityCategory. */
export function categorizeAction(action: string): ActivityCategory {
  const a = action.toUpperCase();
  for (const rule of RULES) {
    if (rule.needles.some((n) => a.includes(n))) return rule.cat;
  }
  return "other";
}

/**
 * Prisma `action` filter for a category — an OR of `contains` clauses so the
 * DB does the narrowing. Returns null for "all" / "other" (handled in code,
 * since "other" is the negation of every rule and not expressible cheaply).
 */
export function categoryActionFilter(
  category: string | null | undefined
): { contains: string; mode: "insensitive" }[] | null {
  if (!category || category === "all" || category === "other") return null;
  const rule = RULES.find((r) => r.cat === category);
  if (!rule) return null;
  return rule.needles.map((n) => ({ contains: n, mode: "insensitive" as const }));
}
