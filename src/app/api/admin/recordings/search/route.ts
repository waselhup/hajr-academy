/**
 * Admin search across recordings: matches against
 *   LessonSummary.transcript / summaryEn / summaryAr
 *   ClassSession.notes
 *   Class.name / nameAr
 * Returns the same RecordingRow shape the client expects, plus a
 * matchedExcerpt with the search term highlighted (first 160 chars).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function excerpt(text: string, term: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx < 0) return text.slice(0, 160);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + term.length + 80);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ rows: [] });

  // Find matching LessonSummary rows.
  const summaryMatches = await prisma.lessonSummary.findMany({
    where: {
      OR: [
        { transcript: { contains: q, mode: "insensitive" } },
        { summaryEn: { contains: q, mode: "insensitive" } },
        { summaryAr: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      sessionId: true,
      transcript: true,
      summaryEn: true,
      summaryAr: true,
      confidence: true,
    },
    take: 80,
  });

  const summaryBySession = new Map(
    summaryMatches.map((s) => [s.sessionId, s])
  );

  // Sessions matching by their own notes / class name, plus the
  // sessions that summary matches point to.
  const sessions = await prisma.classSession.findMany({
    where: {
      zoomRecordingUrl: { not: null },
      OR: [
        { id: { in: Array.from(summaryBySession.keys()) } },
        { notes: { contains: q, mode: "insensitive" } },
        { class: { name: { contains: q, mode: "insensitive" } } },
        { class: { nameAr: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      class: {
        include: {
          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
        },
      },
      lessonSummary: { select: { confidence: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 100,
  });

  const rows = sessions.map((r) => {
    const sm = summaryBySession.get(r.id);
    const haystack =
      sm?.transcript ?? sm?.summaryEn ?? sm?.summaryAr ?? r.notes ?? "";
    return {
      id: r.id,
      scheduledDate: r.scheduledDate.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
      endedAt: r.endedAt?.toISOString() ?? null,
      className: r.class.name,
      classNameAr: r.class.nameAr ?? null,
      teacherName:
        r.class.teacher.user.nameAr ?? r.class.teacher.user.name,
      durationMinutes: r.class.durationMinutes,
      zoomRecordingUrl: r.zoomRecordingUrl!,
      hasSummary: !!r.lessonSummary,
      summaryConfidence: r.lessonSummary?.confidence
        ? Number(r.lessonSummary.confidence)
        : null,
      matchedExcerpt: haystack ? excerpt(haystack, q) : null,
    };
  });

  return NextResponse.json({ rows });
}
