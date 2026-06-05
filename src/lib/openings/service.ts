/**
 * Program Openings — apply-to-teach flow (shared service).
 *
 * Sits UPSTREAM of the existing class-create + teacher-assignment flow and is
 * fully additive: when an admin creates a Program we open it to teach, fan-out
 * a notify() to every active teacher, and let teachers submit an application
 * (creative survey + optional 1-minute voice intro). The admin reviews per
 * opening and selects one teacher.
 *
 * All mutations here are the single source of truth for notify() + audit so the
 * teacher-side and admin-side callers stay thin. Notify is always best-effort:
 * a notification failure must never roll back the state change.
 */
import type { OpeningAudienceType, OpeningMemberSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify, notifyMany } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { resolveOpeningAudience } from "@/lib/openings/audience";

/** Private Supabase Storage bucket for the 1-minute voice intros (PDPL: audio only). */
export const VOICE_BUCKET = "teacher-applications";

/** Client-side recording cap, also re-checked server-side. */
export const VOICE_MAX_SECONDS = 60;
export const VOICE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB — a 60s webm/opus clip is well under this.

/**
 * The creative survey. Stored as answersJson keyed by `id`. We ship thoughtful
 * defaults but the teacher may express freely in the open field. Kept here so
 * the apply form (render) and the admin review (labels) never drift.
 */
// "gmt3" renders as a structured, timezone-explicit availability picker (day
// checkboxes + from/to time) that the apply form serialises into a single clean
// Western-digit string. Admin review + the teacher's read-only view treat it
// like any other answer (label + text), so it surfaces everywhere for free.
export type SurveyQuestionKind = "long" | "short" | "gmt3";
export interface SurveyQuestion {
  id: string;
  kind: SurveyQuestionKind;
  /** i18n keys live under Openings.survey.<id>.{label,hint}. */
  labelKey: string;
  hintKey?: string;
  required: boolean;
}

/** Reserved answersJson key for the structured GMT+3 availability string. */
export const AVAILABILITY_GMT3_KEY = "availabilityGmt3";

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: "philosophy", kind: "long", labelKey: "Openings.survey.philosophy.label", hintKey: "Openings.survey.philosophy.hint", required: true },
  { id: "activity", kind: "long", labelKey: "Openings.survey.activity.label", hintKey: "Openings.survey.activity.hint", required: true },
  { id: "availability", kind: "short", labelKey: "Openings.survey.availability.label", hintKey: "Openings.survey.availability.hint", required: true },
  // Structured, timezone-explicit availability (additive; optional — never blocks
  // submit). Stored in answersJson[AVAILABILITY_GMT3_KEY] alongside the free-text
  // "availability" answer above, which is intentionally kept.
  { id: AVAILABILITY_GMT3_KEY, kind: "gmt3", labelKey: "Openings.survey.availabilityGmt3.label", hintKey: "Openings.survey.availabilityGmt3.hint", required: false },
  { id: "creative", kind: "long", labelKey: "Openings.survey.creative.label", hintKey: "Openings.survey.creative.hint", required: false },
];

export type SurveyAnswers = Record<string, string>;

/** Trim + clamp survey answers to the known questions; drop everything else. */
export function sanitizeAnswers(input: unknown): SurveyAnswers {
  const out: SurveyAnswers = {};
  if (!input || typeof input !== "object") return out;
  const obj = input as Record<string, unknown>;
  for (const q of SURVEY_QUESTIONS) {
    const v = obj[q.id];
    if (typeof v === "string" && v.trim()) out[q.id] = v.trim().slice(0, 4000);
  }
  return out;
}

/** Localised program name helper. */
export function programName(p: { nameEn: string; nameAr: string }, locale: string) {
  return locale === "ar" ? p.nameAr : p.nameEn;
}

// ─────────────────────────── TEACHER FILTER (reusable) ───────────────────────────

/**
 * The reusable teacher-filter criteria. Shared by the targeted-opening audience
 * picker AND (later) class-assignment, so the admin sees ONE consistent filter.
 * All facets optional; an empty filter returns every teacher.
 */
export interface TeacherFilter {
  gender?: "MALE" | "FEMALE" | null;
  /** Match teachers having ANY of these specializations. */
  specializations?: string[];
  /** true = active only, false = inactive only, undefined = either. */
  activeOnly?: boolean;
  /** Minimum rating (0–5). Teachers with null rating are excluded when set. */
  minRating?: number | null;
  /** Maximum current load (totalStudents) — for spreading work fairly. */
  maxLoad?: number | null;
}

/** A teacher row as surfaced in the picker (safe, display-oriented fields). */
export interface TeacherPickRow {
  teacherId: string;
  userId: string;
  name: string;
  nameAr: string | null;
  email: string;
  gender: "MALE" | "FEMALE" | null;
  specializations: string[];
  rating: number | null;
  totalStudents: number;
  active: boolean;
}

/**
 * List teachers matching a filter (reusable picker data source). Read-only.
 * Gender/rating are filtered in SQL where possible; specialization "any-of" is
 * applied in-memory (Postgres array overlap kept simple + portable).
 */
export async function listTeachersForPicker(
  filter: TeacherFilter = {}
): Promise<TeacherPickRow[]> {
  const where: Prisma.TeacherProfileWhereInput = {};
  if (filter.activeOnly === true) where.active = true;
  if (filter.activeOnly === false) where.active = false;
  if (filter.gender) where.gender = filter.gender;
  if (typeof filter.minRating === "number") where.rating = { gte: filter.minRating };
  if (typeof filter.maxLoad === "number") where.totalStudents = { lte: filter.maxLoad };

  const rows = await prisma.teacherProfile.findMany({
    where,
    select: {
      id: true,
      userId: true,
      gender: true,
      specializations: true,
      rating: true,
      totalStudents: true,
      active: true,
      user: { select: { name: true, nameAr: true, email: true } },
    },
    orderBy: [{ active: "desc" }, { totalStudents: "asc" }],
  });

  const wantSpecs = (filter.specializations ?? []).filter(Boolean);
  const filtered =
    wantSpecs.length === 0
      ? rows
      : rows.filter((r) => r.specializations.some((s) => wantSpecs.includes(s)));

  return filtered.map((r) => ({
    teacherId: r.id,
    userId: r.userId,
    name: r.user.name,
    nameAr: r.user.nameAr,
    email: r.user.email,
    gender: (r.gender as "MALE" | "FEMALE" | null) ?? null,
    specializations: r.specializations,
    rating: r.rating != null ? Number(r.rating) : null,
    totalStudents: r.totalStudents,
    active: r.active,
  }));
}

/** Distinct specialization values across all teachers (filter facet options). */
export async function listTeacherSpecializations(): Promise<string[]> {
  const rows = await prisma.teacherProfile.findMany({ select: { specializations: true } });
  const set = new Set<string>();
  for (const r of rows) for (const s of r.specializations) if (s) set.add(s);
  return [...set].sort();
}

/**
 * Preview the NAMED audience an opening will reach — transparency, no black box.
 * Returns resolved teacher + applicant display rows for the current audience
 * (honours the phase). Read-only; used by the admin "preview audience" surface.
 */
export async function previewOpeningAudience(opening: {
  id: string;
  audienceType: OpeningAudienceType;
  applicantsPhaseOpen: boolean;
}): Promise<{
  teachers: { userId: string; name: string; email: string }[];
  applicants: { userId: string; name: string; email: string }[];
}> {
  const resolved = await resolveOpeningAudience(opening);

  const [teachers, applicants] = await Promise.all([
    resolved.teacherUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: resolved.teacherUserIds } },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    resolved.applicantUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: resolved.applicantUserIds } },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    teachers: teachers.map((u) => ({ userId: u.id, name: u.name, email: u.email })),
    applicants: applicants.map((u) => ({ userId: u.id, name: u.name, email: u.email })),
  };
}

// ─────────────────────────── OPEN (on program create) ───────────────────────────

/**
 * Open a freshly-created program to teach and notify its audience.
 *
 * Additive: `audienceType` defaults to ALL_INTERNAL, which preserves the
 * original behaviour exactly — every active teacher is materialised as an
 * audience member and notified. The audience rule (not a blanket broadcast) is
 * the single source of truth for both who-can-see and who-gets-notified.
 *
 * Best-effort end-to-end: any failure is swallowed so it can NEVER fail the
 * caller's program-create transaction. Returns the opening id (or null).
 */
export async function openProgramForApplications(args: {
  programId: string;
  openedByUserId: string | null;
  audienceType?: OpeningAudienceType;
  /** SELECTED_TEACHERS: the explicit teacher ids + the filter snapshot used. */
  audienceConfig?: Prisma.InputJsonValue;
}): Promise<string | null> {
  try {
    const program = await prisma.program.findUnique({
      where: { id: args.programId },
      select: { id: true, nameEn: true, nameAr: true },
    });
    if (!program) return null;

    const audienceType: OpeningAudienceType = args.audienceType ?? "ALL_INTERNAL";

    const opening = await prisma.programOpening.create({
      data: {
        programId: program.id,
        status: "OPEN",
        openedBy: args.openedByUserId ?? undefined,
        audienceType,
        audienceConfig: args.audienceConfig ?? undefined,
        // INTERNAL_THEN_APPLICANTS always starts in phase 1 (internal only).
        applicantsPhaseOpen: false,
      },
      select: { id: true },
    });

    await audit.mutation(
      args.openedByUserId,
      "PROGRAM_OPENING_OPENED",
      "ProgramOpening",
      opening.id,
      { programId: program.id, audienceType }
    );

    // Materialise membership + notify the resolved audience (best-effort).
    try {
      await syncAudienceMembers(opening.id, audienceType, args.audienceConfig);
      await notifyOpeningAudience(opening.id);
    } catch (e) {
      console.error("[openings] audience materialise/notify failed (non-fatal):", e);
    }

    return opening.id;
  } catch (e) {
    console.error("[openings] openProgramForApplications failed (non-fatal):", e);
    return null;
  }
}

// ─────────────────────────── AUDIENCE MEMBERSHIP + NOTIFY ───────────────────────────

/** Parse the teacherIds out of an audienceConfig blob (defensive). */
function teacherIdsFromConfig(config: unknown): string[] {
  if (!config || typeof config !== "object") return [];
  const raw = (config as Record<string, unknown>).teacherIds;
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && x.length > 0))];
}

/**
 * Materialise OpeningAudienceMember rows for an opening's current audience.
 * Idempotent + additive: existing rows (and their notifiedAt ledger) are kept;
 * only missing members are inserted. For SELECTED_TEACHERS the explicit teacher
 * ids come from audienceConfig.teacherIds. Applicant members are only created
 * once the phase actually includes applicants. Returns the count of NEW rows.
 *
 * Note: we never delete members here — a teacher removed from the audience keeps
 * any submitted application valid (handled at the listing/apply layer).
 */
export async function syncAudienceMembers(
  openingId: string,
  audienceType: OpeningAudienceType,
  audienceConfig?: unknown
): Promise<number> {
  const opening = await prisma.programOpening.findUnique({
    where: { id: openingId },
    select: { applicantsPhaseOpen: true },
  });
  if (!opening) return 0;

  // Resolve the eligible user ids for the current phase.
  const resolved = await resolveOpeningAudience({
    id: openingId,
    audienceType,
    applicantsPhaseOpen: opening.applicantsPhaseOpen,
  });

  // Map teacher/applicant USER ids back to profile ids for the member rows.
  const newRows: {
    openingId: string;
    teacherId?: string;
    applicantId?: string;
    source: OpeningMemberSource;
  }[] = [];

  if (resolved.teacherUserIds.length > 0) {
    const teachers = await prisma.teacherProfile.findMany({
      where: { user: { id: { in: resolved.teacherUserIds } } },
      select: { id: true },
    });
    const explicitIds = new Set(
      audienceType === "SELECTED_TEACHERS" ? teacherIdsFromConfig(audienceConfig) : []
    );
    const teacherSource: OpeningMemberSource =
      audienceType === "SELECTED_TEACHERS" ? "SELECTED" : "ALL";
    for (const t of teachers) {
      newRows.push({
        openingId,
        teacherId: t.id,
        source: explicitIds.size > 0 && explicitIds.has(t.id) ? "SELECTED" : teacherSource,
      });
    }
  }

  if (resolved.applicantUserIds.length > 0) {
    const applicants = await prisma.applicantProfile.findMany({
      where: { user: { id: { in: resolved.applicantUserIds } } },
      select: { id: true },
    });
    for (const a of applicants) {
      newRows.push({ openingId, applicantId: a.id, source: "APPLICANT" });
    }
  }

  if (newRows.length === 0) return 0;

  // Insert, skipping any that already exist (preserves the notifiedAt ledger).
  const res = await prisma.openingAudienceMember.createMany({
    data: newRows,
    skipDuplicates: true,
  });
  return res.count;
}

/**
 * Notify the opening's audience — ONLY members with notifiedAt == null (so
 * re-targeting never double-pings). In phase 1, applicants are not members yet,
 * so they are never reached. On phase-2 open, applicants become members and this
 * notifies them THEN (never before). Best-effort; stamps notifiedAt per member.
 */
export async function notifyOpeningAudience(openingId: string): Promise<number> {
  const opening = await prisma.programOpening.findUnique({
    where: { id: openingId },
    select: {
      id: true,
      program: { select: { nameEn: true, nameAr: true } },
    },
  });
  if (!opening) return 0;

  const pending = await prisma.openingAudienceMember.findMany({
    where: { openingId, notifiedAt: null },
    select: {
      id: true,
      teacher: { select: { user: { select: { id: true } } } },
      applicant: { select: { user: { select: { id: true } } } },
    },
  });
  if (pending.length === 0) return 0;

  let notified = 0;
  for (const m of pending) {
    const isApplicant = !!m.applicant;
    const userId = m.teacher?.user.id ?? m.applicant?.user.id ?? null;
    if (!userId) continue;

    // Warm, role-appropriate copy. Applicants get the encouraging portal tone.
    const payload = isApplicant
      ? {
          title: `A teaching opportunity is now open to you — ${opening.program.nameEn}`,
          titleAr: `فرصة تدريس متاحة لك الآن — ${opening.program.nameAr}`,
          body: "A program you can apply to teach has just opened. We'd love to see your application.",
          bodyAr: "تم فتح برنامج يمكنك التقديم لتدريسه. يسعدنا أن نستقبل طلبك.",
          actionUrl: "/applicant/openings",
        }
      : {
          title: `New program open to teach — ${opening.program.nameEn}`,
          titleAr: `برنامج جديد متاح للتدريس — ${opening.program.nameAr}`,
          body: "A new program is open. Apply to teach it now.",
          bodyAr: "تم فتح برنامج جديد. قدّم طلبك للتدريس الآن.",
          actionUrl: `/teacher/openings/${opening.id}`,
        };

    try {
      await notify({
        userId,
        type: "PROGRAM_OPENING_NEW",
        title: payload.title,
        titleAr: payload.titleAr,
        body: payload.body,
        bodyAr: payload.bodyAr,
        channels: ["inApp", "email"],
        actionUrl: payload.actionUrl,
        actionLabel: isApplicant ? "View opportunity" : "Apply to teach",
        actionLabelAr: isApplicant ? "عرض الفرصة" : "قدّم للتدريس",
        refType: "ProgramOpening",
        refId: opening.id,
      });
      notified += 1;
    } catch (e) {
      console.error("[openings] audience notify failed for one member (non-fatal):", e);
    }
  }

  // Stamp the whole pending batch as notified (best-effort, single update).
  try {
    await prisma.openingAudienceMember.updateMany({
      where: { id: { in: pending.map((m) => m.id) } },
      data: { notifiedAt: new Date() },
    });
  } catch (e) {
    console.error("[openings] notifiedAt stamp failed (non-fatal):", e);
  }

  return notified;
}

type ResultOk = { ok: true } | { ok: false; error: string };

/**
 * Change an opening's audience (re-target). Additive widening: updates the
 * audience type/config, materialises any NEWLY-eligible members, and notifies
 * ONLY the newcomers (existing members keep their notifiedAt, so no dup pings).
 * Audited. Never deletes members — submitted applications always stay valid.
 */
export async function setOpeningAudience(args: {
  openingId: string;
  reviewerUserId: string;
  audienceType: OpeningAudienceType;
  audienceConfig?: Prisma.InputJsonValue;
}): Promise<ResultOk> {
  const opening = await prisma.programOpening.findUnique({
    where: { id: args.openingId },
    select: { id: true, status: true },
  });
  if (!opening) return { ok: false, error: "NOT_FOUND" };

  await prisma.programOpening.update({
    where: { id: opening.id },
    data: {
      audienceType: args.audienceType,
      audienceConfig: args.audienceConfig ?? undefined,
    },
  });
  await audit.mutation(
    args.reviewerUserId,
    "PROGRAM_OPENING_AUDIENCE_CHANGED",
    "ProgramOpening",
    opening.id,
    { audienceType: args.audienceType }
  );

  // Materialise + notify only the new members (best-effort).
  try {
    await syncAudienceMembers(opening.id, args.audienceType, args.audienceConfig);
    await notifyOpeningAudience(opening.id);
  } catch (e) {
    console.error("[openings] setOpeningAudience materialise/notify failed (non-fatal):", e);
  }
  return { ok: true };
}

/**
 * Open INTERNAL_THEN_APPLICANTS phase 2: flip applicantsPhaseOpen, stamp
 * internalClosedAt, materialise applicant members, and notify them THEN (never
 * before). Idempotent — re-running only notifies still-un-notified members.
 * The system NEVER calls this on its own; it is an explicit admin action.
 */
export async function openApplicantsPhase(args: {
  openingId: string;
  reviewerUserId: string;
}): Promise<ResultOk> {
  const opening = await prisma.programOpening.findUnique({
    where: { id: args.openingId },
    select: { id: true, status: true, audienceType: true, applicantsPhaseOpen: true },
  });
  if (!opening) return { ok: false, error: "NOT_FOUND" };
  if (opening.audienceType !== "INTERNAL_THEN_APPLICANTS") {
    return { ok: false, error: "NOT_PHASED" };
  }
  if (opening.applicantsPhaseOpen) return { ok: true }; // already in phase 2

  await prisma.programOpening.update({
    where: { id: opening.id },
    data: { applicantsPhaseOpen: true, internalClosedAt: new Date() },
  });
  await audit.mutation(
    args.reviewerUserId,
    "PROGRAM_OPENING_APPLICANTS_PHASE_OPENED",
    "ProgramOpening",
    opening.id
  );

  // Now applicants are eligible — materialise + notify them (best-effort).
  try {
    await syncAudienceMembers(opening.id, opening.audienceType, undefined);
    await notifyOpeningAudience(opening.id);
  } catch (e) {
    console.error("[openings] openApplicantsPhase materialise/notify failed (non-fatal):", e);
  }
  return { ok: true };
}

// ─────────────────────────── ADMIN DECISIONS ───────────────────────────

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Select an applicant: their application → SELECTED, the opening → FILLED, and
 * every other still-pending application on that opening → REJECTED with a polite
 * default note. Notifies the selected teacher (and, by default, the rest).
 * One audit row per state change.
 */
export async function selectApplicant(args: {
  applicationId: string;
  reviewerUserId: string;
  decisionNote?: string;
  notifyOthers?: boolean;
}): Promise<ActionResult> {
  const app = await prisma.teacherApplication.findUnique({
    where: { id: args.applicationId },
    include: {
      teacher: { select: { id: true, userId: true } },
      opening: {
        select: {
          id: true,
          status: true,
          program: { select: { nameEn: true, nameAr: true } },
        },
      },
    },
  });
  if (!app) return { ok: false, error: "NOT_FOUND" };
  if (app.status === "WITHDRAWN") return { ok: false, error: "WITHDRAWN" };
  if (app.opening.status === "FILLED") return { ok: false, error: "ALREADY_FILLED" };

  const now = new Date();
  const note =
    args.decisionNote?.trim() ||
    "Thank you for applying — we've selected another teacher for this program this time.";

  // The other applications to reject (everything not this one, not already withdrawn/rejected).
  const others = await prisma.teacherApplication.findMany({
    where: {
      openingId: app.opening.id,
      id: { not: app.id },
      status: { notIn: ["WITHDRAWN", "REJECTED"] },
    },
    include: { teacher: { select: { userId: true } } },
  });

  // Atomic state transition.
  await prisma.$transaction([
    prisma.teacherApplication.update({
      where: { id: app.id },
      data: { status: "SELECTED", reviewedBy: args.reviewerUserId, reviewedAt: now, decisionNote: args.decisionNote?.trim() || null },
    }),
    prisma.programOpening.update({
      where: { id: app.opening.id },
      data: { status: "FILLED", filledTeacherId: app.teacher.id, closedAt: now },
    }),
    prisma.teacherApplication.updateMany({
      where: { openingId: app.opening.id, id: { not: app.id }, status: { notIn: ["WITHDRAWN", "REJECTED"] } },
      data: { status: "REJECTED", reviewedBy: args.reviewerUserId, reviewedAt: now, decisionNote: note },
    }),
  ]);

  // Audit — one row per logical change.
  await audit.mutation(args.reviewerUserId, "TEACHER_APPLICATION_SELECTED", "TeacherApplication", app.id, { openingId: app.opening.id, teacherId: app.teacher.id });
  await audit.mutation(args.reviewerUserId, "PROGRAM_OPENING_FILLED", "ProgramOpening", app.opening.id, { filledTeacherId: app.teacher.id });
  for (const o of others) {
    await audit.mutation(args.reviewerUserId, "TEACHER_APPLICATION_REJECTED", "TeacherApplication", o.id, { reason: "opening_filled" });
  }

  // Notify selected teacher (best-effort).
  try {
    await notify({
      userId: app.teacher.userId,
      type: "TEACHER_SELECTED",
      title: `You've been selected for ${app.opening.program.nameEn}`,
      titleAr: `تم اختيارك للتدريس في ${app.opening.program.nameAr}`,
      body: "Congratulations! You've been selected to teach this program.",
      bodyAr: "مبارك! تم اختيارك لتدريس هذا البرنامج.",
      channels: ["inApp", "email"],
      actionUrl: "/teacher/openings",
      actionLabel: "View",
      actionLabelAr: "عرض",
      priority: "HIGH",
      refType: "TeacherApplication",
      refId: app.id,
    });
  } catch (e) {
    console.error("[openings] selected-teacher notify failed (non-fatal):", e);
  }

  // Optionally notify the rest (default: yes — closes the loop politely).
  if (args.notifyOthers !== false && others.length > 0) {
    try {
      await notifyMany(
        others.map((o) => o.teacher.userId),
        {
          type: "PROGRAM_OPENING_NEW",
          title: `Update on ${app.opening.program.nameEn}`,
          titleAr: `تحديث بخصوص ${app.opening.program.nameAr}`,
          body: note,
          bodyAr: "شكراً لتقديمك — تم اختيار معلّم آخر لهذا البرنامج هذه المرة.",
          channels: ["inApp"],
          actionUrl: "/teacher/openings",
          refType: "ProgramOpening",
          refId: app.opening.id,
        }
      );
    } catch (e) {
      console.error("[openings] rejected-teachers notify failed (non-fatal):", e);
    }
  }

  return { ok: true };
}

/** Mark an application SHORTLISTED (no notify — internal triage only). */
export async function shortlistApplicant(args: {
  applicationId: string;
  reviewerUserId: string;
}): Promise<ActionResult> {
  const app = await prisma.teacherApplication.findUnique({
    where: { id: args.applicationId },
    select: { id: true, status: true },
  });
  if (!app) return { ok: false, error: "NOT_FOUND" };
  if (app.status === "SELECTED" || app.status === "WITHDRAWN") return { ok: false, error: "INVALID_STATE" };

  await prisma.teacherApplication.update({
    where: { id: app.id },
    data: { status: "SHORTLISTED", reviewedBy: args.reviewerUserId, reviewedAt: new Date() },
  });
  await audit.mutation(args.reviewerUserId, "TEACHER_APPLICATION_SHORTLISTED", "TeacherApplication", app.id);
  return { ok: true };
}

/** Reject a single application with a note (notifies that teacher, best-effort). */
export async function rejectApplicant(args: {
  applicationId: string;
  reviewerUserId: string;
  decisionNote?: string;
}): Promise<ActionResult> {
  const app = await prisma.teacherApplication.findUnique({
    where: { id: args.applicationId },
    include: {
      teacher: { select: { userId: true } },
      opening: { select: { program: { select: { nameEn: true, nameAr: true } } } },
    },
  });
  if (!app) return { ok: false, error: "NOT_FOUND" };
  if (app.status === "SELECTED" || app.status === "WITHDRAWN") return { ok: false, error: "INVALID_STATE" };

  const note = args.decisionNote?.trim() || null;
  await prisma.teacherApplication.update({
    where: { id: app.id },
    data: { status: "REJECTED", reviewedBy: args.reviewerUserId, reviewedAt: new Date(), decisionNote: note },
  });
  await audit.mutation(args.reviewerUserId, "TEACHER_APPLICATION_REJECTED", "TeacherApplication", app.id, { manual: true });

  try {
    await notify({
      userId: app.teacher.userId,
      type: "PROGRAM_OPENING_NEW",
      title: `Update on ${app.opening.program.nameEn}`,
      titleAr: `تحديث بخصوص ${app.opening.program.nameAr}`,
      body: note ?? "Thank you for applying. We won't be moving forward this time.",
      bodyAr: "شكراً لتقديمك. لن نتمكن من المضي قدماً هذه المرة.",
      channels: ["inApp"],
      actionUrl: "/teacher/openings",
      refType: "TeacherApplication",
      refId: app.id,
    });
  } catch (e) {
    console.error("[openings] reject notify failed (non-fatal):", e);
  }
  return { ok: true };
}

/** Re-open a FILLED/CLOSED opening for a new term (clears the fill). */
export async function reopenOpening(args: {
  openingId: string;
  reviewerUserId: string;
}): Promise<ActionResult> {
  const opening = await prisma.programOpening.findUnique({
    where: { id: args.openingId },
    select: { id: true, status: true },
  });
  if (!opening) return { ok: false, error: "NOT_FOUND" };
  if (opening.status === "OPEN") return { ok: false, error: "ALREADY_OPEN" };

  await prisma.programOpening.update({
    where: { id: opening.id },
    data: { status: "OPEN", filledTeacherId: null, closedAt: null },
  });
  await audit.mutation(args.reviewerUserId, "PROGRAM_OPENING_REOPENED", "ProgramOpening", opening.id);
  return { ok: true };
}

/** Close an opening manually (admin decision; flows stay independent of class-create). */
export async function closeOpening(args: {
  openingId: string;
  reviewerUserId: string;
}): Promise<ActionResult> {
  const opening = await prisma.programOpening.findUnique({
    where: { id: args.openingId },
    select: { id: true, status: true },
  });
  if (!opening) return { ok: false, error: "NOT_FOUND" };
  if (opening.status === "CLOSED") return { ok: false, error: "ALREADY_CLOSED" };

  await prisma.programOpening.update({
    where: { id: opening.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  await audit.mutation(args.reviewerUserId, "PROGRAM_OPENING_CLOSED", "ProgramOpening", opening.id);
  return { ok: true };
}

/** A teacher withdraws their own application. */
export async function withdrawApplication(args: {
  applicationId: string;
  teacherUserId: string;
}): Promise<ActionResult> {
  const app = await prisma.teacherApplication.findUnique({
    where: { id: args.applicationId },
    include: { teacher: { select: { userId: true } } },
  });
  if (!app) return { ok: false, error: "NOT_FOUND" };
  if (app.teacher.userId !== args.teacherUserId) return { ok: false, error: "FORBIDDEN" };
  if (app.status === "SELECTED") return { ok: false, error: "ALREADY_SELECTED" };
  if (app.status === "WITHDRAWN") return { ok: true };

  await prisma.teacherApplication.update({
    where: { id: app.id },
    data: { status: "WITHDRAWN" },
  });
  await audit.mutation(args.teacherUserId, "TEACHER_APPLICATION_WITHDRAWN", "TeacherApplication", app.id);
  return { ok: true };
}
