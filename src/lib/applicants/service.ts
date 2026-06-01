/**
 * Applicant Portal — shared service (single source of truth).
 *
 * An APPLICANT is an isolated, admin-gated account for a PROSPECTIVE teacher.
 * They are NOT a teacher: they never touch TeacherProfile or any teacher/
 * student/finance data until an admin runs convertToTeacher(). Their portal is
 * a dedicated minimal shell whose nav + page guards are driven entirely by
 * ApplicantFeatureAccess rows.
 *
 * Gating model: a stage unlocks a DEFAULT feature bundle; the admin may then
 * toggle ANY single feature on/off ABOVE the stage (admin override wins). All
 * mutations here own notify() + audit() so callers (signup, admin actions,
 * portal pages) stay thin. Notify is always best-effort — a notification
 * failure must never roll back a state change.
 */
import { prisma } from "@/lib/prisma";
import { notify, notifyAdmins } from "@/lib/notify";
import { audit } from "@/lib/audit";
import type { ApplicantFeature, ApplicantStage, Prisma } from "@prisma/client";

/** Private Supabase Storage bucket for recorded demo lessons (mirror of teacher-applications). */
export const APPLICANT_DEMO_BUCKET = "applicant-demos";
export const DEMO_MAX_BYTES = 200 * 1024 * 1024; // 200 MB — a short recorded lesson.

/** The full ordered feature set (also the nav order in the portal shell). */
export const ALL_FEATURES: ApplicantFeature[] = [
  "OVERVIEW",
  "OPENINGS",
  "MESSAGING",
  "MEETINGS",
  "TEST",
  "DEMO_RECORDING",
];

/** Seeded-on-signup defaults — Overview, Openings, Messaging are always on. */
export const DEFAULT_FEATURES: ApplicantFeature[] = ["OVERVIEW", "OPENINGS", "MESSAGING"];

/** Ordered stages (drives the Overview progress strip + admin advance control). */
export const STAGE_ORDER: ApplicantStage[] = [
  "NEW",
  "MESSAGING",
  "INTERVIEW",
  "TESTING",
  "DEMO",
  "DECISION",
];

/**
 * Default feature bundle unlocked when an applicant ENTERS a stage. Cumulative
 * by intent (later stages keep earlier unlocks). The admin can always add more
 * on top; setStage only ever ENABLES a stage's bundle — it never revokes a
 * feature an admin opened manually (admin override wins).
 */
export const STAGE_FEATURE_BUNDLE: Record<ApplicantStage, ApplicantFeature[]> = {
  NEW: ["OVERVIEW", "OPENINGS", "MESSAGING"],
  MESSAGING: ["OVERVIEW", "OPENINGS", "MESSAGING"],
  INTERVIEW: ["OVERVIEW", "OPENINGS", "MESSAGING", "MEETINGS"],
  TESTING: ["OVERVIEW", "OPENINGS", "MESSAGING", "MEETINGS", "TEST"],
  DEMO: ["OVERVIEW", "OPENINGS", "MESSAGING", "MEETINGS", "TEST", "DEMO_RECORDING"],
  DECISION: ["OVERVIEW", "OPENINGS", "MESSAGING", "MEETINGS", "TEST", "DEMO_RECORDING"],
};

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Ensure a feature-access row exists for every feature for this applicant,
 * seeding `enabled` from the provided set. Idempotent: existing rows are left
 * untouched (so we never clobber an admin's manual toggle). Used at signup and
 * as a self-heal before reading access.
 */
export async function ensureFeatureRows(
  applicantId: string,
  enabledFeatures: ApplicantFeature[] = DEFAULT_FEATURES
): Promise<void> {
  const existing = await prisma.applicantFeatureAccess.findMany({
    where: { applicantId },
    select: { feature: true },
  });
  const have = new Set(existing.map((r) => r.feature));
  const toCreate = ALL_FEATURES.filter((f) => !have.has(f));
  if (toCreate.length === 0) return;
  await prisma.applicantFeatureAccess.createMany({
    data: toCreate.map((feature) => ({
      applicantId,
      feature,
      enabled: enabledFeatures.includes(feature),
      enabledAt: enabledFeatures.includes(feature) ? new Date() : null,
    })),
    skipDuplicates: true,
  });
}

/** Resolve the set of ENABLED features for an applicant (self-heals missing rows). */
export async function getEnabledFeatures(
  applicantId: string
): Promise<Set<ApplicantFeature>> {
  await ensureFeatureRows(applicantId);
  const rows = await prisma.applicantFeatureAccess.findMany({
    where: { applicantId, enabled: true },
    select: { feature: true },
  });
  return new Set(rows.map((r) => r.feature));
}

/** Whether a single feature is enabled for an applicant (server-side page guard). */
export async function isFeatureEnabled(
  applicantId: string,
  feature: ApplicantFeature
): Promise<boolean> {
  // OVERVIEW is the always-on home; treat it as enabled even if a row lags.
  if (feature === "OVERVIEW") return true;
  const row = await prisma.applicantFeatureAccess.findUnique({
    where: { applicantId_feature: { applicantId, feature } },
    select: { enabled: true },
  });
  return !!row?.enabled;
}

/**
 * Look up an applicant profile by their User id, with feature rows. Returns
 * null if the user is not an applicant. Convenience for portal pages.
 */
export async function getApplicantByUserId(userId: string) {
  return prisma.applicantProfile.findUnique({
    where: { userId },
    include: {
      appliedProgram: { select: { id: true, nameEn: true, nameAr: true } },
      featureAccess: true,
    },
  });
}

/**
 * Toggle ONE feature for an applicant. Admin override — beats stage defaults.
 * On enable, notify the applicant that a new step is available. Audited.
 */
export async function toggleFeature(args: {
  applicantId: string;
  feature: ApplicantFeature;
  enabled: boolean;
  adminUserId: string;
}): Promise<ActionResult> {
  const applicant = await prisma.applicantProfile.findUnique({
    where: { id: args.applicantId },
    select: { id: true, userId: true, isReadOnly: true },
  });
  if (!applicant) return { ok: false, error: "NOT_FOUND" };

  await ensureFeatureRows(applicant.id);

  await prisma.applicantFeatureAccess.update({
    where: { applicantId_feature: { applicantId: applicant.id, feature: args.feature } },
    data: {
      enabled: args.enabled,
      enabledBy: args.adminUserId,
      enabledAt: args.enabled ? new Date() : null,
    },
  });

  await audit.mutation(
    args.adminUserId,
    args.enabled ? "APPLICANT_FEATURE_ENABLED" : "APPLICANT_FEATURE_DISABLED",
    "ApplicantFeatureAccess",
    `${applicant.id}:${args.feature}`,
    { feature: args.feature, enabled: args.enabled }
  );

  // Only celebrate NEW access (and never for the always-on OVERVIEW).
  if (args.enabled && args.feature !== "OVERVIEW") {
    try {
      await notify({
        userId: applicant.userId,
        type: "SYSTEM_ANNOUNCEMENT",
        title: "A new step is available in your dashboard",
        titleAr: "خطوة جديدة متاحة في لوحتك",
        body: "Hajr Academy has opened a new section for you. Open your dashboard to continue.",
        bodyAr: "فتحت أكاديمية هَجر قسماً جديداً لك. افتح لوحتك للمتابعة.",
        channels: ["inApp", "email"],
        actionUrl: "/applicant",
        actionLabel: "Open dashboard",
        actionLabelAr: "افتح اللوحة",
        priority: "HIGH",
        refType: "ApplicantFeatureAccess",
        refId: applicant.id,
      });
    } catch (e) {
      console.error("[applicants] feature-enable notify failed (non-fatal):", e);
    }
  }

  return { ok: true };
}

/**
 * Set (or advance) an applicant's stage. Enables that stage's default bundle
 * (additively — never revokes an admin's manual unlock). Notifies the applicant.
 * Audited. This is the "advance stage applies the bundle" admin control.
 */
export async function setStage(args: {
  applicantId: string;
  stage: ApplicantStage;
  adminUserId: string;
}): Promise<ActionResult> {
  const applicant = await prisma.applicantProfile.findUnique({
    where: { id: args.applicantId },
    select: { id: true, userId: true, stage: true },
  });
  if (!applicant) return { ok: false, error: "NOT_FOUND" };

  await ensureFeatureRows(applicant.id);

  const bundle = STAGE_FEATURE_BUNDLE[args.stage] ?? DEFAULT_FEATURES;

  await prisma.$transaction([
    prisma.applicantProfile.update({
      where: { id: applicant.id },
      data: { stage: args.stage, lastActivityAt: new Date() },
    }),
    // Enable (never disable) every feature in the stage bundle.
    prisma.applicantFeatureAccess.updateMany({
      where: { applicantId: applicant.id, feature: { in: bundle }, enabled: false },
      data: { enabled: true, enabledBy: args.adminUserId, enabledAt: new Date() },
    }),
  ]);

  await audit.mutation(
    args.adminUserId,
    "APPLICANT_STAGE_SET",
    "ApplicantProfile",
    applicant.id,
    { from: applicant.stage, to: args.stage, bundle }
  );

  try {
    await notify({
      userId: applicant.userId,
      type: "SYSTEM_ANNOUNCEMENT",
      title: "Your application has moved forward",
      titleAr: "تقدّم طلبك خطوة جديدة",
      body: "There's an update on your application journey. Open your dashboard to see what's next.",
      bodyAr: "هناك تحديث في رحلة طلبك. افتح لوحتك لمعرفة الخطوة التالية.",
      channels: ["inApp", "email"],
      actionUrl: "/applicant",
      actionLabel: "Open dashboard",
      actionLabelAr: "افتح اللوحة",
      priority: "NORMAL",
      refType: "ApplicantProfile",
      refId: applicant.id,
    });
  } catch (e) {
    console.error("[applicants] stage notify failed (non-fatal):", e);
  }

  return { ok: true };
}

/**
 * Politely close an applicant out (the natural "not this time" exit). Sets stage
 * to DECISION, marks the account read-only (NO destructive delete), and sends a
 * warm closing message into their inbox + notification. Audited.
 */
export async function closeApplicant(args: {
  applicantId: string;
  adminUserId: string;
  closingMessage?: string;
}): Promise<ActionResult> {
  const applicant = await prisma.applicantProfile.findUnique({
    where: { id: args.applicantId },
    select: { id: true, userId: true },
  });
  if (!applicant) return { ok: false, error: "NOT_FOUND" };

  const msg =
    args.closingMessage?.trim() ||
    "Thank you sincerely for your interest in teaching with Hajr Academy. We won't be moving forward at this time, but we're grateful for the time you shared with us.";
  const msgAr =
    "نشكرك جزيل الشكر على اهتمامك بالتدريس مع أكاديمية هَجر. لن نتمكن من المضي قدماً في الوقت الحالي، ونحن ممتنّون لوقتك معنا.";

  await prisma.applicantProfile.update({
    where: { id: applicant.id },
    data: { stage: "DECISION", isReadOnly: true, lastActivityAt: new Date() },
  });

  await audit.mutation(args.adminUserId, "APPLICANT_CLOSED", "ApplicantProfile", applicant.id);

  // Drop the closing note into their inbox so the Overview feed shows it, then notify.
  try {
    await deliverAdminMessageToApplicant({
      applicantUserId: applicant.userId,
      adminUserId: args.adminUserId,
      body: msg,
      subject: "An update on your application",
    });
  } catch (e) {
    console.error("[applicants] closing message failed (non-fatal):", e);
  }
  try {
    await notify({
      userId: applicant.userId,
      type: "SYSTEM_ANNOUNCEMENT",
      title: "An update on your application",
      titleAr: "تحديث بخصوص طلبك",
      body: msg,
      bodyAr: msgAr,
      channels: ["inApp", "email"],
      actionUrl: "/applicant",
      refType: "ApplicantProfile",
      refId: applicant.id,
    });
  } catch (e) {
    console.error("[applicants] close notify failed (non-fatal):", e);
  }

  return { ok: true };
}

/**
 * Convert an applicant into a real TEACHER — the natural funnel exit.
 * Creates a TeacherProfile (if none), flips User.role APPLICANT→TEACHER, and
 * notifies. The ApplicantProfile is retained (read-only) as the historical
 * record; their portal stops being reachable because role is no longer
 * APPLICANT. Idempotent-ish: refuses if the user is not currently an applicant.
 */
export async function convertToTeacher(args: {
  applicantId: string;
  adminUserId: string;
}): Promise<{ ok: true; teacherProfileId: string } | { ok: false; error: string }> {
  const applicant = await prisma.applicantProfile.findUnique({
    where: { id: args.applicantId },
    include: { user: { select: { id: true, role: true, name: true } } },
  });
  if (!applicant) return { ok: false, error: "NOT_FOUND" };
  if (applicant.user.role !== "APPLICANT") return { ok: false, error: "NOT_AN_APPLICANT" };

  const result = await prisma.$transaction(async (tx) => {
    // Reuse an existing teacher profile if one somehow exists; else create one.
    const existing = await tx.teacherProfile.findUnique({
      where: { userId: applicant.user.id },
      select: { id: true },
    });
    const teacherProfile =
      existing ??
      (await tx.teacherProfile.create({
        data: { userId: applicant.user.id, active: true },
        select: { id: true },
      }));

    await tx.user.update({
      where: { id: applicant.user.id },
      data: { role: "TEACHER" },
    });

    // The applicant record stays as history but is closed to further edits.
    await tx.applicantProfile.update({
      where: { id: applicant.id },
      data: { isReadOnly: true, stage: "DECISION", lastActivityAt: new Date() },
    });

    return teacherProfile;
  });

  await audit.mutation(
    args.adminUserId,
    "APPLICANT_CONVERTED_TO_TEACHER",
    "User",
    applicant.user.id,
    { applicantId: applicant.id, teacherProfileId: result.id }
  );

  try {
    await notify({
      userId: applicant.user.id,
      type: "SYSTEM_ANNOUNCEMENT",
      title: "Welcome to the Hajr Academy teaching team!",
      titleAr: "أهلاً بك في فريق التدريس بأكاديمية هَجر!",
      body: "Congratulations — your teacher account is now active. Sign in to access your teaching dashboard.",
      bodyAr: "مبارك — تم تفعيل حساب المعلّم الخاص بك. سجّل الدخول للوصول إلى لوحة التدريس.",
      channels: ["inApp", "email"],
      actionUrl: "/teacher",
      actionLabel: "Open teacher dashboard",
      actionLabelAr: "افتح لوحة المعلّم",
      priority: "HIGH",
      refType: "User",
      refId: applicant.user.id,
    });
  } catch (e) {
    console.error("[applicants] convert notify failed (non-fatal):", e);
  }

  return { ok: true, teacherProfileId: result.id };
}

/**
 * Record an applicant's interest in a program (the openings "apply" action,
 * reusing the openings UX without mutating the teacher-only TeacherApplication
 * model). Stores appliedProgramId on the profile and notifies admins so the
 * application surfaces on the admin applicants board. Audited.
 */
export async function applyToProgram(args: {
  applicantUserId: string;
  programId: string;
}): Promise<ActionResult> {
  const applicant = await prisma.applicantProfile.findUnique({
    where: { userId: args.applicantUserId },
    select: { id: true, isReadOnly: true, fullName: true },
  });
  if (!applicant) return { ok: false, error: "NOT_FOUND" };
  if (applicant.isReadOnly) return { ok: false, error: "READ_ONLY" };

  // Only allow programs that are actually open to applicants (single guard).
  const program = await prisma.program.findFirst({
    where: { id: args.programId, active: true },
    select: { id: true, nameEn: true, nameAr: true },
  });
  if (!program) return { ok: false, error: "PROGRAM_NOT_AVAILABLE" };

  await prisma.applicantProfile.update({
    where: { id: applicant.id },
    data: { appliedProgramId: program.id, lastActivityAt: new Date() },
  });

  await audit.mutation(
    args.applicantUserId,
    "APPLICANT_APPLIED_TO_PROGRAM",
    "ApplicantProfile",
    applicant.id,
    { programId: program.id }
  );

  try {
    await notifyAdmins({
      type: "SYSTEM_ANNOUNCEMENT",
      title: `Applicant interest: ${applicant.fullName} → ${program.nameEn}`,
      titleAr: `اهتمام متقدّم: ${applicant.fullName} ← ${program.nameAr}`,
      body: `${applicant.fullName} expressed interest in teaching ${program.nameEn}.`,
      bodyAr: `أبدى ${applicant.fullName} اهتماماً بتدريس ${program.nameAr}.`,
      channels: ["inApp"],
      actionUrl: `/admin/applicants/${applicant.id}`,
      actionLabel: "Review applicant",
      actionLabelAr: "مراجعة المتقدّم",
      refType: "ApplicantProfile",
      refId: applicant.id,
    });
  } catch (e) {
    console.error("[applicants] applyToProgram admin notify failed (non-fatal):", e);
  }

  return { ok: true };
}

/**
 * SINGLE visibility guard for which program openings an applicant may see.
 * Built to be EXTENDED by the later "targeted audience / internal-first" prompt
 * — keep all opening-visibility logic for applicants here so that prompt edits
 * exactly one place. Today: an applicant may see any OPEN opening on an active
 * program. (Future: internal-first windows, targeted cohorts, gender match…)
 */
export async function canApplicantSeeOpening(
  applicant: { id: string; gender: string | null },
  opening: { status: string; program: { active: boolean } }
): Promise<boolean> {
  void applicant; // reserved for future targeting (gender/audience) — see prompt note above.
  return opening.status === "OPEN" && opening.program.active === true;
}

/**
 * Deliver an admin → applicant message straight into the messaging system
 * (used by signup welcome + closing note). Mirrors POST /api/messages so the
 * Overview feed + the applicant's chat both render it. Best-effort by caller.
 */
export async function deliverAdminMessageToApplicant(args: {
  applicantUserId: string;
  adminUserId?: string | null;
  body: string;
  subject?: string;
}): Promise<void> {
  // Resolve a sender admin — prefer the supplied one, else any active admin.
  let fromUserId = args.adminUserId ?? null;
  if (!fromUserId) {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    fromUserId = admin?.id ?? null;
  }
  if (!fromUserId) {
    console.warn("[applicants] no admin found to send applicant message; skipping.");
    return;
  }

  await prisma.message.create({
    data: {
      threadId: crypto.randomUUID(),
      fromUserId,
      toUserId: args.applicantUserId,
      subject: args.subject ?? null,
      body: args.body,
      channel: "IN_APP",
      status: "SENT",
      sentAt: new Date(),
      triggerType: "MANUAL",
    } satisfies Prisma.MessageUncheckedCreateInput,
  });
}

/**
 * Deliver an applicant → admin message (used by demo-link submission). Targets
 * the first active admin so it lands in the applicant's admin-scoped thread.
 * Best-effort by caller.
 */
export async function deliverMessageFromApplicantToAdmin(args: {
  applicantUserId: string;
  body: string;
  subject?: string;
}): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    console.warn("[applicants] no admin found for applicant message; skipping.");
    return;
  }
  await prisma.message.create({
    data: {
      threadId: crypto.randomUUID(),
      fromUserId: args.applicantUserId,
      toUserId: admin.id,
      subject: args.subject ?? null,
      body: args.body,
      channel: "IN_APP",
      status: "SENT",
      sentAt: new Date(),
      triggerType: "MANUAL",
    } satisfies Prisma.MessageUncheckedCreateInput,
  });
}
