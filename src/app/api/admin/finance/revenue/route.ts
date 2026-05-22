import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRevenueCharts } from "@/lib/finance/stats";

export const dynamic = "force-dynamic";

/** GET /api/admin/finance/revenue — chart datasets for the dashboard. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const charts = await getRevenueCharts();
    return NextResponse.json({ charts });
  } catch (e) {
    console.error("[api/admin/finance/revenue] failed:", e);
    return NextResponse.json(
      { error: "Failed to load revenue data" },
      { status: 500 }
    );
  }
}
