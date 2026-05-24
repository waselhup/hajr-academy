import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard-alerts
 * Returns counts for each red-banner alert category.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const now = new Date();

  const [
    newContactRequests,
    pendingPayments,
    overdueInvoices,
    flaggedMessages,
    newTrials,
  ] = await Promise.all([
    prisma.contactSubmission.count({ where: { status: "NEW" } }),
    prisma.teacherEarning.count({ where: { status: "PENDING" } }),
    prisma.invoice.count({
      where: {
        OR: [
          { status: "OVERDUE" },
          { status: "PENDING", dueDate: { lt: now } },
        ],
      },
    }),
    prisma.message.count({ where: { flagged: true } }),
    prisma.trialRequest.count({ where: { status: "NEW" } }),
  ]);

  const total =
    newContactRequests +
    pendingPayments +
    overdueInvoices +
    flaggedMessages +
    newTrials;

  return NextResponse.json({
    total,
    newContactRequests,
    pendingPayments,
    overdueInvoices,
    flaggedMessages,
    newTrials,
  });
}
