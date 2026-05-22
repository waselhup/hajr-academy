import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markInvoicePaid, setInvoiceStatus } from "@/lib/finance/invoices";
import { triggerPaymentReceived } from "@/lib/comms/triggers";
import type { InvoiceLineItem } from "@/lib/finance/invoice-pdf";

export const dynamic = "force-dynamic";

/** GET /api/invoices/[id] — full invoice detail (owner or admin). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, nameAr: true, email: true, phone: true },
            },
          },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    if (!isAdmin && inv.student.user.email !== session.user.email) {
      // Re-check by profile ownership rather than email coincidence.
      const owner = await prisma.studentProfile.findUnique({
        where: { id: inv.studentId },
        select: { userId: true },
      });
      if (owner?.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        status: inv.invoiceStatus,
        studentName: inv.student.user.name,
        studentNameAr: inv.student.user.nameAr,
        studentEmail: inv.student.user.email,
        studentPhone: inv.student.user.phone,
        subtotal: Number(inv.subtotalSar),
        discount: Number(inv.discountSar),
        vatAmount: Number(inv.vatSar),
        totalAmount: Number(inv.totalSar),
        lineItems: (inv.lineItems as unknown as InvoiceLineItem[]) ?? [],
        issuedAt: inv.issuedAt.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        paidAt: inv.paidAt?.toISOString() ?? null,
        zatcaQrData: inv.zatcaQrData,
        vatNumber: inv.vatNumber,
        pdfUrl: inv.pdfUrl,
        notes: inv.notes,
        notesAr: inv.notesAr,
        payments: inv.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          cardBrand: p.cardBrand,
          cardLast4: p.cardLast4,
          refundedAmount: Number(p.refundedAmount),
          paidAt: p.paidAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error("[api/invoices/[id]] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load invoice" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[id] — admin invoice status change.
 * Body: { action: "markPaid"|"cancel" }.
 */
export async function PATCH(
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
    const inv = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "markPaid") {
      const res = await markInvoicePaid(params.id, "BANK_TRANSFER");
      if (res.ok && !res.alreadyPaid) {
        await triggerPaymentReceived(params.id).catch(() => {});
      }
      return NextResponse.json({ ok: true, alreadyPaid: res.alreadyPaid });
    }
    if (action === "cancel") {
      if (inv.status === "PAID") {
        return NextResponse.json(
          { error: "A paid invoice cannot be cancelled — issue a refund." },
          { status: 400 }
        );
      }
      await setInvoiceStatus(params.id, "CANCELLED");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[api/invoices/[id]] PATCH failed:", e);
    return NextResponse.json(
      { ok: false, error: "Invoice update failed" },
      { status: 500 }
    );
  }
}
