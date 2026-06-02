/**
 * Unit tests for the targeted-openings visibility rules. These cover the pure
 * audience/phase logic (no DB): proving that INTERNAL_THEN_APPLICANTS hides the
 * opening from applicants until phase 2, and that out-of-audience teachers are
 * excluded. The DB-backed paths are exercised by the QA spot-checks.
 */
import { describe, it, expect, vi } from "vitest";

// canApplicantSeeOpening is the base rule the applicant branch layers on top of.
// Stub it to "open program → allowed" so we isolate the audience/phase logic.
vi.mock("@/lib/applicants/service", () => ({
  canApplicantSeeOpening: async (
    _a: { id: string; gender: string | null },
    o: { status: string; program: { active: boolean } }
  ) => o.status === "OPEN" && o.program.active === true,
}));
// audience.ts imports prisma transitively; stub it so the module loads in node.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  canSeeOpening,
  audienceIncludesTeachers,
  audienceIncludesApplicantsNow,
  type OpeningAudienceShape,
} from "./audience";

const openOpening = (
  audienceType: OpeningAudienceShape["audienceType"],
  applicantsPhaseOpen = false
): OpeningAudienceShape => ({
  id: "op1",
  status: "OPEN",
  audienceType,
  applicantsPhaseOpen,
  program: { active: true },
});

const teacher = { role: "TEACHER", teacherId: "t1" } as const;
const applicant = { role: "APPLICANT", applicantId: "a1", gender: null } as const;

describe("audience set helpers", () => {
  it("teacher-inclusive audiences", () => {
    expect(audienceIncludesTeachers("ALL_INTERNAL")).toBe(true);
    expect(audienceIncludesTeachers("SELECTED_TEACHERS")).toBe(true);
    expect(audienceIncludesTeachers("INTERNAL_THEN_APPLICANTS")).toBe(true);
    expect(audienceIncludesTeachers("EVERYONE")).toBe(true);
    expect(audienceIncludesTeachers("APPLICANTS_ONLY")).toBe(false);
  });

  it("applicant eligibility honours the phase gate", () => {
    expect(audienceIncludesApplicantsNow("APPLICANTS_ONLY", false)).toBe(true);
    expect(audienceIncludesApplicantsNow("EVERYONE", false)).toBe(true);
    expect(audienceIncludesApplicantsNow("ALL_INTERNAL", false)).toBe(false);
    // Phased: only once explicitly opened.
    expect(audienceIncludesApplicantsNow("INTERNAL_THEN_APPLICANTS", false)).toBe(false);
    expect(audienceIncludesApplicantsNow("INTERNAL_THEN_APPLICANTS", true)).toBe(true);
  });
});

describe("canSeeOpening — base gate", () => {
  it("nobody sees a non-OPEN opening", async () => {
    const filled = { ...openOpening("EVERYONE"), status: "FILLED" };
    expect(await canSeeOpening(teacher, filled)).toBe(false);
    expect(await canSeeOpening(applicant, filled)).toBe(false);
  });
  it("nobody sees an opening on an inactive program", async () => {
    const off = { ...openOpening("EVERYONE"), program: { active: false } };
    expect(await canSeeOpening(teacher, off)).toBe(false);
    expect(await canSeeOpening(applicant, off)).toBe(false);
  });
});

describe("canSeeOpening — teacher branch", () => {
  it("ALL_INTERNAL: any active teacher sees it", async () => {
    expect(await canSeeOpening(teacher, openOpening("ALL_INTERNAL"))).toBe(true);
  });
  it("APPLICANTS_ONLY: a teacher does NOT see it", async () => {
    expect(await canSeeOpening(teacher, openOpening("APPLICANTS_ONLY"))).toBe(false);
  });
  it("SELECTED_TEACHERS: only an explicit member sees it", async () => {
    const op = openOpening("SELECTED_TEACHERS");
    expect(await canSeeOpening(teacher, op, { isExplicitMember: false })).toBe(false);
    expect(await canSeeOpening(teacher, op, { isExplicitMember: true })).toBe(true);
  });
  it("INTERNAL_THEN_APPLICANTS: teachers see it in BOTH phases", async () => {
    expect(await canSeeOpening(teacher, openOpening("INTERNAL_THEN_APPLICANTS", false))).toBe(true);
    expect(await canSeeOpening(teacher, openOpening("INTERNAL_THEN_APPLICANTS", true))).toBe(true);
  });
});

describe("canSeeOpening — applicant branch (the internal-first guarantee)", () => {
  it("INTERNAL_THEN_APPLICANTS: applicant CANNOT see in phase 1", async () => {
    expect(await canSeeOpening(applicant, openOpening("INTERNAL_THEN_APPLICANTS", false))).toBe(false);
  });
  it("INTERNAL_THEN_APPLICANTS: applicant CAN see once phase 2 opens", async () => {
    expect(await canSeeOpening(applicant, openOpening("INTERNAL_THEN_APPLICANTS", true))).toBe(true);
  });
  it("ALL_INTERNAL / SELECTED_TEACHERS: applicant never sees it", async () => {
    expect(await canSeeOpening(applicant, openOpening("ALL_INTERNAL"))).toBe(false);
    expect(await canSeeOpening(applicant, openOpening("SELECTED_TEACHERS"))).toBe(false);
  });
  it("APPLICANTS_ONLY / EVERYONE: applicant sees it", async () => {
    expect(await canSeeOpening(applicant, openOpening("APPLICANTS_ONLY"))).toBe(true);
    expect(await canSeeOpening(applicant, openOpening("EVERYONE"))).toBe(true);
  });
});
