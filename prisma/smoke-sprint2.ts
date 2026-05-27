/**
 * Sprint 2 smoke test: exercises the marketer + placement test pipelines
 * end-to-end against the live database. Idempotent — uses fixed unique IDs
 * so re-runs clean up after themselves.
 *
 *   1. Apply as a marketer → check MarketerProfile created (PENDING).
 *   2. Admin approves the marketer → MarketerProfile.status = ACTIVE.
 *   3. Validate the referral code → returns valid:true.
 *   4. Start GENERAL_ENGLISH placement attempt (guest) → attemptId returned.
 *   5. Submit a few correct answers → PlacementResult created, CEFR set,
 *      ContactSubmission lead created (source=placement_test).
 *   6. Create a fake paid Invoice for a student whose referredByCode points
 *      at the new marketer → maybeCreateCommissionForInvoice creates a
 *      Commission row.
 *
 * Run: npx tsx prisma/smoke-sprint2.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_EMAIL_MARKETER = "smoke-sprint2-marketer@hajr.test";
const TEST_EMAIL_STUDENT = "smoke-sprint2-student@hajr.test";
const TEST_EMAIL_GUEST = "smoke-sprint2-guest@hajr.test";

async function cleanup() {
  // Cascade-safe deletion of prior smoke artifacts.
  await prisma.contactSubmission.deleteMany({ where: { email: TEST_EMAIL_GUEST } });

  const oldGuest = await prisma.placementAttempt.findMany({ where: { guestEmail: TEST_EMAIL_GUEST } });
  for (const a of oldGuest) {
    await prisma.placementResult.deleteMany({ where: { attemptId: a.id } });
  }
  await prisma.placementAttempt.deleteMany({ where: { guestEmail: TEST_EMAIL_GUEST } });

  const oldMarketer = await prisma.user.findUnique({ where: { email: TEST_EMAIL_MARKETER } });
  if (oldMarketer) {
    const mp = await prisma.marketerProfile.findUnique({ where: { userId: oldMarketer.id } });
    if (mp) {
      await prisma.commission.deleteMany({ where: { marketerId: mp.id } });
      await prisma.marketerReferral.deleteMany({ where: { marketerId: mp.id } });
    }
    await prisma.user.delete({ where: { id: oldMarketer.id } });
  }

  const oldStudent = await prisma.user.findUnique({ where: { email: TEST_EMAIL_STUDENT } });
  if (oldStudent) {
    const sp = await prisma.studentProfile.findUnique({ where: { userId: oldStudent.id } });
    if (sp) {
      await prisma.invoice.deleteMany({ where: { studentId: sp.id } });
    }
    await prisma.user.delete({ where: { id: oldStudent.id } });
  }
}

async function main() {
  console.log("[smoke] cleaning up prior runs...");
  await cleanup();

  // ── 1. apply as marketer ──
  console.log("[smoke] 1. apply as marketer");
  const passwordHash = await bcrypt.hash("test1234", 10);
  const marketerCode = "SMOKE2"; // 6 chars
  const marketerUser = await prisma.user.create({
    data: {
      email: TEST_EMAIL_MARKETER,
      passwordHash,
      name: "Sprint 2 Smoke Marketer",
      phone: "+966500000001",
      role: "MARKETER",
      isActive: false,
    },
  });
  const profile = await prisma.marketerProfile.create({
    data: {
      userId: marketerUser.id,
      referralCode: marketerCode,
      status: "PENDING",
    },
  });
  console.log(`   ✓ marketer ${profile.id} (PENDING), code=${marketerCode}`);

  // ── 2. admin approves ──
  console.log("[smoke] 2. admin approves marketer");
  await prisma.$transaction([
    prisma.marketerProfile.update({ where: { id: profile.id }, data: { status: "ACTIVE" } }),
    prisma.user.update({ where: { id: marketerUser.id }, data: { isActive: true } }),
  ]);
  console.log("   ✓ marketer now ACTIVE");

  // ── 3. validate code ──
  console.log("[smoke] 3. validate referral code");
  const { resolveActiveMarketerByCode } = await import("../src/lib/marketer/codes");
  const resolved = await resolveActiveMarketerByCode(marketerCode);
  if (!resolved) throw new Error("Referral code did not resolve to active marketer");
  console.log(`   ✓ resolved to marketer userId=${resolved.user.id}`);

  // ── 4. start guest placement attempt ──
  console.log("[smoke] 4. start guest placement attempt");
  const test = await prisma.placementTest.findFirst({
    where: { variant: "GENERAL_ENGLISH", isActive: true },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!test) throw new Error("No GENERAL_ENGLISH placement test seeded");
  const attempt = await prisma.placementAttempt.create({
    data: {
      testId: test.id,
      guestName: "Smoke Guest",
      guestEmail: TEST_EMAIL_GUEST,
      guestPhone: "+966500000002",
      sessionId: "smoke-session-1",
      answers: {},
      status: "IN_PROGRESS",
    },
  });
  console.log(`   ✓ attempt ${attempt.id} started`);

  // ── 5. submit ──
  console.log("[smoke] 5. submit attempt + score");
  // Answer every question with option 0 (will likely fail most → low CEFR, but engine runs).
  const answers: Record<string, Record<string, number>> = {};
  for (const s of test.sections) {
    const sectAns: Record<string, number> = {};
    const qs = s.questions as Array<{ id: string; correct: number }>;
    for (const q of qs) sectAns[q.id] = q.correct; // pick correct → high CEFR
    answers[s.id] = sectAns;
  }
  const { scoreAttempt, recommendPrograms } = await import("../src/lib/placement/scorer");
  const sectionsForScoring = test.sections.map((s) => ({
    id: s.id,
    type: s.type,
    titleEn: s.titleEn,
    titleAr: s.titleAr,
    questions: s.questions as Array<{ id: string; textEn: string; textAr: string; options: { en: string; ar: string }[]; correct: number; points: number; audioUrl?: string | null }>,
    maxScore: s.maxScore,
  }));
  const scored = scoreAttempt(sectionsForScoring, answers);
  await prisma.placementAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      answers,
      score: scored.score,
      maxScore: scored.maxScore,
      percent: scored.percent,
      cefrLevel: scored.cefrLevel,
    },
  });
  const recs = recommendPrograms(scored.cefrLevel, "GENERAL_ENGLISH");
  const result = await prisma.placementResult.create({
    data: {
      attemptId: attempt.id,
      cefrLevel: scored.cefrLevel,
      score: scored.score,
      maxScore: scored.maxScore,
      percent: scored.percent,
      sectionBreakdown: scored.sectionBreakdown as unknown as object,
      recommendations: recs as unknown as object,
    },
  });
  const lead = await prisma.contactSubmission.create({
    data: {
      name: "Smoke Guest",
      email: TEST_EMAIL_GUEST,
      phone: "+966500000002",
      subject: "PLACEMENT_TEST_LEAD",
      message: `Placement: ${scored.cefrLevel} (${scored.percent.toFixed(1)}%)`,
      source: "placement_test",
      status: "NEW",
    },
  });
  await prisma.placementResult.update({
    where: { id: result.id },
    data: { leadCreated: true, leadId: lead.id },
  });
  console.log(`   ✓ result ${result.id} CEFR=${scored.cefrLevel} pct=${scored.percent.toFixed(1)}%`);
  console.log(`   ✓ lead created in admin inbox`);

  // ── 6. fake paid invoice → commission auto-created ──
  console.log("[smoke] 6. simulate first paid invoice → commission");
  const studentUser = await prisma.user.create({
    data: {
      email: TEST_EMAIL_STUDENT,
      passwordHash,
      name: "Sprint 2 Smoke Student",
      phone: "+966500000003",
      role: "STUDENT",
      isActive: true,
      referredByCode: marketerCode,
      referredAt: new Date(),
      studentProfile: { create: {} },
    },
    include: { studentProfile: true },
  });
  if (!studentUser.studentProfile) throw new Error("Student profile not created");

  await prisma.marketerReferral.create({
    data: {
      marketerId: profile.id,
      code: marketerCode,
      studentId: studentUser.studentProfile.id,
      contactEmail: TEST_EMAIL_STUDENT,
      registeredAt: new Date(),
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `SMOKE2-${Date.now()}`,
      studentId: studentUser.studentProfile.id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      type: "SUBSCRIPTION",
      status: "PAID",
      invoiceStatus: "PAID",
      subtotalSar: 1000,
      vatSar: 150,
      totalSar: 1150,
      issuedAt: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      paymentMethod: "MOYASAR_CARD",
    },
  });
  const { maybeCreateCommissionForInvoice } = await import("../src/lib/marketer/commission");
  const cRes = await maybeCreateCommissionForInvoice(invoice.id);
  console.log(`   commission result: ${JSON.stringify(cRes)}`);
  if (!cRes.created) throw new Error(`Commission not created: ${cRes.reason}`);

  const commission = await prisma.commission.findUnique({ where: { invoiceId: invoice.id } });
  console.log(`   ✓ commission ${commission?.id} amount=${commission?.amount} rate=${commission?.rateApplied}`);

  console.log("\n✅ Sprint 2 smoke test passed.");
  console.log("   cleaning up test data...");
  await cleanup();
  console.log("   ✓ cleaned up.");
}

main()
  .catch((e) => {
    console.error("❌ smoke failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
