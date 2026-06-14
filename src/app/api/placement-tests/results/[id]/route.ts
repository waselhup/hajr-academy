import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId =
    req.nextUrl.searchParams.get("sessionId") ||
    req.nextUrl.searchParams.get("sid") ||
    undefined;
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

  // Authorize: owner student, the matching anonymous session token, or staff.
  // Without this the route is an IDOR — any guessed id would expose someone's
  // CEFR result, section breakdown and PDF (mirrors the sibling attempts route).
  const session = await auth();
  const role = session?.user?.role;
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TEACHER";
  const ownerByStudent =
    !!session?.user &&
    !!result.attempt.studentId &&
    !!(await prisma.studentProfile.findFirst({
      where: { id: result.attempt.studentId, userId: session.user.id },
      select: { id: true },
    }));
  const ownerBySession = !!sessionId && result.attempt.sessionId === sessionId;
  if (!isStaff && !ownerByStudent && !ownerBySession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
