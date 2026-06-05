/**
 * POST /api/tech-check/save — persist a tech check result.
 *
 * Pass/fail + score are delegated to evaluateTechCheck (the single source of
 * truth, unit-tested). Region-realistic thresholds live there; the wizard's
 * PASS block (tech-check-wizard.tsx) mirrors them for display only.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { evaluateTechCheck } from "@/lib/teacher/tech-check-score";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");

  // The speed-test step POSTs a raw 1 MB payload here purely to measure
  // upload bandwidth (?probe=upload). It is NOT a real check result — drain
  // and ack it so it never creates a junk TechCheck row or a false admin
  // failure alert.
  if (req.nextUrl.searchParams.get("probe") === "upload") {
    await req.arrayBuffer().catch(() => null);
    return NextResponse.json({ ok: true, probe: true });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    sessionId: string;
    downloadMbps: number;
    uploadMbps: number;
    latencyMs: number;
    audioPeakDb: number;
    cameraOk: boolean;
    micOk: boolean;
  }>;

  const downloadMbps = Number(body.downloadMbps ?? 0);
  const uploadMbps = Number(body.uploadMbps ?? 0);
  const latencyMs = Math.round(Number(body.latencyMs ?? 0));
  const audioPeakDb = Number(body.audioPeakDb ?? -100);
  const cameraOk = !!body.cameraOk;
  const micOk = !!body.micOk;

  const { passed, score, failures } = evaluateTechCheck({
    downloadMbps,
    uploadMbps,
    latencyMs,
    audioPeakDb,
    cameraOk,
    micOk,
  });

  const row = await prisma.techCheck.create({
    data: {
      teacherId: session.user.id,
      sessionId: body.sessionId ?? null,
      downloadMbps,
      uploadMbps,
      latencyMs,
      audioPeakDb,
      cameraOk,
      micOk,
      score,
      passed,
      failureReasons: failures,
    },
  });

  await audit.mutation(session.user.id, "TECH_CHECK_RAN", "TechCheck", row.id, {
    passed,
    score,
    failures,
  });

  // On any FAILURE, alert every admin once + drop a dedicated audit row.
  // This is the single chokepoint for every surface (dashboard wizard and
  // the mandatory class-entry modal both POST here), so exactly one
  // notification fires per failed attempt. Non-fatal: a notify error must
  // never break the teacher's save.
  if (!passed) {
    try {
      const teacherName = session.user.name ?? "A teacher";
      const reason = failures.join(", ") || "unknown";
      await notifyAdmins({
        type: "SYSTEM_ANNOUNCEMENT",
        title: `Tech-check failed: ${teacherName}`,
        titleAr: `فشل فحص الجاهزية: ${teacherName}`,
        body: `${teacherName} failed the pre-class tech check (${reason}).`,
        bodyAr: `لم يجتز ${teacherName} فحص الجاهزية قبل الحصة (${reason}).`,
        channels: ["inApp"],
        actionUrl: "/admin/tech-checks",
        actionLabel: "View tech-check log",
        actionLabelAr: "عرض سجل الفحوصات",
        priority: "HIGH",
        refType: "TechCheck",
        refId: row.id,
      });
      await audit.mutation(session.user.id, "TECH_CHECK_FAILED_ALERT", "TechCheck", row.id, {
        score,
        failures,
      });
    } catch (e) {
      console.error("[tech-check] admin failure alert failed (non-fatal):", e);
    }
  }

  return NextResponse.json({ ok: true, check: row, passed, score, failures });
}
