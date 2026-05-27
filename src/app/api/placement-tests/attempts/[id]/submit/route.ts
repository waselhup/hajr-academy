import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { scoreAttempt, recommendPrograms, type Question } from "@/lib/placement/scorer";
import { renderPlacementReportHtml, uploadPlacementReport, getPlacementReportSignedUrl } from "@/lib/placement/pdf-report";
import { sendEmail } from "@/lib/comms/email";
import { notify, notifyAdmins } from "@/lib/notify";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body.sessionId;
  const finalAnswers: Record<string, Record<string, number>> | undefined = body.answers;

  const attempt = await prisma.placementAttempt.findUnique({
    where: { id },
    include: { test: { include: { sections: { orderBy: { order: "asc" } } } } },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status === "SUBMITTED" || attempt.status === "COMPLETED") {
    return NextResponse.json({ error: "Already submitted", resultId: attempt.id }, { status: 400 });
  }

  const session = await auth();
  const ownerByStudent =
    !!session?.user &&
    (await prisma.studentProfile.findFirst({
      where: { id: attempt.studentId ?? "__none__", userId: session.user.id },
      select: { id: true },
    }));
  const ownerBySession = sessionId && attempt.sessionId === sessionId;
  if (!ownerByStudent && !ownerBySession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Merge latest answers if sent in the body.
  const answers = (finalAnswers ?? (attempt.answers as Record<string, Record<string, number>>) ?? {}) as Record<string, Record<string, number>>;

  // Compute score.
  const sectionsForScoring = attempt.test.sections.map((s) => ({
    id: s.id,
    type: s.type,
    titleEn: s.titleEn,
    titleAr: s.titleAr,
    questions: s.questions as unknown as Question[],
    maxScore: s.maxScore,
  }));
  const scored = scoreAttempt(sectionsForScoring, answers);

  const now = new Date();
  const timeSpentSec = Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000));

  const updated = await prisma.placementAttempt.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      timeSpentSec,
      answers,
      score: scored.score,
      maxScore: scored.maxScore,
      percent: scored.percent,
      cefrLevel: scored.cefrLevel,
    },
  });

  // Build recommendations.
  const recs = recommendPrograms(scored.cefrLevel, attempt.test.variant);

  // Create result row first (without PDF), then attempt PDF upload.
  const result = await prisma.placementResult.create({
    data: {
      attemptId: updated.id,
      cefrLevel: scored.cefrLevel,
      score: scored.score,
      maxScore: scored.maxScore,
      percent: scored.percent,
      sectionBreakdown: scored.sectionBreakdown as unknown as object,
      recommendations: recs as unknown as object,
    },
  });

  // Determine student display info.
  let studentName = attempt.guestName ?? "Student";
  let studentEmail = attempt.guestEmail ?? null;
  if (attempt.studentId) {
    const sp = await prisma.studentProfile.findUnique({
      where: { id: attempt.studentId },
      include: { user: { select: { name: true, nameAr: true, email: true } } },
    });
    if (sp) {
      studentName = sp.user.nameAr || sp.user.name;
      studentEmail = sp.user.email;
    }
  }

  // Generate + upload PDF (best-effort).
  let pdfPath: string | null = null;
  let pdfUrl: string | null = null;
  try {
    const html = renderPlacementReportHtml({
      attemptId: attempt.id,
      resultId: result.id,
      variantTitle: { en: attempt.test.titleEn, ar: attempt.test.titleAr },
      studentName,
      studentEmail,
      submittedAt: now,
      cefrLevel: scored.cefrLevel,
      score: scored.score,
      maxScore: scored.maxScore,
      percent: scored.percent,
      sectionBreakdown: Object.values(scored.sectionBreakdown).map((s) => ({
        titleEn: s.titleEn,
        titleAr: s.titleAr,
        score: s.score,
        max: s.max,
        percent: s.percent,
      })),
      recommendations: recs.map((r) => ({
        packageType: r.packageType,
        reasonEn: r.reasonEn,
        reasonAr: r.reasonAr,
        confidence: r.confidence,
      })),
    });
    const upload = await uploadPlacementReport({ resultId: result.id, body: Buffer.from(html, "utf-8") });
    if (upload.ok && upload.path) {
      pdfPath = upload.path;
      pdfUrl = await getPlacementReportSignedUrl(upload.path);
      await prisma.placementResult.update({
        where: { id: result.id },
        data: { pdfPath, pdfUrl },
      });
    }
  } catch (e) {
    console.error("[placement] pdf upload failed:", e);
  }

  // Auto-lead creation (guests only — students already have an account).
  let leadId: string | null = null;
  if (!attempt.studentId && attempt.guestEmail) {
    try {
      const lead = await prisma.contactSubmission.create({
        data: {
          name: attempt.guestName || "Placement guest",
          email: attempt.guestEmail,
          phone: attempt.guestPhone,
          subject: "PLACEMENT_TEST_LEAD",
          message: `Placement test completed.\nVariant: ${attempt.test.variant}\nCEFR: ${scored.cefrLevel}\nScore: ${scored.score}/${scored.maxScore} (${scored.percent.toFixed(1)}%)\nRecommended package(s): ${recs.map((r) => r.packageType).join(", ")}`,
          source: "placement_test",
          status: "NEW",
        },
      });
      leadId = lead.id;
      await prisma.placementResult.update({
        where: { id: result.id },
        data: { leadCreated: true, leadId },
      });
    } catch (e) {
      console.error("[placement] lead creation failed:", e);
    }
  }

  await audit.mutation(session?.user.id ?? null, "PLACEMENT_SUBMITTED", "PlacementAttempt", attempt.id, {
    cefr: scored.cefrLevel,
    percent: scored.percent,
    leadCreated: !!leadId,
  });

  // Notify admin + student/guest.
  await notifyAdmins({
    type: "PLACEMENT_RESULT",
    title: "Placement test completed",
    titleAr: "تم إنهاء اختبار تحديد المستوى",
    body: `${studentName} (${studentEmail}) scored ${scored.cefrLevel} (${scored.percent.toFixed(0)}%) on ${attempt.test.variant}.`,
    bodyAr: `${studentName} (${studentEmail}) حصل على ${scored.cefrLevel} (${scored.percent.toFixed(0)}٪).`,
    channels: leadId ? ["inApp", "email"] : ["inApp"],
    actionUrl: leadId ? `/admin/placement-tests/leads` : `/admin/placement-tests`,
    actionLabel: leadId ? "View lead" : "View result",
    actionLabelAr: leadId ? "عرض الطلب" : "عرض النتيجة",
    priority: leadId ? "HIGH" : "NORMAL",
    refType: "PlacementResult",
    refId: result.id,
  });

  // Notify student in-app.
  if (attempt.studentId) {
    const sp = await prisma.studentProfile.findUnique({
      where: { id: attempt.studentId },
      select: { userId: true },
    });
    if (sp) {
      await notify({
        userId: sp.userId,
        type: "PLACEMENT_RESULT",
        title: "Your placement result is ready",
        titleAr: "نتيجة اختبارك جاهزة",
        body: `You scored ${scored.cefrLevel} (${scored.percent.toFixed(0)}%).`,
        bodyAr: `حصلت على ${scored.cefrLevel} (${scored.percent.toFixed(0)}٪).`,
        channels: ["inApp", "email"],
        actionUrl: `/${"ar"}/placement-test/results/${attempt.id}`,
        actionLabel: "View",
        actionLabelAr: "عرض",
        priority: "NORMAL",
        refType: "PlacementResult",
        refId: result.id,
      });
    }
  } else if (studentEmail) {
    // Email guest with link.
    await sendEmail({
      to: studentEmail,
      subject: `Your Placement Result — Hajr Academy / نتيجة اختبارك`,
      html: `<p>Hello ${studentName},</p>
        <p>You scored <b>${scored.cefrLevel}</b> (${scored.percent.toFixed(1)}%) on the ${attempt.test.titleEn}.</p>
        ${pdfUrl ? `<p><a href="${pdfUrl}">Download your PDF report</a></p>` : ""}
        <p>مرحباً ${studentName}، حصلت على المستوى <b>${scored.cefrLevel}</b> (${scored.percent.toFixed(1)}٪).</p>`,
      text: `You scored ${scored.cefrLevel} (${scored.percent.toFixed(1)}%) on Hajr Academy placement test.`,
    }).catch(() => {});
    await prisma.placementResult.update({
      where: { id: result.id },
      data: { emailedTo: studentEmail, emailedAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    resultId: result.id,
    cefrLevel: scored.cefrLevel,
    percent: scored.percent,
    pdfUrl,
  });
}
