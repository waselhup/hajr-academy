import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const tests = await prisma.placementTest.findMany({
    where: { isActive: true },
    select: {
      id: true,
      variant: true,
      titleEn: true,
      titleAr: true,
      descriptionEn: true,
      descriptionAr: true,
      durationMin: true,
      passingScore: true,
    },
    orderBy: { variant: "asc" },
  });
  return NextResponse.json({ tests });
}
