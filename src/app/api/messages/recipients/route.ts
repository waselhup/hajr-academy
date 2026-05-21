import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllowedRecipients } from "@/lib/comms/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/recipients?q=... — the users the current user is
 * permitted to message, filtered by an optional name query.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const all = await getAllowedRecipients(session.user.id, session.user.role);
    const filtered = q
      ? all.filter((r) => r.name.toLowerCase().includes(q))
      : all;
    return NextResponse.json({
      recipients: filtered.slice(0, 50),
    });
  } catch (e) {
    console.error("[api/messages/recipients] failed:", e);
    return NextResponse.json(
      { error: "Failed to load recipients" },
      { status: 500 }
    );
  }
}
