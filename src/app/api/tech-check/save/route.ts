/**
 * POST /api/tech-check/save — persist a tech check result.
 *
 * Pass criteria:
 *   download ≥ 5 Mbps, upload ≥ 1 Mbps, latency < 200 ms,
 *   audio peak > -30 dB, camera + mic granted.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";

export const dynamic = "force-dynamic";

const PASS = {
  downloadMbps: 5,
  uploadMbps: 1,
  latencyMs: 200,
  audioPeakDb: -30,
};

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

  const failures: string[] = [];
  if (downloadMbps < PASS.downloadMbps) failures.push("downloadMbps");
  if (uploadMbps < PASS.uploadMbps) failures.push("uploadMbps");
  if (latencyMs >= PASS.latencyMs || latencyMs <= 0) failures.push("latencyMs");
  if (audioPeakDb <= PASS.audioPeakDb) failures.push("audioPeakDb");
  if (!cameraOk) failures.push("camera");
  if (!micOk) failures.push("mic");

  // Score: heuristic, 100 minus penalties
  let score = 100;
  if (downloadMbps < PASS.downloadMbps) score -= 25;
  else if (downloadMbps < 10) score -= 10;
  if (uploadMbps < PASS.uploadMbps) score -= 15;
  if (latencyMs >= PASS.latencyMs) score -= 25;
  else if (latencyMs > 100) score -= 10;
  if (audioPeakDb <= PASS.audioPeakDb) score -= 15;
  if (!cameraOk) score -= 10;
  if (!micOk) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const passed = failures.length === 0;

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
