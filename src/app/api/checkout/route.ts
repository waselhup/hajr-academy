import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { gatewayMode } from "@/lib/finance/moyasar";
import type { PackageType } from "@prisma/client";

/**
 * POST /api/checkout — public landing-page purchase.
 *
 * Customer submits student name + phone (required) + email (optional) +
 * package. Creates a PENDING PurchaseOrder and returns it; the browser then
 * goes to /checkout/pay/[orderId], where Moyasar's hosted form takes the
 * actual payment. The order only becomes PAID when the gateway says so —
 * see adoptPurchaseOrderPayment.
 *
 * Mock mode (localhost, no keys) still settles immediately so the flow stays
 * demoable; on any deployed environment that path is unreachable.
 */

// Server-authoritative package prices (SAR). Never trust a client-sent price.
const PACKAGE_PRICE_SAR: Record<PackageType, number> = {
  ESSENTIAL: 250,
  INTEGRATED: 300,
  PRIVATE: 800,
  SCHOOL: 0, // B2B — not sold via public checkout
  STEP_PREP_PKG: 600,
  IELTS_PREP_PKG: 800,
};

const checkoutSchema = z.object({
  studentName: z.string().min(2).max(100),
  phone: z.string().regex(/^(\+966|05)\d{8,}$/, "Phone must start with 05 or +966"),
  email: z.string().email().optional().or(z.literal("")),
  packageType: z.enum([
    "ESSENTIAL",
    "INTEGRATED",
    "PRIVATE",
    "STEP_PREP_PKG",
    "IELTS_PREP_PKG",
  ]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const pkg = parsed.data.packageType as PackageType;
    const amountSar = PACKAGE_PRICE_SAR[pkg];

    // Only localhost-without-keys settles without a charge. Anywhere the
    // gateway is live (or half-configured) the order stays PENDING until
    // Moyasar confirms the payment.
    const mockMode = gatewayMode() === "mock";
    const paymentStatus = mockMode ? ("PAID" as const) : ("PENDING" as const);

    const order = await prisma.purchaseOrder.create({
      data: {
        studentName: parsed.data.studentName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        packageType: pkg,
        notes: parsed.data.notes || null,
        amountSar: amountSar.toFixed(2),
        paymentStatus,
        paidAt: paymentStatus === "PAID" ? new Date() : null,
        moyasarPaymentId: mockMode ? `mock_${crypto.randomUUID()}` : null,
        source: "landing_checkout",
      },
    });

    // Notify all active admins. When the order still has to be paid this is
    // a lead, not a sale — the paid notification fires from the gateway
    // settlement instead.
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "PAYMENT_RECEIVED" as const,
          title:
            paymentStatus === "PAID"
              ? `New purchase from ${parsed.data.studentName}`
              : `New checkout started by ${parsed.data.studentName}`,
          titleAr:
            paymentStatus === "PAID"
              ? `عملية شراء جديدة من ${parsed.data.studentName}`
              : `بدء عملية شراء من ${parsed.data.studentName}`,
          body: `Package: ${pkg}, Amount: ${amountSar} SAR, Phone: ${parsed.data.phone} — payment ${paymentStatus}`,
          bodyAr: `الباقة: ${pkg}، المبلغ: ${amountSar} ر.س، الجوال: ${parsed.data.phone} — حالة الدفع ${paymentStatus}`,
          actionUrl: "/admin/orders",
          actionLabel: "View order",
          actionLabelAr: "عرض الطلب",
          priority: "HIGH" as const,
          refType: "PurchaseOrder",
          refId: order.id,
        })),
      });
    }

    await logAudit({
      action: "purchase_order_created",
      entity: "PurchaseOrder",
      entityId: order.id,
      metadata: { studentName: parsed.data.studentName, packageType: pkg, amountSar, mockMode },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentStatus,
      /** false → the browser must go to /checkout/pay/[orderId] to pay. */
      settled: paymentStatus === "PAID",
    });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
