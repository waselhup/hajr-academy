import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createParentInvite } from "@/lib/parent/invites";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/parent-invites — list parent invites (admin).
 * Optional query: status, studentId.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const where: Prisma.ParentInviteWhereInput = {};
    const status = sp.get("status");
    if (status) {
      where.status = status as Prisma.ParentInviteWhereInput["status"];
    }
    const studentId = sp.get("studentId");
    if (studentId) where.studentId = studentId;

    const rows = await prisma.parentInvite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        student: {
          include: { user: { select: { name: true, nameAr: true } } },
        },
      },
    });

    const now = new Date();
    const invites = rows.map((inv) => ({
      id: inv.id,
      inviteCode: inv.inviteCode,
      studentName: inv.student.user.name,
      // A still-PENDING invite past its expiry is effectively expired.
      status:
        inv.status === "PENDING" && inv.expiresAt < now
          ? "EXPIRED"
          : inv.status,
      email: inv.email,
      phone: inv.phone,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));

    return NextResponse.json({ invites });
  } catch (e) {
    console.error("[admin/parent-invites] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load invites" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/parent-invites — generate a parent invite for a student.
 * Body: { studentId, email?, phone? }.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const studentId =
      typeof body.studentId === "string" ? body.studentId : "";
    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    const result = await createParentInvite({
      studentId,
      email: typeof body.email === "string" ? body.email : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      createdBy: session.user.id,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, code: result.code });
  } catch (e) {
    console.error("[admin/parent-invites] POST failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not create invite" },
      { status: 500 }
    );
  }
}
