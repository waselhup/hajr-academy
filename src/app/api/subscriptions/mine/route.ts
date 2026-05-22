import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPackage } from "@/lib/finance/packages";

export const dynamic = "force-dynamic";

/**
 * GET /api/subscriptions/mine — the calling student's current subscription
 * (most recent), with its package details.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ subscription: null });
    }

    const sub = await prisma.subscription.findFirst({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) {
      return NextResponse.json({ subscription: null });
    }

    let pkg = null;
    try {
      pkg = getPackage(sub.packageType);
    } catch {
      /* SCHOOL or unknown — leave null */
    }

    return NextResponse.json({
      subscription: {
        id: sub.id,
        packageType: sub.packageType,
        packageNameAr: pkg?.nameAr ?? sub.packageType,
        packageNameEn: pkg?.nameEn ?? sub.packageType,
        status: sub.status,
        pricePerMonth: Number(sub.pricePerMonth),
        discountAmount: Number(sub.discountAmount),
        totalWithVat: Number(sub.totalWithVat),
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        nextBillingDate: sub.nextBillingDate?.toISOString() ?? null,
        autoRenew: sub.autoRenew,
        cancelledAt: sub.cancelledAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error("[api/subscriptions/mine] failed:", e);
    return NextResponse.json(
      { error: "Failed to load subscription" },
      { status: 500 }
    );
  }
}
