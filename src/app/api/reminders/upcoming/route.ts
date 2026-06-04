import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/**
 * GET /api/reminders/upcoming
 *
 * Lightweight, auth-gated, role-scoped feed of the current user's calendar
 * events starting within the next 24h. Used by <UpcomingReminders/> to surface
 * calm corner toasts. Reuses getCalendarEvents() for the exact same visibility
 * rules as the full calendar — no new access logic, no PII beyond the user's
 * own events. Returns a minimal shape (id/type/title/startAt).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const to = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const events = await getCalendarEvents({
      userId: session.user.id,
      role: session.user.role,
      from: now,
      to,
    });

    // Only items that actually START within the window (getCalendarEvents also
    // returns events that merely overlap, e.g. long/ongoing ones).
    const upcoming = events
      .filter((e) => e.startAt.getTime() >= now.getTime() && e.startAt.getTime() <= to.getTime())
      .slice(0, 20)
      .map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        titleAr: e.titleAr,
        startAt: e.startAt.toISOString(),
      }));

    return NextResponse.json({ events: upcoming });
  } catch (e) {
    console.error("[api/reminders/upcoming] GET failed:", e);
    return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 });
  }
}
