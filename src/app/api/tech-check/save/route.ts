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

export const dynamic = "force-dynamic";

const PASS = {
  downloadMbps: 5,
  uploadMbps: 1,
  latencyMs: 200,
  audioPeakDb: -30,
};

export async function POST(req: NextRequest) {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
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

  return NextResponse.json({ ok: true, check: row, passed, score, failures });
}
