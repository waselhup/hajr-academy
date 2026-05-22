import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiatePayment } from "@/lib/finance/payments";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/create — create a Moyasar payment for an invoice.
 *
 * Body: { invoiceId, source }. The caller must own the invoice (student)
 * or be an admin. In mock mode the payment resolves immediately as paid.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: { select: { userId: true } } },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Ownership: students may only pay their own invoices.
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    if (!isAdmin && invoice.student.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const origin = req.nextUrl.origin;
    const source =
      body.source && typeof body.source === "object"
        ? body.source
        : { type: "creditcard" };

    const result = await initiatePayment({
      invoiceId,
      source,
      callbackUrl: `${origin}/api/payments/callback`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      paymentId: result.paymentId,
      moyasarPaymentId: result.moyasarPaymentId,
      status: result.status,
      alreadyPaid: result.alreadyPaid ?? false,
      mock: result.mock,
    });
  } catch (e) {
    console.error("[api/payments/create] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Payment could not be created" },
      { status: 500 }
    );
  }
}
