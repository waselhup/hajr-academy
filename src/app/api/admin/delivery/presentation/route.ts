import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadDeliveryStats } from "@/lib/delivery/stats";
import { generatePresentationPptx } from "@/lib/delivery/presentation-pptx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  try {
    const stats = await loadDeliveryStats();
    const buf = await generatePresentationPptx(stats);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="hajr-academy-v2-delivery.pptx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[delivery/presentation] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "FAILED" },
      { status: 500 }
    );
  }
}
