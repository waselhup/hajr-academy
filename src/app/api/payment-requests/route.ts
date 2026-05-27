/**
 * POST /api/payment-requests — requester (TEACHER/MARKETER) creates a request.
 * GET                       — returns the requester's own requests.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { getAvailableEarnings } from "@/lib/payment-requests/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  const requests = await prisma.paymentRequest.findMany({
    where: { requesterId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const available = await getAvailableEarnings(session.user.id, session.user.role);
  return NextResponse.json({ ok: true, requests, available });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.user.role !== "TEACHER" && session.user.role !== "MARKETER") {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    amount?: number;
    periodStart?: string;
    periodEnd?: string;
    description?: string;
  };
  if (!body.amount || !body.periodStart || !body.periodEnd) {
    return NextResponse.json(
      { ok: false, error: "amount, periodStart, periodEnd required" },
      { status: 400 }
    );
  }
  const periodStart = new Date(body.periodStart);
  const periodEnd = new Date(body.periodEnd);
  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
    return NextResponse.json({ ok: false, error: "invalid dates" }, { status: 400 });
  }
  if (body.amount <= 0) {
    return NextResponse.json({ ok: false, error: "amount must be > 0" }, { status: 400 });
  }

  // Validate against available approved earnings/commissions
  const available = await getAvailableEarnings(session.user.id, session.user.role);
  if (body.amount > available.totalAvailable) {
    return NextResponse.json(
      {
        ok: false,
        error: "amount-exceeds-available",
        available: available.totalAvailable,
      },
      { status: 400 }
    );
  }

  const reqRow = await prisma.paymentRequest.create({
    data: {
      requesterId: session.user.id,
      requesterRole: session.user.role,
      amount: body.amount,
      periodStart,
      periodEnd,
      description: body.description ?? null,
    },
  });

  // Notify all admins
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
      },
      select: { id: true },
    });
    await Promise.allSettled(
      admins.map((a) =>
        notify({
          userId: a.id,
          type: "PAYMENT_REQUEST_SUBMITTED",
          title: `New payment request: ${body.amount} SAR`,
          titleAr: `طلب دفع جديد: ${body.amount} ر.س`,
          body: `${session.user.role} submitted a payment request.`,
          bodyAr: `${session.user.role === "TEACHER" ? "معلم" : "مسوّق"} قدّم طلب دفع جديد`,
          channels: ["inApp", "email"],
          actionUrl: `/ar/admin/payment-requests`,
          actionLabel: "Review",
          actionLabelAr: "مراجعة",
          priority: "NORMAL",
          refType: "PaymentRequest",
          refId: reqRow.id,
        })
      )
    );
  } catch (e) {
    console.error("[payment-requests] notify failed:", e);
  }

  await audit.mutation(
    session.user.id,
    "PAYMENT_REQUEST_CREATED",
    "PaymentRequest",
    reqRow.id,
    { amount: body.amount }
  );
  return NextResponse.json({ ok: true, request: reqRow });
}
