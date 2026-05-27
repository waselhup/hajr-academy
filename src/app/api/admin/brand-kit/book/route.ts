import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateBrandBookHtml } from "@/lib/brand-kit/book-pdf";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  // Brand book is broadly useful — any logged-in staff can grab it.
  const buf = generateBrandBookHtml();
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-academy-brand-book-v3.html"`,
      "Cache-Control": "no-store",
    },
  });
}
