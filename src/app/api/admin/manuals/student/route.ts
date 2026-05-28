import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildStudentManual } from "@/lib/manuals/student-manual";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const lang = req.nextUrl.searchParams.get("lang") === "ar" ? "ar" : "en";
  const html = buildStudentManual(lang);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-academy-student-manual-${lang}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
