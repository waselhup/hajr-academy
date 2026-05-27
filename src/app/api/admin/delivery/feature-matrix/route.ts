import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toCsv } from "@/lib/delivery/feature-matrix";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const csv = toCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-feature-matrix.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
