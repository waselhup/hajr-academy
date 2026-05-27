import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = req.nextUrl.searchParams.get("sessionId") || undefined;

  const attempt = await prisma.placementAttempt.findUnique({
    where: { id },
    include: {
      test: {
        include: {
          sections: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorize: owner student OR matching sessionId.
  const session = await auth();
  const ownerByStudent =
    !!session?.user &&
    (await prisma.studentProfile.findFirst({
      where: { id: attempt.studentId ?? "__none__", userId: session.user.id },
      select: { id: true },
    }));
  const ownerBySession = sessionId && attempt.sessionId === sessionId;

  if (!ownerByStudent && !ownerBySession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Strip correct answers from the questions before sending to the client.
  const sanitized = attempt.test.sections.map((s) => ({
    id: s.id,
    type: s.type,
    titleEn: s.titleEn,
    titleAr: s.titleAr,
    timeLimitMin: s.timeLimitMin,
    order: s.order,
    maxScore: s.maxScore,
    questions: (s.questions as Array<{ id: string; textEn: string; textAr: string; options: { en: string; ar: string }[]; audioUrl?: string | null }>).map((q) => ({
      id: q.id,
      textEn: q.textEn,
      textAr: q.textAr,
      options: q.options,
      audioUrl: q.audioUrl ?? null,
    })),
  }));

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      answers: attempt.answers,
      submittedAt: attempt.submittedAt,
      test: {
        id: attempt.test.id,
        variant: attempt.test.variant,
        titleEn: attempt.test.titleEn,
        titleAr: attempt.test.titleAr,
        durationMin: attempt.test.durationMin,
      },
      sections: sanitized,
    },
  });
}
