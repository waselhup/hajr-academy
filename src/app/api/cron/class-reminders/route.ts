/**
 * /api/cron/class-reminders — class reminder pulses.
 *
 * Vercel Cron invokes this every 5 minutes (see vercel.json).
 *   • 24h reminder window: scheduledStartAt ∈ [now+23h45m, now+24h15m]
 *       → notify enrolled students + their parents + the teacher
 *         on inApp + email; mark metadata.reminded_24h
 *   • 1h reminder window:  scheduledStartAt ∈ [now+55m, now+65m]
 *       → notify enrolled students + the teacher on inApp + sms;
 *         mark metadata.reminded_1h
 *
 * Idempotent: each window sets a metadata flag so a subsequent tick
 * within the same window skips already-reminded sessions.
 *
 * Note: ClassSession in this codebase uses `scheduledDate` as the start
 * timestamp. We treat it as the canonical start. No metadata column
 * exists on ClassSession, so we use the `notes` field as a tagged
 * marker: appended "[reminded:24h]" / "[reminded:1h]" entries.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyMany, parentUserIdsForStudents } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TickResult {
  reminded24h: number;
  reminded1h:  number;
  scanned: number;
}

async function runTick(): Promise<TickResult> {
  const now = new Date();
  const lo24 = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 45 * 60 * 1000);
  const hi24 = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000);
  const lo1  = new Date(now.getTime() + 55 * 60 * 1000);
  const hi1  = new Date(now.getTime() + 65 * 60 * 1000);

  // Fetch both windows in parallel.
  const [sessions24, sessions1] = await Promise.all([
    prisma.classSession.findMany({
      where: { status: "SCHEDULED", scheduledDate: { gte: lo24, lte: hi24 } },
      include: {
        class: {
          include: {
            teacher: { include: { user: { select: { id: true } } } },
            enrollments: {
              where: { status: "ACTIVE" },
              include: { student: { select: { id: true, userId: true } } },
            },
          },
        },
      },
    }),
    prisma.classSession.findMany({
      where: { status: "SCHEDULED", scheduledDate: { gte: lo1, lte: hi1 } },
      include: {
        class: {
          include: {
            teacher: { include: { user: { select: { id: true } } } },
            enrollments: {
              where: { status: "ACTIVE" },
              include: { student: { select: { id: true, userId: true } } },
            },
          },
        },
      },
    }),
  ]);

  let reminded24h = 0;
  let reminded1h = 0;

  for (const s of sessions24) {
    if ((s.notes ?? "").includes("[reminded:24h]")) continue;
    const studentUserIds = s.class.enrollments.map((e) => e.student.userId);
    const studentProfileIds = s.class.enrollments.map((e) => e.student.id);
    const parentUserIds = await parentUserIdsForStudents(studentProfileIds);
    const recipients = [
      ...studentUserIds,
      ...parentUserIds,
      s.class.teacher.user.id,
    ];
    await notifyMany(recipients, {
      type: "CLASS_STARTING",
      title: `Reminder: ${s.class.name} in 24 hours`,
      titleAr: `تذكير: ${s.class.nameAr ?? s.class.name} بعد ٢٤ ساعة`,
      body: `Your class "${s.class.name}" starts in 24 hours.`,
      bodyAr: `حصتك "${s.class.nameAr ?? s.class.name}" تبدأ خلال ٢٤ ساعة.`,
      channels: ["inApp", "email"],
      refType: "ClassSession",
      refId: s.id,
      actionUrl: "/calendar",
    });
    await prisma.classSession.update({
      where: { id: s.id },
      data: { notes: ((s.notes ?? "") + " [reminded:24h]").trim() },
    });
    reminded24h++;
  }

  for (const s of sessions1) {
    if ((s.notes ?? "").includes("[reminded:1h]")) continue;
    const studentUserIds = s.class.enrollments.map((e) => e.student.userId);
    const recipients = [...studentUserIds, s.class.teacher.user.id];
    await notifyMany(recipients, {
      type: "CLASS_STARTING",
      title: `${s.class.name} starts in 1 hour`,
      titleAr: `${s.class.nameAr ?? s.class.name} تبدأ خلال ساعة`,
      body: `Your class "${s.class.name}" starts in 1 hour.`,
      bodyAr: `حصتك "${s.class.nameAr ?? s.class.name}" تبدأ خلال ساعة.`,
      channels: ["inApp", "sms"],
      refType: "ClassSession",
      refId: s.id,
      actionUrl: "/calendar",
    });
    await prisma.classSession.update({
      where: { id: s.id },
      data: { notes: ((s.notes ?? "") + " [reminded:1h]").trim() },
    });
    reminded1h++;
  }

  return {
    reminded24h,
    reminded1h,
    scanned: sessions24.length + sessions1.length,
  };
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
    console.error("[cron/class-reminders] failed:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "tick failed" },
      { status: 500 }
    );
  }
}

export const POST = GET;
