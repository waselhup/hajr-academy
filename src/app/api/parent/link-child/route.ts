import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acceptParentInvite } from "@/lib/parent/invites";

export const dynamic = "force-dynamic";

/**
 * POST /api/parent/link-child — redeem an invite code to link the calling
 * parent to a student. Body: { code }.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Parents only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code : "";
    if (!code.trim()) {
      return NextResponse.json({ error: "code required" }, { status: 400 });
    }

    const parent = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "No parent profile" },
        { status: 403 }
      );
    }

    const result = await acceptParentInvite({
      codeStr: code,
      parentProfileId: parent.id,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, errorAr: result.errorAr },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, studentId: result.studentId });
  } catch (e) {
    console.error("[api/parent/link-child] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not link child" },
      { status: 500 }
    );
  }
}
