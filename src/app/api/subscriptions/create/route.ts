import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSubscription } from "@/lib/finance/subscriptions";
import { isSubscribablePackage } from "@/lib/finance/packages";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscriptions/create — start a subscription + first invoice.
 *
 * Body: { packageType, autoRenew?, promoCode? }. Students only; creates
 * the subscription for the caller's own student profile.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const packageType =
      typeof body.packageType === "string" ? body.packageType : "";
    if (!isSubscribablePackage(packageType)) {
      return NextResponse.json(
        { error: "Invalid package type" },
        { status: 400 }
      );
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const result = await createSubscription({
      studentId: student.id,
      packageType,
      autoRenew: body.autoRenew === true,
      promoCode:
        typeof body.promoCode === "string" && body.promoCode.trim()
          ? body.promoCode.trim()
          : null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, errorAr: result.errorAr },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      subscriptionId: result.subscriptionId,
      invoiceId: result.invoiceId,
    });
  } catch (e) {
    console.error("[api/subscriptions/create] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not create subscription" },
      { status: 500 }
    );
  }
}
