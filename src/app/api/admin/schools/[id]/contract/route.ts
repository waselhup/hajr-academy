import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { ContractStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VAT_RATE = 0.15;
const STATUSES: ContractStatus[] = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];

/**
 * POST /api/admin/schools/[id]/contract — create or update a B2B contract.
 *
 * Body: { contractId?, programId?, startDate, endDate, totalStudents,
 *         pricePerStudent, status?, notes? }. Totals + VAT are computed
 *         server-side. Providing `contractId` updates that contract.
 */
export async function POST(
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
    const school = await prisma.partnerSchool.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const body = await req.json();
    const totalStudents = Number(body.totalStudents);
    const pricePerStudent = Number(body.pricePerStudent);
    if (
      !Number.isFinite(totalStudents) ||
      totalStudents < 1 ||
      !Number.isFinite(pricePerStudent) ||
      pricePerStudent < 0
    ) {
      return NextResponse.json(
        { error: "Invalid student count or price" },
        { status: 400 }
      );
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    // Compute totals server-side.
    const subtotal = +(totalStudents * pricePerStudent).toFixed(2);
    const vatAmount = +(subtotal * VAT_RATE).toFixed(2);
    const totalAmount = +(subtotal + vatAmount).toFixed(2);

    const status: ContractStatus = STATUSES.includes(body.status)
      ? body.status
      : "DRAFT";
    const signedAt =
      status === "ACTIVE" || status === "COMPLETED" ? new Date() : null;

    const data = {
      programId:
        typeof body.programId === "string" && body.programId
          ? body.programId
          : null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      totalStudents,
      pricePerStudent,
      totalAmount: subtotal,
      vatAmount,
      status,
      notes: typeof body.notes === "string" ? body.notes : null,
    };

    let contractId: string;
    if (typeof body.contractId === "string" && body.contractId) {
      const updated = await prisma.schoolContract.update({
        where: { id: body.contractId },
        data: { ...data, signedAt },
      });
      contractId = updated.id;
    } else {
      const created = await prisma.schoolContract.create({
        data: { schoolId: params.id, ...data, signedAt },
      });
      contractId = created.id;
    }

    await logAudit({
      userId: session.user.id,
      action: body.contractId ? "SCHOOL_CONTRACT_UPDATED" : "SCHOOL_CONTRACT_CREATED",
      entity: "SchoolContract",
      entityId: contractId,
      metadata: { schoolId: params.id, totalAmount, status },
    });

    return NextResponse.json({
      ok: true,
      contractId,
      subtotal,
      vatAmount,
      totalAmount,
    });
  } catch (e) {
    console.error("[admin/schools/[id]/contract] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not save the contract" },
      { status: 500 }
    );
  }
}
