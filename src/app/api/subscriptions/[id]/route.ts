import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  changeSubscriptionPackage,
  applySubscriptionDiscount,
} from "@/lib/finance/subscriptions";
import { isSubscribablePackage } from "@/lib/finance/packages";
import { triggerSubscriptionCancelled } from "@/lib/comms/triggers";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/subscriptions/[id] — subscription lifecycle action.
 *
 * Body: { action: "pause"|"resume"|"cancel"|"changePackage"|"applyDiscount", ... }
 *  - changePackage: { packageType }
 *  - applyDiscount (admin only): { discountAmount }
 *  - cancel: { reason? }
 *
 * Students may act only on their own subscription; pause/resume/discount
 * are admin-only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: { student: { select: { userId: true } } },
    });
    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const isOwner = sub.student.userId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";

    // Students may cancel or change their own package; the rest is admin-only.
    const studentAllowed = ["cancel", "changePackage"];
    if (!isAdmin && !studentAllowed.includes(action)) {
      return NextResponse.json(
        { error: "This action is restricted to administrators" },
        { status: 403 }
      );
    }

    let result: { ok: boolean; error?: string };
    switch (action) {
      case "pause":
        result = await pauseSubscription(params.id);
        break;
      case "resume":
        result = await resumeSubscription(params.id);
        break;
      case "cancel":
        result = await cancelSubscription(
          params.id,
          typeof body.reason === "string" ? body.reason : undefined
        );
        if (result.ok) {
          await triggerSubscriptionCancelled(params.id).catch(() => {});
        }
        break;
      case "changePackage": {
        const pkg = typeof body.packageType === "string" ? body.packageType : "";
        if (!isSubscribablePackage(pkg)) {
          return NextResponse.json(
            { error: "Invalid package type" },
            { status: 400 }
          );
        }
        result = await changeSubscriptionPackage(params.id, pkg);
        break;
      }
      case "applyDiscount": {
        const amount = Number(body.discountAmount);
        if (!Number.isFinite(amount) || amount < 0) {
          return NextResponse.json(
            { error: "Invalid discount amount" },
            { status: 400 }
          );
        }
        result = await applySubscriptionDiscount(params.id, amount);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/subscriptions/[id]] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Subscription update failed" },
      { status: 500 }
    );
  }
}
