import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** The boolean preference keys a user may toggle. */
const BOOL_KEYS = [
  "emailEnabled", "smsEnabled", "whatsappEnabled", "inAppEnabled",
  "classReminders", "paymentAlerts", "attendanceUpdates", "labFeedback",
  "marketingMessages",
] as const;

/**
 * GET /api/settings/notifications — the current user's notification
 * preferences. Returns sensible defaults if no row exists yet.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });
    return NextResponse.json({
      preferences: pref ?? {
        emailEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
        inAppEnabled: true,
        classReminders: true,
        paymentAlerts: true,
        attendanceUpdates: true,
        labFeedback: true,
        marketingMessages: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: "Asia/Riyadh",
      },
    });
  } catch (e) {
    console.error("[api/settings/notifications] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/notifications — update preferences (upsert).
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of BOOL_KEYS) {
      if (typeof body[key] === "boolean") data[key] = body[key];
    }
    if ("quietHoursStart" in body) {
      data.quietHoursStart = body.quietHoursStart || null;
    }
    if ("quietHoursEnd" in body) {
      data.quietHoursEnd = body.quietHoursEnd || null;
    }

    const pref = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    });

    return NextResponse.json({ preferences: pref });
  } catch (e) {
    console.error("[api/settings/notifications] PUT failed:", e);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
