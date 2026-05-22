import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parentOwnsChild, getChildSkillLevels } from "@/lib/parent/children";

export const dynamic = "force-dynamic";

/**
 * GET /api/parent/children/[childId]/progress — a child's CEFR skill
 * levels. Access is gated to the child's own parent.
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
    const skills = await getChildSkillLevels(params.childId);
    return NextResponse.json({ skills });
  } catch (e) {
    console.error("[api/parent/children/progress] failed:", e);
    return NextResponse.json(
      { error: "Failed to load progress" },
      { status: 500 }
    );
  }
}
