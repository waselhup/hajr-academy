/**
 * GET /api/admin/payment-requests — admin list of all requests.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { PaymentRequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as PaymentRequestStatus | null;
  const requesterId = url.searchParams.get("requesterId");
  const requests = await prisma.paymentRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(requesterId ? { requesterId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, name: true, nameAr: true, email: true, role: true } },
    },
    take: 200,
  });
  return NextResponse.json({ ok: true, requests });
}
