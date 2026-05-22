import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parentOwnsChild, getChildSchedule } from "@/lib/parent/children";

export const dynamic = "force-dynamic";

/**
 * GET /api/parent/children/[childId]/schedule — a child's weekly class
 * schedule with teacher and program details.
 */
export async function GET(
  _req: NextRequest,
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
    const schedule = await getChildSchedule(params.childId);
    return NextResponse.json({ schedule });
  } catch (e) {
    console.error("[api/parent/children/schedule] failed:", e);
    return NextResponse.json(
      { error: "Failed to load schedule" },
      { status: 500 }
    );
  }
}
