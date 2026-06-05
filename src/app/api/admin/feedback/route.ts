import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

/**
 * GET /api/admin/feedback — list public feedback-survey responses for the
 * admin inbox. ADMIN / SUPER_ADMIN only.
 *
 * Query:
 *   ?type=STUDENT|PARENT
 *   ?minRating=1..5            (overall ≥ n)
 *   ?consent=1                 (consentTestimonial = true)
 *   ?media=1                   (has voice or video)
 *   ?page=
 *
 * Returns the rows WITHOUT signing any media — the path is returned so the
 * client can request a signed URL on demand from /api/admin/feedback/media.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const type = sp.get("type");
    const minRating = parseInt(sp.get("minRating") ?? "0", 10);
    const consentOnly = sp.get("consent") === "1";
    const mediaOnly = sp.get("media") === "1";

    const where: Prisma.FeedbackSurveyResponseWhereInput = {};
    if (type === "STUDENT" || type === "PARENT") where.respondentType = type;
    if (Number.isFinite(minRating) && minRating >= 1 && minRating <= 5) {
      where.ratingOverall = { gte: minRating };
    }
    if (consentOnly) where.consentTestimonial = true;
    if (mediaOnly) where.OR = [{ voiceUrl: { not: null } }, { videoUrl: { not: null } }];

    const [total, rows, agg] = await Promise.all([
      prisma.feedbackSurveyResponse.count({ where }),
      prisma.feedbackSurveyResponse.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.feedbackSurveyResponse.aggregate({ _avg: { ratingOverall: true }, _count: { _all: true } }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      totalAll: agg._count._all,
      avgOverall: agg._avg.ratingOverall,
      responses: rows.map((r) => ({
        id: r.id,
        respondentType: r.respondentType,
        teacherName: r.teacherName,
        studentName: r.studentName,
        programOrClass: r.programOrClass,
        ratingOverall: r.ratingOverall,
        qualityRating: r.qualityRating,
        commsRating: r.commsRating,
        improved: r.improved,
        recommendRating: r.recommendRating,
        likedMost: r.likedMost,
        improveSuggestion: r.improveSuggestion,
        textTestimonial: r.textTestimonial,
        hasVoice: !!r.voiceUrl,
        hasVideo: !!r.videoUrl,
        mediaKind: r.mediaKind,
        respondentName: r.respondentName,
        respondentContact: r.respondentContact,
        consentTestimonial: r.consentTestimonial,
        consentContact: r.consentContact,
        locale: r.locale,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[api/admin/feedback] failed:", e);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}
