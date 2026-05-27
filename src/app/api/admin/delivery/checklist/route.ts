import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  let md = "";
  try {
    md = readFileSync(
      join(process.cwd(), "delivery", "HANDOVER-CHECKLIST.md"),
      "utf8"
    );
  } catch {
    md = "# Handover checklist\n\nFile not found at deploy time.";
  }
  return new NextResponse(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-handover-checklist.md"`,
    },
  });
}
