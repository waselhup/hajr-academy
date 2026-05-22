import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/subscriptions — all subscriptions (admin).
 * Optional query: status, packageType.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const where: Prisma.SubscriptionWhereInput = {};
    const status = sp.get("status");
    if (status) {
      where.status = status as Prisma.SubscriptionWhereInput["status"];
    }
    const packageType = sp.get("packageType");
    if (packageType) {
      where.packageType =
        packageType as Prisma.SubscriptionWhereInput["packageType"];
    }

    const rows = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        student: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    const subscriptions = rows.map((s) => ({
      id: s.id,
      studentName: s.student.user.name,
      studentEmail: s.student.user.email,
      packageType: s.packageType,
      status: s.status,
      pricePerMonth: Number(s.pricePerMonth),
      totalWithVat: Number(s.totalWithVat),
      currentPeriodStart: s.currentPeriodStart.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      nextBillingDate: s.nextBillingDate?.toISOString() ?? null,
      autoRenew: s.autoRenew,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({ subscriptions });
  } catch (e) {
    console.error("[api/admin/finance/subscriptions] failed:", e);
    return NextResponse.json(
      { error: "Failed to load subscriptions" },
      { status: 500 }
    );
  }
}
