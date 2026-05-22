import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** CSV-escape a single field. */
function csv(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/admin/finance/export — export invoices as CSV (admin).
 * Optional query: from, to (ISO dates) to bound by issue date.
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
    const from = sp.get("from");
    const to = sp.get("to");
    const where: { issuedAt?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
      where.issuedAt = {};
      if (from) where.issuedAt.gte = new Date(from);
      if (to) where.issuedAt.lte = new Date(to);
    }

    const rows = await prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      include: {
        student: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    const header = [
      "Invoice Number",
      "Student",
      "Email",
      "Type",
      "Status",
      "Package",
      "Subtotal (SAR)",
      "Discount (SAR)",
      "VAT (SAR)",
      "Total (SAR)",
      "Issued",
      "Due",
      "Paid",
    ];
    const lines = [header.join(",")];
    for (const inv of rows) {
      lines.push(
        [
          csv(inv.invoiceNumber),
          csv(inv.student.user.name),
          csv(inv.student.user.email),
          csv(inv.type),
          csv(inv.invoiceStatus),
          csv(inv.packageType ?? ""),
          csv(Number(inv.subtotalSar).toFixed(2)),
          csv(Number(inv.discountSar).toFixed(2)),
          csv(Number(inv.vatSar).toFixed(2)),
          csv(Number(inv.totalSar).toFixed(2)),
          csv(inv.issuedAt.toISOString().slice(0, 10)),
          csv(inv.dueDate.toISOString().slice(0, 10)),
          csv(inv.paidAt ? inv.paidAt.toISOString().slice(0, 10) : ""),
        ].join(",")
      );
    }

    await logAudit({
      userId: session.user.id,
      action: "FINANCE_EXPORT",
      entity: "Invoice",
      metadata: { rows: rows.length, from, to },
    });

    // Prepend a UTF-8 BOM so Excel renders Arabic names correctly.
    const body = "﻿" + lines.join("\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hajr-invoices-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("[api/admin/finance/export] failed:", e);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
