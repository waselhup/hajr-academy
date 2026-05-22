import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcilePayment } from "@/lib/finance/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id] — payment details.
 *
 * Re-reconciles against Moyasar so the returned status is current. The
 * caller must own the parent invoice (student) or be an admin.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        invoice: {
          include: { student: { select: { userId: true } } },
        },
      },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    if (!isAdmin && payment.invoice.student.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Refresh status from Moyasar (best-effort).
    if (payment.status === "INITIATED") {
      await reconcilePayment(payment.id).catch(() => {});
    }
    const fresh = await prisma.payment.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json({
      payment: {
        id: fresh!.id,
        invoiceId: fresh!.invoiceId,
        amount: Number(fresh!.amount),
        currency: fresh!.currency,
        status: fresh!.status,
        cardBrand: fresh!.cardBrand,
        cardLast4: fresh!.cardLast4,
        refundedAmount: Number(fresh!.refundedAmount),
        paidAt: fresh!.paidAt?.toISOString() ?? null,
        failedAt: fresh!.failedAt?.toISOString() ?? null,
        failureMessage: fresh!.failureMessage,
        createdAt: fresh!.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[api/payments/[id]] failed:", e);
    return NextResponse.json(
      { error: "Failed to load payment" },
      { status: 500 }
    );
  }
}
