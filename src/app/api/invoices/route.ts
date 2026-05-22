import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * GET /api/invoices — list invoices.
 *
 * Students see only their own; admins see all and may filter by
 * status / packageType / date range. Query: status, packageType, page,
 * from, to.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));

    const where: Prisma.InvoiceWhereInput = {};

    if (!isAdmin) {
      // Students are scoped to their own profile.
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student) return NextResponse.json({ invoices: [], total: 0, page });
      where.studentId = student.id;
    }

    const status = sp.get("status");
    if (status) {
      where.invoiceStatus = status as Prisma.InvoiceWhereInput["invoiceStatus"];
    }
    const packageType = sp.get("packageType");
    if (packageType) {
      where.packageType =
        packageType as Prisma.InvoiceWhereInput["packageType"];
    }
    const from = sp.get("from");
    const to = sp.get("to");
    if (from || to) {
      where.issuedAt = {};
      if (from) (where.issuedAt as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.issuedAt as Prisma.DateTimeFilter).lte = new Date(to);
    }

    const [total, rows] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          student: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      }),
    ]);

    const invoices = rows.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentName: inv.student.user.name,
      studentEmail: inv.student.user.email,
      type: inv.type,
      status: inv.invoiceStatus,
      packageType: inv.packageType,
      subtotal: Number(inv.subtotalSar),
      discount: Number(inv.discountSar),
      vatAmount: Number(inv.vatSar),
      totalAmount: Number(inv.totalSar),
      issuedAt: inv.issuedAt.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      pdfUrl: inv.pdfUrl,
    }));

    return NextResponse.json({ invoices, total, page, pageSize: PAGE_SIZE });
  } catch (e) {
    console.error("[api/invoices] failed:", e);
    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }
}
