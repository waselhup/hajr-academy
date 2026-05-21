import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recommendExercises, getDailyChallenge } from "@/lib/lab/recommender";

export const dynamic = "force-dynamic";

const SKILLS = ["SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY"];

/**
 * GET /api/lab/recommendations — personalised exercise recommendations.
 * Query params: limit (default 5), skill (optional), daily=1 to also
 * include the day's challenge exercise.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(10, Math.max(1, parseInt(sp.get("limit") ?? "5", 10)));
    const skillParam = sp.get("skill");
    const skill =
      skillParam && SKILLS.includes(skillParam)
        ? (skillParam as Parameters<typeof recommendExercises>[2])
        : undefined;

    const recommendations = await recommendExercises(student.id, limit, skill);

    let dailyChallenge = null;
    if (sp.get("daily") === "1") {
      dailyChallenge = await getDailyChallenge(student.id);
    }

    return NextResponse.json({ recommendations, dailyChallenge });
  } catch (e) {
    console.error("[api/lab/recommendations] failed:", e);
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 }
    );
  }
}
