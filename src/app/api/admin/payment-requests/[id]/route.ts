/**
 * PATCH /api/admin/payment-requests/[id]
 * Body: { action: "approve" | "markPaid" | "reject", reason?, paidMethod?, paidReference? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { markUnderlyingPaid } from "@/lib/payment-requests/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: "approve" | "markPaid" | "reject";
    reason?: string;
    paidMethod?: string;
    paidReference?: string;
    notes?: string;
  };

  const reqRow = await prisma.paymentRequest.findUnique({
    where: { id },
    include: { requester: true },
  });
  if (!reqRow) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  let result;
  let auditAction = "";
  let notifyType: "PAYMENT_REQUEST_APPROVED" | "PAYMENT_REQUEST_PAID" | "PAYMENT_REQUEST_REJECTED";
  let notifyTitleEn = "";
  let notifyTitleAr = "";

  if (body.action === "approve") {
    if (reqRow.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `cannot approve from ${reqRow.status}` },
        { status: 400 }
      );
    }
    result = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: body.notes ?? reqRow.notes,
      },
    });
    auditAction = "PAYMENT_REQUEST_APPROVED";
    notifyType = "PAYMENT_REQUEST_APPROVED";
    notifyTitleEn = "Your payment request was approved";
    notifyTitleAr = "تمت الموافقة على طلب الدفع";

    // Calendar event for the admin (PAYMENT_DUE)
    try {
      await prisma.calendarEvent.create({
        data: {
          type: "PAYMENT_DUE",
          title: `Pay ${reqRow.requester.name}: ${reqRow.amount} SAR`,
          titleAr: `دفع ${reqRow.requester.nameAr || reqRow.requester.name}: ${reqRow.amount} ر.س`,
          startAt: new Date(),
          endAt: new Date(Date.now() + 60 * 60_000),
          allDay: false,
          metadata: { paymentRequestId: id },
          createdBy: session.user.id,
        },
      });
    } catch (e) {
      console.error("[payment-request:approve] cal failed:", e);
    }
  } else if (body.action === "markPaid") {
    if (reqRow.status !== "APPROVED") {
      return NextResponse.json(
        { ok: false, error: `cannot mark paid from ${reqRow.status}` },
        { status: 400 }
      );
    }
    if (!body.paidMethod) {
      return NextResponse.json(
        { ok: false, error: "paidMethod required" },
        { status: 400 }
      );
    }
    result = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: "PAID",
        paidById: session.user.id,
        paidAt: new Date(),
        paidMethod: body.paidMethod,
        paidReference: body.paidReference ?? null,
        notes: body.notes ?? reqRow.notes,
      },
    });
    auditAction = "PAYMENT_REQUEST_PAID";
    notifyType = "PAYMENT_REQUEST_PAID";
    notifyTitleEn = "Your payment has been sent";
    notifyTitleAr = "تم تحويل مستحقاتك";

    // Cascade: mark underlying TeacherEarning / Commission as PAID
    try {
      const cascade = await markUnderlyingPaid({
        requesterId: reqRow.requesterId,
        requesterRole: reqRow.requesterRole,
        periodStart: reqRow.periodStart,
        periodEnd: reqRow.periodEnd,
        paidById: session.user.id,
      });
      await audit.mutation(
        session.user.id,
        "PAYMENT_REQUEST_CASCADE",
        "PaymentRequest",
        id,
        cascade
      );
    } catch (e) {
      console.error("[payment-request:markPaid] cascade failed:", e);
    }
  } else if (body.action === "reject") {
    if (reqRow.status === "PAID") {
      return NextResponse.json(
        { ok: false, error: "cannot reject a paid request" },
        { status: 400 }
      );
    }
    result = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedReason: body.reason ?? null,
        notes: body.notes ?? reqRow.notes,
      },
    });
    auditAction = "PAYMENT_REQUEST_REJECTED";
    notifyType = "PAYMENT_REQUEST_REJECTED";
    notifyTitleEn = "Your payment request was rejected";
    notifyTitleAr = "رُفض طلب الدفع";
  } else {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }

  await audit.mutation(session.user.id, auditAction, "PaymentRequest", id, {
    amount: Number(reqRow.amount),
  });

  // Notify requester
  try {
    await notify({
      userId: reqRow.requesterId,
      type: notifyType,
      title: notifyTitleEn,
      titleAr: notifyTitleAr,
      body: `Amount: ${reqRow.amount} SAR. ${body.reason ?? body.paidMethod ?? ""}`,
      bodyAr: `المبلغ: ${reqRow.amount} ر.س. ${body.reason ?? body.paidMethod ?? ""}`,
      channels:
        body.action === "markPaid" ? ["inApp", "email", "sms"] : ["inApp", "email"],
      actionUrl:
        reqRow.requesterRole === "TEACHER"
          ? `/ar/teacher/payment-requests`
          : `/ar/marketer/payment-requests`,
      actionLabel: "View",
      actionLabelAr: "عرض",
      priority: body.action === "markPaid" ? "HIGH" : "NORMAL",
      refType: "PaymentRequest",
      refId: id,
    });
  } catch (e) {
    console.error("[payment-request] notify failed:", e);
  }

  return NextResponse.json({ ok: true, request: result });
}
