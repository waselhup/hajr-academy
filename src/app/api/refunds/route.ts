import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processRefund } from "@/lib/finance/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/refunds — list refunded / partially-refunded payments (admin).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const rows = await prisma.payment.findMany({
      where: { refundedAmount: { gt: 0 } },
      orderBy: { refundedAt: "desc" },
      include: {
        invoice: {
          include: {
            student: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    });

    const refunds = rows.map((p) => ({
      paymentId: p.id,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoice.invoiceNumber,
      studentName: p.invoice.student.user.name,
      studentEmail: p.invoice.student.user.email,
      originalAmount: Number(p.amount),
      refundedAmount: Number(p.refundedAmount),
      status: p.status,
      reason: p.refundReason,
      refundedAt: p.refundedAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ refunds });
  } catch (e) {
    console.error("[api/refunds] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load refunds" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/refunds — process a refund against a payment (admin).
 * Body: { paymentId, amount?, reason? }. Omit `amount` for a full refund.
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
    const paymentId =
      typeof body.paymentId === "string" ? body.paymentId : "";
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    const amountSar =
      body.amount != null && Number.isFinite(Number(body.amount))
        ? Number(body.amount)
        : undefined;

    const result = await processRefund({
      paymentId,
      amountSar,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      refundedAmount: result.refundedAmount,
      mock: result.mock,
    });
  } catch (e) {
    console.error("[api/refunds] POST failed:", e);
    return NextResponse.json(
      { ok: false, error: "Refund could not be processed" },
      { status: 500 }
    );
  }
}
