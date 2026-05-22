import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderInvoiceDocument } from "@/lib/finance/invoices";
import { downloadInvoiceDocument } from "@/lib/finance/invoice-storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/[id]/pdf — serve the bilingual invoice document.
 *
 * Served inline as a print-ready HTML document (Arabic renders correctly;
 * the browser's "Save as PDF" produces the PDF). Prefers the stored copy
 * from Supabase Storage, falling back to on-the-fly rendering.
 *
 * Access: the owning student or an admin.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        invoiceNumber: true,
        year: true,
        pdfUrl: true,
        studentId: true,
      },
    });
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    if (!isAdmin) {
      const owner = await prisma.studentProfile.findUnique({
        where: { id: inv.studentId },
        select: { userId: true },
      });
      let allowed = owner?.userId === session.user.id;
      // A linked parent may also view their child's invoice.
      if (!allowed && session.user.role === "PARENT") {
        const link = await prisma.parentStudentLink.findFirst({
          where: {
            studentId: inv.studentId,
            parent: { userId: session.user.id },
          },
          select: { id: true },
        });
        allowed = !!link;
      }
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Prefer the stored document; fall back to live rendering.
    const storedPath = `${inv.year}/${inv.invoiceNumber}.html`;
    let body = await downloadInvoiceDocument(storedPath);
    if (!body) {
      body = await renderInvoiceDocument(inv.id);
    }
    if (!body) {
      return NextResponse.json(
        { error: "Could not generate the invoice document" },
        { status: 500 }
      );
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${inv.invoiceNumber}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[api/invoices/[id]/pdf] failed:", e);
    return NextResponse.json(
      { error: "Failed to render invoice" },
      { status: 500 }
    );
  }
}
