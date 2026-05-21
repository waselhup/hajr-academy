import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const SECTIONS = ["READING", "LISTENING", "GRAMMAR", "VOCABULARY", "WRITING", "SPEAKING"];
const PAGE_SIZE = 50;

/**
 * GET /api/admin/test-bank/questions — paginated test-bank browser.
 *
 * Query params: section, difficulty, topic, q (text search), page,
 * difficult=1 (only questions with < 30% accuracy). Each question
 * includes its denormalised usage stats.
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
    const section = sp.get("section");
    const difficulty = sp.get("difficulty");
    const topic = sp.get("topic");
    const q = (sp.get("q") ?? "").trim();
    const onlyDifficult = sp.get("difficult") === "1";

    const where: Prisma.TestQuestionWhereInput = {};
    if (section && SECTIONS.includes(section)) {
      where.section = section as Prisma.TestQuestionWhereInput["section"];
    }
    if (difficulty) {
      const d = parseInt(difficulty, 10);
      if (d >= 1 && d <= 5) where.difficulty = d;
    }
    if (topic) where.topic = { contains: topic, mode: "insensitive" };
    if (q) {
      where.OR = [
        { questionText: { contains: q, mode: "insensitive" } },
        { passage: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.testQuestion.count({ where }),
      prisma.testQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    let questions = rows.map((qq) => {
      const accuracy =
        qq.totalAttempts > 0
          ? Math.round((qq.correctAttempts / qq.totalAttempts) * 10000) / 100
          : null;
      return {
        id: qq.id,
        section: qq.section,
        difficulty: qq.difficulty,
        type: qq.type,
        questionText: qq.questionText,
        topic: qq.topic,
        tags: qq.tags,
        totalAttempts: qq.totalAttempts,
        correctAttempts: qq.correctAttempts,
        accuracy,
        avgTimeSec: qq.avgTimeSec,
        isActive: qq.isActive,
      };
    });

    // "Difficult questions" view: low accuracy with enough attempts.
    if (onlyDifficult) {
      questions = questions.filter(
        (qq) => qq.totalAttempts >= 5 && (qq.accuracy ?? 100) < 30
      );
    }

    return NextResponse.json({
      questions,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (e) {
    console.error("[api/admin/test-bank/questions] failed:", e);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
