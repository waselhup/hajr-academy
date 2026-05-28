/**
 * POST /api/library/progress — upsert progress for the current student
 * Also awards XP when an item is first completed (best-effort, never blocks).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification/xp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireRole("STUDENT");
  const body = (await req.json().catch(() => ({}))) as {
    libraryItemId?: string;
    progressPct?: number;
    timeDeltaSec?: number;
  };
  if (!body.libraryItemId) {
    return NextResponse.json({ ok: false, error: "libraryItemId required" }, { status: 400 });
  }

  const item = await prisma.libraryItem.findUnique({
    where: { id: body.libraryItemId },
    select: { id: true, isPublished: true },
  });
  if (!item || !item.isPublished) {
    return NextResponse.json({ ok: false, error: "item not available" }, { status: 404 });
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!studentProfile) {
    return NextResponse.json({ ok: false, error: "no student profile" }, { status: 400 });
  }

  const pct = Math.max(0, Math.min(100, Math.round(body.progressPct ?? 0)));
  const timeDelta = Math.max(0, Math.min(600, Math.round(body.timeDeltaSec ?? 0)));
  const justCompleted = pct >= 100;

  const existing = await prisma.libraryProgress.findUnique({
    where: {
      studentId_libraryItemId: {
        studentId: studentProfile.id,
        libraryItemId: item.id,
      },
    },
  });

  const wasCompleted = existing?.status === "COMPLETED";
  const newStatus =
    justCompleted || wasCompleted ? "COMPLETED" : pct > 0 ? "IN_PROGRESS" : "NOT_STARTED";

  const progress = await prisma.libraryProgress.upsert({
    where: {
      studentId_libraryItemId: {
        studentId: studentProfile.id,
        libraryItemId: item.id,
      },
    },
    create: {
      studentId: studentProfile.id,
      libraryItemId: item.id,
      progressPct: pct,
      timeSpentSec: timeDelta,
      status: newStatus,
      lastAccessAt: new Date(),
      completedAt: justCompleted ? new Date() : null,
    },
    update: {
      progressPct: Math.max(pct, existing?.progressPct ?? 0),
      timeSpentSec: (existing?.timeSpentSec ?? 0) + timeDelta,
      status: newStatus,
      lastAccessAt: new Date(),
      ...(justCompleted && !wasCompleted ? { completedAt: new Date() } : {}),
    },
  });

  if (!wasCompleted && justCompleted) {
    try {
      await prisma.libraryItem.update({
        where: { id: item.id },
        data: { viewCount: { increment: 1 } },
      });
    } catch {}
    awardXp({
      studentId: studentProfile.id,
      reason: "library_item_completed",
      points: 5,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, progress });
}
