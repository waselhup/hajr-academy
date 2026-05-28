/**
 * GET /api/student/gamification/me — current student's profile,
 * earned achievements, and progress-to-next-level.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { computeAgeTier, xpProgressInLevel } from "@/lib/gamification/xp";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("STUDENT");
  try {
    const sp = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, birthDate: true, gradeLevel: true },
    });
    if (!sp) {
      return NextResponse.json({ ok: false, error: "no profile" }, { status: 404 });
    }
    const ageTier = computeAgeTier(sp.birthDate, sp.gradeLevel);

    const gam = await prisma.studentGamification.upsert({
      where: { studentId: sp.id },
      create: {
        studentId: sp.id,
        xp: 0,
        level: 1,
        ageTier,
      },
      update: {},
    });

    const earned = await prisma.studentAchievement.findMany({
      where: { studentId: sp.id },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    });

    const eligible = await prisma.achievement.findMany({
      where: {
        isActive: true,
        OR: [{ ageTier: null }, { ageTier }],
      },
      orderBy: { xpReward: "asc" },
    });

    return NextResponse.json({
      ok: true,
      profile: {
        xp: gam.xp,
        level: gam.level,
        streakDays: gam.streakDays,
        ageTier: gam.ageTier,
        avatarFrame: gam.avatarFrame,
        title: gam.title,
      },
      progress: xpProgressInLevel(gam.xp),
      achievements: {
        earned: earned.map((e) => ({
          id: e.achievement.id,
          key: e.achievement.key,
          nameAr: e.achievement.nameAr,
          nameEn: e.achievement.nameEn,
          descriptionAr: e.achievement.descriptionAr,
          descriptionEn: e.achievement.descriptionEn,
          iconKey: e.achievement.iconKey,
          xpReward: e.achievement.xpReward,
          earnedAt: e.earnedAt,
          isClaimed: e.isClaimed,
        })),
        eligible: eligible.map((a) => ({
          id: a.id,
          key: a.key,
          nameAr: a.nameAr,
          nameEn: a.nameEn,
          descriptionAr: a.descriptionAr,
          descriptionEn: a.descriptionEn,
          iconKey: a.iconKey,
          xpReward: a.xpReward,
        })),
      },
    });
  } catch (e) {
    console.error("[gamification/me]", e);
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }
}
