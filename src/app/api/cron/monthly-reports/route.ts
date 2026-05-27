/**
 * /api/cron/monthly-reports — generates monthly parent reports.
 *
 * Vercel Cron invokes this on the 1st of every month at 08:00 KSA.
 * For each active StudentProfile, generates the previous month's
 * report. Idempotent thanks to the unique (studentId, year, month)
 * index on ParentReport.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMonthlyReport } from "@/lib/reports/generate-monthly";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface TickResult {
  total: number;
  generated: number;
  failed: number;
  year: number;
  month: number;
}

async function runTick(): Promise<TickResult> {
  const now = new Date();
  // Previous month
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();

  const students = await prisma.studentProfile.findMany({
    where: { user: { isActive: true } },
    select: { id: true },
  });

  let generated = 0;
  let failed = 0;

  for (const s of students) {
    try {
      const res = await generateMonthlyReport({
        studentId: s.id,
        year,
        month,
        generatedById: "system",
      });
      if (res.ok) generated++;
      else failed++;
    } catch (e) {
      console.error(`[monthly-reports] student ${s.id} failed:`, e);
      failed++;
    }
  }

  return { total: students.length, generated, failed, year, month };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await runTick();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    console.error("[cron/monthly-reports] failed:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "tick failed" },
      { status: 500 }
    );
  }
}

export const POST = GET;
