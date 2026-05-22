import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFinanceStats } from "@/lib/finance/stats";

export const dynamic = "force-dynamic";

/** GET /api/admin/finance/stats — headline finance KPIs. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const stats = await getFinanceStats();
    return NextResponse.json({ stats });
  } catch (e) {
    console.error("[api/admin/finance/stats] failed:", e);
    return NextResponse.json(
      { error: "Failed to load finance stats" },
      { status: 500 }
    );
  }
}
