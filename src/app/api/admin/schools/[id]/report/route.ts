import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildSchoolReport, renderSchoolReportHtml } from "@/lib/school/report";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/schools/[id]/report — partner-school report.
 *
 * `?format=html` serves a print-ready bilingual document (default);
 * `?format=json` returns the structured data.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const data = await buildSchoolReport(params.id);
    if (!data) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    await logAudit({
      userId: session.user.id,
      action: "SCHOOL_REPORT_GENERATED",
      entity: "PartnerSchool",
      entityId: params.id,
    });

    const format = req.nextUrl.searchParams.get("format") ?? "html";
    if (format === "json") {
      return NextResponse.json({ report: data });
    }

    const html = renderSchoolReportHtml(data);
    return new NextResponse(new Uint8Array(html), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="school-report-${params.id}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[admin/schools/[id]/report] failed:", e);
    return NextResponse.json(
      { error: "Could not generate the report" },
      { status: 500 }
    );
  }
}
