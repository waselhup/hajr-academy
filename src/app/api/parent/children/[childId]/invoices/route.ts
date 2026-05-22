import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parentOwnsChild } from "@/lib/parent/children";

export const dynamic = "force-dynamic";

/**
 * GET /api/parent/children/[childId]/invoices — a child's invoice history.
 * Lets the parent see, download, and (on the portal) pay invoices.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Parents only" }, { status: 403 });
  }

  try {
    if (!(await parentOwnsChild(session.user.id, params.childId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await prisma.invoice.findMany({
      where: { studentId: params.childId },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });

    const invoices = rows.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.invoiceStatus,
      totalAmount: Number(inv.totalSar),
      issuedAt: inv.issuedAt.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ invoices });
  } catch (e) {
    console.error("[api/parent/children/invoices] failed:", e);
    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }
}
