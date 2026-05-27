import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // id may be attemptId or resultId — try both.
  let result =
    (await prisma.placementResult.findUnique({
      where: { attemptId: id },
      include: { attempt: { include: { test: { select: { titleEn: true, titleAr: true, variant: true } } } } },
    })) ||
    (await prisma.placementResult.findUnique({
      where: { id },
      include: { attempt: { include: { test: { select: { titleEn: true, titleAr: true, variant: true } } } } },
    }));

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    result: {
      id: result.id,
      attemptId: result.attemptId,
      cefrLevel: result.cefrLevel,
      score: result.score,
      maxScore: result.maxScore,
      percent: Number(result.percent),
      sectionBreakdown: result.sectionBreakdown,
      recommendations: result.recommendations,
      pdfUrl: result.pdfUrl,
      createdAt: result.createdAt,
      test: result.attempt.test,
    },
  });
}
