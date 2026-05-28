import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAdminManual } from "@/lib/manuals/admin-manual";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const lang = req.nextUrl.searchParams.get("lang") === "ar" ? "ar" : "en";
  const html = buildAdminManual(lang);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-academy-admin-manual-${lang}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
