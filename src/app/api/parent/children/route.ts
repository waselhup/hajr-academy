import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChildrenSummary } from "@/lib/parent/children";

export const dynamic = "force-dynamic";

/**
 * GET /api/parent/children — the calling parent's linked children with
 * at-a-glance summary stats (class, attendance rate, next class, sub).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Parents only" }, { status: 403 });
  }

  try {
    const children = await getChildrenSummary(session.user.id);
    return NextResponse.json({ children });
  } catch (e) {
    console.error("[api/parent/children] failed:", e);
    return NextResponse.json(
      { error: "Failed to load children" },
      { status: 500 }
    );
  }
}
