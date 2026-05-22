import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parentOwnsChild, getChildGrades } from "@/lib/parent/children";

export const dynamic = "force-dynamic";

/**
 * GET /api/parent/children/[childId]/grades — a child's Lab exercise
 * scores and exam results.
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
    const grades = await getChildGrades(params.childId);
    return NextResponse.json({ grades });
  } catch (e) {
    console.error("[api/parent/children/grades] failed:", e);
    return NextResponse.json(
      { error: "Failed to load grades" },
      { status: 500 }
    );
  }
}
