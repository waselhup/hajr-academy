import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  parentOwnsChild,
  getChildAttendanceCalendar,
} from "@/lib/parent/children";

export const dynamic = "force-dynamic";

/**
 * GET /api/parent/children/[childId]/attendance?year=&month= — a child's
 * monthly attendance calendar. Defaults to the current month.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Parents only" }, { status: 403 });
  }

  try {
    if (!(await parentOwnsChild(session.user.id, params.childId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const now = new Date();
    const year = parseInt(
      req.nextUrl.searchParams.get("year") ?? String(now.getFullYear()),
      10
    );
    const month = parseInt(
      req.nextUrl.searchParams.get("month") ?? String(now.getMonth() + 1),
      10
    );
    const calendar = await getChildAttendanceCalendar(
      params.childId,
      year,
      month >= 1 && month <= 12 ? month : now.getMonth() + 1
    );
    return NextResponse.json({ calendar });
  } catch (e) {
    console.error("[api/parent/children/attendance] failed:", e);
    return NextResponse.json(
      { error: "Failed to load attendance" },
      { status: 500 }
    );
  }
}
