import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadDeliveryStats } from "@/lib/delivery/stats";
import { generatePresentationPdf } from "@/lib/delivery/presentation-pdf";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const stats = await loadDeliveryStats();
  const buf = generatePresentationPdf(stats);
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-academy-v2-delivery.html"`,
      "Cache-Control": "no-store",
    },
  });
}
