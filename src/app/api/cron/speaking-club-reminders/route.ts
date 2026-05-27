/**
 * /api/cron/speaking-club-reminders
 * Runs every 15 min.
 *   - 24h window: notify RSVPs (inApp + email)
 *   - 1h window: notify RSVPs (inApp + sms)
 *   - LIVE_NOW window: realtime broadcast to RSVPs
 *
 * Marker storage uses event.recordingUrl as a JSON-tagged marker field:
 *   appended "[reminded:24h]" / "[reminded:1h]" / "[live:notified]"
 * Idempotent — each marker stops the same window from re-firing.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TickResult {
  reminded24h: number;
  reminded1h: number;
  liveNotified: number;
}

async function runTick(): Promise<TickResult> {
  const now = new Date();
  const lo24 = new Date(now.getTime() + 23 * 60 * 60_000 + 45 * 60_000);
  const hi24 = new Date(now.getTime() + 24 * 60 * 60_000 + 15 * 60_000);
  const lo1 = new Date(now.getTime() + 50 * 60_000);
  const hi1 = new Date(now.getTime() + 70 * 60_000);
  const liveLo = new Date(now.getTime() - 5 * 60_000);
  const liveHi = new Date(now.getTime() + 15 * 60_000);

  const [evts24, evts1, evtsLive] = await Promise.all([
    prisma.speakingClubEvent.findMany({
      where: { status: "UPCOMING", scheduledAt: { gte: lo24, lte: hi24 } },
      include: { rsvps: { include: { student: { include: { user: true } } } } },
    }),
    prisma.speakingClubEvent.findMany({
      where: { status: "UPCOMING", scheduledAt: { gte: lo1, lte: hi1 } },
      include: { rsvps: { include: { student: { include: { user: true } } } } },
    }),
    prisma.speakingClubEvent.findMany({
      where: { status: "UPCOMING", scheduledAt: { gte: liveLo, lte: liveHi } },
      include: { rsvps: { include: { student: { include: { user: true } } } } },
    }),
  ]);

  let reminded24h = 0;
  let reminded1h = 0;
  let liveNotified = 0;

  // 24h window
  for (const e of evts24) {
    if (e.recordingUrl?.includes("[reminded:24h]")) continue;
    await Promise.allSettled(
      e.rsvps.map((r) =>
        notify({
          userId: r.student.user.id,
          type: "SPEAKING_CLUB_REMINDER_24H",
          title: `Reminder: ${e.titleEn} in 24h`,
          titleAr: `تذكير: ${e.titleAr} بعد 24 ساعة`,
          body: `Your Speaking Club session ${e.titleEn} starts at ${e.scheduledAt.toISOString()}`,
          bodyAr: `جلستك في نادي المحادثة ${e.titleAr} تبدأ غداً`,
          channels: ["inApp", "email"],
          actionUrl: `/ar/student/speaking-club`,
          actionLabel: "Details",
          actionLabelAr: "التفاصيل",
          priority: "NORMAL",
          refType: "SpeakingClubEvent",
          refId: e.id,
        })
      )
    );
    await prisma.speakingClubEvent.update({
      where: { id: e.id },
      data: { recordingUrl: `${e.recordingUrl ?? ""}[reminded:24h]` },
    });
    reminded24h += e.rsvps.length;
  }

  // 1h window
  for (const e of evts1) {
    if (e.recordingUrl?.includes("[reminded:1h]")) continue;
    await Promise.allSettled(
      e.rsvps.map((r) =>
        notify({
          userId: r.student.user.id,
          type: "SPEAKING_CLUB_REMINDER_1H",
          title: `Starting soon: ${e.titleEn}`,
          titleAr: `جلسة قريبة: ${e.titleAr}`,
          body: `Your Speaking Club session starts in about 1 hour.`,
          bodyAr: `جلستك في نادي المحادثة تبدأ بعد ساعة تقريباً`,
          channels: ["inApp", "sms"],
          actionUrl: `/ar/student/speaking-club`,
          actionLabel: "Join",
          actionLabelAr: "انضم",
          priority: "HIGH",
          refType: "SpeakingClubEvent",
          refId: e.id,
        })
      )
    );
    await prisma.speakingClubEvent.update({
      where: { id: e.id },
      data: { recordingUrl: `${e.recordingUrl ?? ""}[reminded:1h]` },
    });
    reminded1h += e.rsvps.length;
  }

  // Live window
  for (const e of evtsLive) {
    if (e.recordingUrl?.includes("[live:notified]")) continue;
    await Promise.allSettled(
      e.rsvps.map((r) =>
        notify({
          userId: r.student.user.id,
          type: "SPEAKING_CLUB_LIVE_NOW",
          title: `Live now: ${e.titleEn}`,
          titleAr: `مباشر الآن: ${e.titleAr}`,
          body: `Your Speaking Club session is live.`,
          bodyAr: `جلسة نادي المحادثة بدأت — انضم الآن!`,
          channels: ["inApp", "realtime"],
          actionUrl: e.zoomJoinUrl || `/ar/student/speaking-club`,
          actionLabel: "Join now",
          actionLabelAr: "ادخل الآن",
          priority: "URGENT",
          refType: "SpeakingClubEvent",
          refId: e.id,
        })
      )
    );
    await prisma.speakingClubEvent.update({
      where: { id: e.id },
      data: {
        recordingUrl: `${e.recordingUrl ?? ""}[live:notified]`,
        status: "LIVE",
      },
    });
    liveNotified += e.rsvps.length;
  }

  return { reminded24h, reminded1h, liveNotified };
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
    console.error("[cron/speaking-club-reminders] failed:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "tick failed" },
      { status: 500 }
    );
  }
}

export const POST = GET;
