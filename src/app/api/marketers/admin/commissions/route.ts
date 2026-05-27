import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

type Action = "APPROVE" | "PAY" | "REJECT";

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const action: Action = body.action;
  const reason: string | undefined = body.reason;

  if (ids.length === 0 || !action) {
    return NextResponse.json({ error: "Missing ids or action" }, { status: 400 });
  }

  const commissions = await prisma.commission.findMany({
    where: { id: { in: ids } },
    include: { marketer: { include: { user: { select: { id: true } } } } },
  });

  for (const c of commissions) {
    if (action === "APPROVE" && c.status === "PENDING") {
      await prisma.$transaction([
        prisma.commission.update({
          where: { id: c.id },
          data: { status: "APPROVED", approvedBy: session.user.id, approvedAt: new Date() },
        }),
        prisma.marketerProfile.update({
          where: { id: c.marketerId },
          data: { totalEarned: { increment: c.amount } },
        }),
      ]);
      await audit.mutation(session.user.id, "COMMISSION_APPROVED", "Commission", c.id, {});
      await notify({
        userId: c.marketer.user.id,
        type: "COMMISSION_UPDATE",
        title: "Commission approved",
        titleAr: "تم اعتماد عمولتك",
        body: `Your commission of ${Number(c.amount)} SAR has been approved.`,
        bodyAr: `تم اعتماد عمولتك بقيمة ${Number(c.amount)} ريال.`,
        channels: ["inApp", "email"],
        actionUrl: "/marketer/commissions",
        actionLabel: "View",
        actionLabelAr: "عرض",
        priority: "NORMAL",
        refType: "Commission",
        refId: c.id,
      });
    } else if (action === "PAY" && c.status === "APPROVED") {
      const paidAt = new Date();
      await prisma.$transaction([
        prisma.commission.update({
          where: { id: c.id },
          data: { status: "PAID", paidBy: session.user.id, paidAt },
        }),
        prisma.marketerProfile.update({
          where: { id: c.marketerId },
          data: { totalPaid: { increment: c.amount } },
        }),
        // Calendar event for payment
        prisma.calendarEvent.create({
          data: {
            type: "PAYMENT_DUE",
            title: `Commission paid: ${Number(c.amount)} SAR`,
            titleAr: `صرف عمولة: ${Number(c.amount)} ريال`,
            startAt: paidAt,
            endAt: paidAt,
            allDay: true,
            userId: c.marketer.user.id,
            createdBy: session.user.id,
            metadata: { commissionId: c.id },
          },
        }),
      ]);
      await audit.mutation(session.user.id, "COMMISSION_PAID", "Commission", c.id, { amount: Number(c.amount) });
      await notify({
        userId: c.marketer.user.id,
        type: "COMMISSION_UPDATE",
        title: "Commission paid",
        titleAr: "تم صرف عمولتك",
        body: `Your commission of ${Number(c.amount)} SAR has been paid.`,
        bodyAr: `تم صرف عمولتك بقيمة ${Number(c.amount)} ريال.`,
        channels: ["inApp", "email", "sms"],
        actionUrl: "/marketer/commissions",
        actionLabel: "View",
        actionLabelAr: "عرض",
        priority: "HIGH",
        refType: "Commission",
        refId: c.id,
      });
    } else if (action === "REJECT" && (c.status === "PENDING" || c.status === "APPROVED")) {
      await prisma.commission.update({
        where: { id: c.id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: reason || null,
        },
      });
      await audit.mutation(session.user.id, "COMMISSION_REJECTED", "Commission", c.id, { reason });
      await notify({
        userId: c.marketer.user.id,
        type: "COMMISSION_UPDATE",
        title: "Commission rejected",
        titleAr: "تم رفض عمولتك",
        body: `Your commission was rejected. ${reason ? `Reason: ${reason}` : ""}`,
        bodyAr: `تم رفض عمولتك. ${reason ? `السبب: ${reason}` : ""}`,
        channels: ["inApp", "email"],
        priority: "NORMAL",
        refType: "Commission",
        refId: c.id,
      });
    }
  }

  return NextResponse.json({ ok: true, processed: commissions.length });
}
