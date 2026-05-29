import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { PackageType } from "@prisma/client";

/**
 * POST /api/checkout — public landing-page purchase.
 * Customer submits student name + phone (required) + email (optional) + package.
 * Creates a PurchaseOrder. In mock payment mode (no MOYASAR_SECRET_KEY) the order
 * is marked PAID immediately so the flow is demoable end-to-end; when a real
 * Moyasar key is configured, swap the mock block for a real charge + callback.
 * Admins are notified to provision the student account.
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

    // Mock payment: succeed immediately when no real Moyasar key is configured.
    const mockMode = !process.env.MOYASAR_SECRET_KEY;
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

    // Notify all active admins to provision the student.
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "PAYMENT_RECEIVED" as const,
          title: `New purchase from ${parsed.data.studentName}`,
          titleAr: `عملية شراء جديدة من ${parsed.data.studentName}`,
          body: `Package: ${pkg}, Amount: ${amountSar} SAR, Phone: ${parsed.data.phone}`,
          bodyAr: `الباقة: ${pkg}، المبلغ: ${amountSar} ر.س، الجوال: ${parsed.data.phone}`,
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
    });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
