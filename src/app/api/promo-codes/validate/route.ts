import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePromoCode } from "@/lib/finance/promo-codes";
import { getPackage } from "@/lib/finance/packages";

export const dynamic = "force-dynamic";

/**
 * POST /api/promo-codes/validate — validate a code and preview the discount.
 *
 * Body: { code, packageType }. Returns the discount amount and the
 * resulting VAT-inclusive total for the chosen package. Validation is
 * fully server-side.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code : "";
    const packageType =
      typeof body.packageType === "string" ? body.packageType : "";

    let basePrice = 0;
    let pkg = null;
    try {
      pkg = getPackage(packageType);
      basePrice = pkg.pricePerMonth;
    } catch {
      return NextResponse.json(
        { valid: false, reason: "Select a package first." },
        { status: 400 }
      );
    }

    // Scope the per-user cap check to the caller's student profile.
    let studentId: string | undefined;
    if (session.user.role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      studentId = student?.id;
    }

    const result = await validatePromoCode({
      codeStr: code,
      basePrice,
      packageType,
      studentId,
    });

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        reason: result.reason,
        reasonAr: result.reasonAr,
      });
    }

    const discount = result.discountAmount ?? 0;
    const net = Math.max(0, +(basePrice - discount).toFixed(2));
    const vat = +(net * 0.15).toFixed(2);

    return NextResponse.json({
      valid: true,
      code: result.code!.code,
      type: result.code!.type,
      discountAmount: discount,
      freeMonths: result.freeMonths ?? 0,
      preview: {
        basePrice,
        discount,
        netSubtotal: net,
        vat,
        total: +(net + vat).toFixed(2),
      },
    });
  } catch (e) {
    console.error("[api/promo-codes/validate] failed:", e);
    return NextResponse.json(
      { valid: false, reason: "Could not validate the code." },
      { status: 500 }
    );
  }
}
