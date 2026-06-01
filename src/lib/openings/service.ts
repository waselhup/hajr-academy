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
import { prisma } from "@/lib/prisma";
import { notify, notifyMany } from "@/lib/notify";
import { audit } from "@/lib/audit";

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
export type SurveyQuestionKind = "long" | "short";
export interface SurveyQuestion {
  id: string;
  kind: SurveyQuestionKind;
  /** i18n keys live under Openings.survey.<id>.{label,hint}. */
  labelKey: string;
  hintKey?: string;
  required: boolean;
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: "philosophy", kind: "long", labelKey: "Openings.survey.philosophy.label", hintKey: "Openings.survey.philosophy.hint", required: true },
  { id: "activity", kind: "long", labelKey: "Openings.survey.activity.label", hintKey: "Openings.survey.activity.hint", required: true },
  { id: "availability", kind: "short", labelKey: "Openings.survey.availability.label", hintKey: "Openings.survey.availability.hint", required: true },
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

// ─────────────────────────── OPEN (on program create) ───────────────────────────

/**
 * Open a freshly-created program to teach and notify every active teacher.
 * Best-effort end-to-end: any failure is swallowed so it can NEVER fail the
 * caller's program-create transaction. Returns the opening id (or null).
 */
export async function openProgramForApplications(args: {
  programId: string;
  openedByUserId: string | null;
}): Promise<string | null> {
  try {
    const program = await prisma.program.findUnique({
      where: { id: args.programId },
      select: { id: true, nameEn: true, nameAr: true },
    });
    if (!program) return null;

    const opening = await prisma.programOpening.create({
      data: {
        programId: program.id,
        status: "OPEN",
        openedBy: args.openedByUserId ?? undefined,
      },
      select: { id: true },
    });

    await audit.mutation(
      args.openedByUserId,
      "PROGRAM_OPENING_OPENED",
      "ProgramOpening",
      opening.id,
      { programId: program.id }
    );

    // Fan-out to all active teachers — best-effort, isolated from the above.
    try {
      const teachers = await prisma.teacherProfile.findMany({
        where: { active: true, user: { isActive: true } },
        select: { user: { select: { id: true } } },
      });
      const userIds = teachers.map((t) => t.user.id);
      if (userIds.length > 0) {
        await notifyMany(userIds, {
          type: "PROGRAM_OPENING_NEW",
          title: `New program open to teach — ${program.nameEn}`,
          titleAr: `برنامج جديد متاح للتدريس — ${program.nameAr}`,
          body: "A new program is open. Apply to teach it now.",
          bodyAr: "تم فتح برنامج جديد. قدّم طلبك للتدريس الآن.",
          channels: ["inApp", "email"],
          actionUrl: `/teacher/openings/${opening.id}`,
          actionLabel: "Apply to teach",
          actionLabelAr: "قدّم للتدريس",
          refType: "ProgramOpening",
          refId: opening.id,
        });
      }
    } catch (e) {
      console.error("[openings] teacher fan-out notify failed (non-fatal):", e);
    }

    return opening.id;
  } catch (e) {
    console.error("[openings] openProgramForApplications failed (non-fatal):", e);
    return null;
  }
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
