import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerPaymentDue, triggerPaymentOverdue } from "@/lib/comms/triggers";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/send-reminder — admin: send a payment reminder.
 *
 * Sends an overdue reminder when the invoice is past due, otherwise a
 * payment-due notice. No-op for already-paid/cancelled invoices.
 */
export async function POST(
  _req: NextRequest,
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
    const inv = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, dueDate: true },
    });
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (inv.status === "PAID" || inv.status === "WAIVED") {
      return NextResponse.json(
        { error: "This invoice does not need a reminder" },
        { status: 400 }
      );
    }

    const now = new Date();
    if (inv.dueDate < now) {
      const daysOverdue = Math.max(
        1,
        Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400_000)
      );
      await triggerPaymentOverdue(inv.id, daysOverdue);
    } else {
      await triggerPaymentDue(inv.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/invoices/[id]/send-reminder] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not send reminder" },
      { status: 500 }
    );
  }
}
