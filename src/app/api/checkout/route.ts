import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { gatewayMode } from "@/lib/finance/moyasar";
import { getProduct, priceProduct } from "@/lib/finance/catalog";
import { GRADE_VALUES, TIME_VALUES } from "@/lib/finance/checkout-options";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";

/**
 * POST /api/checkout — public landing-page purchase.
 *
 * Takes the buyer's details plus a catalogue product slug and an optional
 * promo code. The price is looked up server-side from CatalogProduct and
 * the discount is validated server-side — the browser sends no amounts, so
 * a tampered client cannot change what it will be charged.
 *
 * Creates a PENDING PurchaseOrder; the browser then goes to
 * /checkout/pay/[orderId] where Moyasar's hosted form takes the payment.
 * The order becomes PAID only when the gateway confirms it (see
 * adoptPurchaseOrderPayment), which re-checks the amount against the order.
 *
 * Mock mode (localhost, no keys) still settles immediately so the flow
 * stays demoable; on any deployed environment that path is unreachable.
 */

const checkoutSchema = z.object({
  studentName: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^(\+966|05)\d{8,}$/, "Phone must start with 05 or +966"),
  // Required: it is the identity the buyer's account is created under and
  // the address the "choose your password" link is sent to. Without it the
  // purchase cannot be turned into a login.
  email: z.string().email(),
  /** Catalogue slug — the only thing that determines the price. */
  product: z.string().min(1).max(80),
  /** School year. Required only when the chosen product asks for it. */
  gradeLevel: z.enum(GRADE_VALUES as [string, ...string[]]).optional(),
  /** Which teaching window the buyer picked. */
  preferredTime: z.enum(TIME_VALUES as [string, ...string[]]),
  promoCode: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  // Unauthenticated and public: throttle per IP. Without this the route is
  // both an order-flood vector (every order alerts every admin) and a promo
  // -code oracle, since the reply says exactly why a code was rejected.
  const ipHash = shortHash(ipFromHeaders(req.headers) ?? "");
  const rl = rateLimit(`checkout:${ipHash || "anon"}`, 10, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }

  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const product = await getProduct(parsed.data.product);
    if (!product) {
      return NextResponse.json(
        { error: "This package is not available." },
        { status: 400 }
      );
    }

    // Whether the school year is mandatory is the product's call, not the
    // browser's — a client that omits the field cannot skip the question.
    if (product.requiresGradeLevel && !parsed.data.gradeLevel) {
      return NextResponse.json(
        {
          error: "الرجاء اختيار الصف الدراسي. / Please select the school year.",
        },
        { status: 400 }
      );
    }

    const priced = await priceProduct({
      product,
      promoCodeStr: parsed.data.promoCode,
      buyerPhone: parsed.data.phone,
    });

    // The buyer typed a code that did not apply. Charging them full price
    // without saying so is how disputes start — stop and tell them.
    if (parsed.data.promoCode?.trim() && !priced.promoCode) {
      return NextResponse.json(
        {
          error:
            priced.promoErrorAr ?? priced.promoError ?? "Invalid promo code.",
          promoRejected: true,
        },
        { status: 400 }
      );
    }

    // Only localhost-without-keys settles without a charge.
    const mockMode = gatewayMode() === "mock";
    const paymentStatus = mockMode ? ("PAID" as const) : ("PENDING" as const);

    const order = await prisma.purchaseOrder.create({
      data: {
        studentName: parsed.data.studentName,
        phone: parsed.data.phone,
        email: parsed.data.email.trim().toLowerCase(),
        packageType: (product.packageType as never) ?? "INTEGRATED",
        productSlug: product.slug,
        gradeLevel: product.requiresGradeLevel ? parsed.data.gradeLevel ?? null : null,
        preferredTime: parsed.data.preferredTime,
        notes: parsed.data.notes || null,
        listPriceSar: priced.listPriceSar.toFixed(2),
        discountSar: priced.discountSar.toFixed(2),
        promoCode: priced.promoCode,
        amountSar: priced.totalSar.toFixed(2),
        paymentStatus,
        paidAt: paymentStatus === "PAID" ? new Date() : null,
        moyasarPaymentId: mockMode ? `mock_${crypto.randomUUID()}` : null,
        source: "landing_checkout",
      },
    });

    // Notify admins. An unpaid order is a lead, not a sale — the paid
    // notification fires from the gateway settlement instead.
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      const paid = paymentStatus === "PAID";
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "PAYMENT_RECEIVED" as const,
          title: paid
            ? `New purchase from ${parsed.data.studentName}`
            : `New checkout started by ${parsed.data.studentName}`,
          titleAr: paid
            ? `عملية شراء جديدة من ${parsed.data.studentName}`
            : `بدء عملية شراء من ${parsed.data.studentName}`,
          body: `${product.nameEn} — ${priced.totalSar.toFixed(2)} SAR${
            priced.promoCode ? ` (promo ${priced.promoCode})` : ""
          }, phone ${parsed.data.phone} — payment ${paymentStatus}`,
          bodyAr: `${product.nameAr} — ${priced.totalSar.toFixed(2)} ر.س${
            priced.promoCode ? ` (خصم ${priced.promoCode})` : ""
          }، الجوال ${parsed.data.phone} — حالة الدفع ${paymentStatus}`,
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
      metadata: {
        studentName: parsed.data.studentName,
        product: product.slug,
        listPriceSar: priced.listPriceSar,
        discountSar: priced.discountSar,
        amountSar: priced.totalSar,
        promoCode: priced.promoCode,
        gradeLevel: parsed.data.gradeLevel ?? null,
        preferredTime: parsed.data.preferredTime,
        mockMode,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentStatus,
      /** false → the browser must go to /checkout/pay/[orderId] to pay. */
      settled: paymentStatus === "PAID",
      total: priced.totalSar,
      discount: priced.discountSar,
      promoApplied: priced.promoCode,
      promoError: priced.promoErrorAr ?? priced.promoError ?? null,
    });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
