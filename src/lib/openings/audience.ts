/**
 * Targeted-openings AUDIENCE ENGINE — the single source of truth for
 * "who may SEE / apply to a program opening" and "who notify() should reach".
 *
 * Architecture (critical): there is exactly ONE visibility rule, exposed as
 * `canSeeOpening(viewer, opening)`. It is used by BOTH the teacher listing/apply
 * paths AND the applicant listing/apply paths. The applicant branch delegates to
 * the original `canApplicantSeeOpening()` (kept as the documented extension
 * point) and layers the audience/phase rule on top — the base rule is never
 * duplicated. Never rely on client hiding; every check here runs on the server.
 *
 * Phase model for INTERNAL_THEN_APPLICANTS:
 *   Phase 1 — internal teachers only (applicants literally cannot see/apply).
 *   Phase 2 — applicants too, but ONLY after an admin flips `applicantsPhaseOpen`.
 *   The system NEVER auto-opens phase 2.
 */
import type { OpeningAudienceType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canApplicantSeeOpening } from "@/lib/applicants/service";

// ─────────────────────────── shapes ───────────────────────────

/** The minimal opening shape the audience rule needs. */
export interface OpeningAudienceShape {
  id: string;
  status: string;
  audienceType: OpeningAudienceType;
  applicantsPhaseOpen: boolean;
  program: { active: boolean };
}

/** Who is asking. role narrows the branch; gender feeds the applicant base rule. */
export type OpeningViewer =
  | { role: "TEACHER"; teacherId: string }
  | { role: "APPLICANT"; applicantId: string; gender: string | null };

// ─────────────────────────── helpers ───────────────────────────

/** Audience types that include the internal-teacher cohort at all. */
export function audienceIncludesTeachers(t: OpeningAudienceType): boolean {
  return (
    t === "ALL_INTERNAL" ||
    t === "SELECTED_TEACHERS" ||
    t === "INTERNAL_THEN_APPLICANTS" ||
    t === "EVERYONE"
  );
}

/**
 * Whether applicants are eligible RIGHT NOW (honours the phase gate).
 * INTERNAL_THEN_APPLICANTS only counts once `applicantsPhaseOpen` is true.
 */
export function audienceIncludesApplicantsNow(
  t: OpeningAudienceType,
  applicantsPhaseOpen: boolean
): boolean {
  if (t === "APPLICANTS_ONLY" || t === "EVERYONE") return true;
  if (t === "INTERNAL_THEN_APPLICANTS") return applicantsPhaseOpen === true;
  return false;
}

/** Does this audience need an explicit per-teacher membership row to be visible? */
function teacherAudienceNeedsMembership(t: OpeningAudienceType): boolean {
  return t === "SELECTED_TEACHERS";
}

// ─────────────────────────── the single guard ───────────────────────────

/**
 * THE shared visibility guard. Returns whether `viewer` may see/apply to
 * `opening`. Pure over its inputs: for SELECTED_TEACHERS it needs to know if the
 * teacher is an explicit member — pass `isExplicitMember` (resolved in bulk by
 * the caller for list views, or via `canSeeOpeningDb` for a single opening).
 *
 * The base gate (status OPEN + program active) is enforced for everyone. For
 * applicants the original `canApplicantSeeOpening` rule is ALSO applied, so any
 * future tightening there automatically flows through here.
 */
export async function canSeeOpening(
  viewer: OpeningViewer,
  opening: OpeningAudienceShape,
  opts?: { isExplicitMember?: boolean }
): Promise<boolean> {
  // Universal base gate — never visible if closed/filled or the program is off.
  if (opening.status !== "OPEN" || opening.program.active !== true) return false;

  if (viewer.role === "TEACHER") {
    if (!audienceIncludesTeachers(opening.audienceType)) return false;
    if (teacherAudienceNeedsMembership(opening.audienceType)) {
      return opts?.isExplicitMember === true;
    }
    // ALL_INTERNAL / INTERNAL_THEN_APPLICANTS / EVERYONE → any active teacher.
    return true;
  }

  // APPLICANT branch — layer the phase/audience rule ON TOP of the base rule.
  const baseAllowed = await canApplicantSeeOpening(
    { id: viewer.applicantId, gender: viewer.gender },
    { status: opening.status, program: { active: opening.program.active } }
  );
  if (!baseAllowed) return false;
  return audienceIncludesApplicantsNow(opening.audienceType, opening.applicantsPhaseOpen);
}

/**
 * DB-backed convenience wrapper for a SINGLE opening (resolves SELECTED_TEACHERS
 * membership for you). Prefer `canSeeOpening` + a bulk membership set for lists.
 */
export async function canSeeOpeningDb(
  viewer: OpeningViewer,
  opening: OpeningAudienceShape
): Promise<boolean> {
  let isExplicitMember = false;
  if (
    viewer.role === "TEACHER" &&
    teacherAudienceNeedsMembership(opening.audienceType)
  ) {
    const m = await prisma.openingAudienceMember.findUnique({
      where: { openingId_teacherId: { openingId: opening.id, teacherId: viewer.teacherId } },
      select: { id: true },
    });
    isExplicitMember = !!m;
  }
  return canSeeOpening(viewer, opening, { isExplicitMember });
}

/**
 * Bulk membership helper for list views: given a teacherId and a set of opening
 * ids, returns the subset the teacher is an EXPLICIT member of (one query).
 */
export async function explicitTeacherMemberships(
  teacherId: string,
  openingIds: string[]
): Promise<Set<string>> {
  if (openingIds.length === 0) return new Set();
  const rows = await prisma.openingAudienceMember.findMany({
    where: { teacherId, openingId: { in: openingIds } },
    select: { openingId: true },
  });
  return new Set(rows.map((r) => r.openingId));
}

// ─────────────────────────── audience resolution ───────────────────────────

export interface ResolvedAudience {
  /** User ids of eligible internal teachers. */
  teacherUserIds: string[];
  /** User ids of eligible applicants (empty in phase 1). */
  applicantUserIds: string[];
}

/**
 * Resolve the exact set of eligible TEACHER + APPLICANT user ids for an opening,
 * honouring the phase (phase 1 yields zero applicants). Used by the notify()
 * fan-out and by the admin "preview audience" surface so the named list the
 * admin sees is exactly who the system will reach. No side effects.
 */
export async function resolveOpeningAudience(opening: {
  id: string;
  audienceType: OpeningAudienceType;
  applicantsPhaseOpen: boolean;
}): Promise<ResolvedAudience> {
  const teacherUserIds: string[] = [];
  const applicantUserIds: string[] = [];

  // ── Teachers ──
  if (audienceIncludesTeachers(opening.audienceType)) {
    if (opening.audienceType === "SELECTED_TEACHERS") {
      // Exactly the explicitly-added teacher members.
      const members = await prisma.openingAudienceMember.findMany({
        where: { openingId: opening.id, teacherId: { not: null } },
        select: { teacher: { select: { active: true, user: { select: { id: true, isActive: true } } } } },
      });
      for (const m of members) {
        const u = m.teacher?.user;
        if (m.teacher?.active && u?.isActive) teacherUserIds.push(u.id);
      }
    } else {
      // ALL_INTERNAL / INTERNAL_THEN_APPLICANTS / EVERYONE → every active teacher.
      const teachers = await prisma.teacherProfile.findMany({
        where: { active: true, user: { isActive: true } },
        select: { user: { select: { id: true } } },
      });
      for (const t of teachers) teacherUserIds.push(t.user.id);
    }
  }

  // ── Applicants (only when the phase allows it) ──
  if (audienceIncludesApplicantsNow(opening.audienceType, opening.applicantsPhaseOpen)) {
    // Eligible = not read-only, OPENINGS feature enabled, user active.
    const applicants = await prisma.applicantProfile.findMany({
      where: {
        isReadOnly: false,
        user: { isActive: true },
        featureAccess: { some: { feature: "OPENINGS", enabled: true } },
      },
      select: { user: { select: { id: true } } },
    });
    for (const a of applicants) applicantUserIds.push(a.user.id);
  }

  return {
    teacherUserIds: [...new Set(teacherUserIds)],
    applicantUserIds: [...new Set(applicantUserIds)],
  };
}
