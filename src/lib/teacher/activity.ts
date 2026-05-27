/**
 * Sprint 3 — Teacher activity metrics. PDPL-aligned: no page-tracking,
 * no time-on-page — only outcomes from existing data (sessions completed,
 * on-time start, ratings, message response time).
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export interface TeacherActivityRow {
  teacherId: string;
  userId: string;
  name: string;
  nameAr: string | null;
  avatar: string | null;
  active: boolean;
  isVerified: boolean;
  lastLoginAt: Date | null;
  sessionsLast7: number;
  sessionsLast30: number;
  onTimePct: number | null; // 0-100, null when no sessions
  avgRating: number | null;
  totalRatings: number;
  responseTimeAvgMin: number | null;
  activeClasses: number;
}

const DAY = 24 * 60 * 60 * 1000;

export async function getTeacherActivity(): Promise<TeacherActivityRow[]> {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const since30 = new Date(now - 30 * DAY);

  const teachers = await prisma.teacherProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          avatar: true,
          lastLoginAt: true,
        },
      },
      classes: { where: { status: "ACTIVE" }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Pre-fetch in bulk for each metric to keep it server-cheap.
  const teacherIds = teachers.map((t) => t.id);
  const userIds = teachers.map((t) => t.user.id);
  const classIds = teachers.flatMap((t) => t.classes.map((c) => c.id));

  // Sessions in last 30 days for any class the teacher owns.
  const [sessionsRecent, ratings, messagesSent] = await Promise.all([
    classIds.length
      ? prisma.classSession.findMany({
          where: {
            classId: { in: classIds },
            scheduledDate: { gte: since30 },
          },
          select: {
            classId: true,
            scheduledDate: true,
            startedAt: true,
            status: true,
            class: { select: { teacherId: true } },
          },
        })
      : Promise.resolve([]),
    teacherIds.length
      ? prisma.teacherRating.groupBy({
          by: ["teacherId"],
          where: { teacherId: { in: teacherIds }, isApproved: true },
          _avg: { rating: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.message.findMany({
          where: {
            fromUserId: { in: userIds },
            createdAt: { gte: since30 },
            parentMessageId: { not: null },
          },
          select: {
            fromUserId: true,
            createdAt: true,
            parentMessage: { select: { createdAt: true, toUserId: true } },
          },
          take: 5000,
        })
      : Promise.resolve([]),
  ]);

  // ─────────── derive per-teacher metrics ───────────
  const rows: TeacherActivityRow[] = teachers.map((tp) => {
    const teacherSessions = sessionsRecent.filter(
      (s) => s.class.teacherId === tp.id
    );

    const sessionsLast30 = teacherSessions.filter(
      (s) => s.status === "COMPLETED" || s.status === "LIVE"
    ).length;
    const sessionsLast7 = teacherSessions.filter(
      (s) =>
        s.scheduledDate >= since7 &&
        (s.status === "COMPLETED" || s.status === "LIVE")
    ).length;

    // On-time = startedAt within 5 minutes of scheduledDate.
    const startedSessions = teacherSessions.filter((s) => s.startedAt);
    const onTime = startedSessions.filter((s) => {
      const delta = s.startedAt!.getTime() - s.scheduledDate.getTime();
      return delta <= 5 * 60 * 1000;
    }).length;
    const onTimePct =
      startedSessions.length === 0
        ? null
        : Math.round((onTime / startedSessions.length) * 100);

    const rateRow = ratings.find(
      (r) => r.teacherId === tp.id
    ) as { _avg: { rating: number | null }; _count: { _all: number } } | undefined;

    // Response time: messages this teacher sent that were replies — diff
    // between parent.createdAt and reply.createdAt, in minutes. Only
    // count when the parent.toUserId matches this teacher (someone messaged
    // them and they replied).
    const myReplies = messagesSent.filter(
      (m) =>
        m.fromUserId === tp.user.id &&
        m.parentMessage &&
        m.parentMessage.toUserId === tp.user.id
    );
    const responseTimeAvgMin =
      myReplies.length === 0
        ? null
        : Math.round(
            myReplies.reduce(
              (acc, m) =>
                acc +
                (m.createdAt.getTime() - m.parentMessage!.createdAt.getTime()) /
                  60000,
              0
            ) / myReplies.length
          );

    return {
      teacherId: tp.id,
      userId: tp.user.id,
      name: tp.user.name,
      nameAr: tp.user.nameAr,
      avatar: tp.user.avatar,
      active: tp.active,
      isVerified: tp.isVerified,
      lastLoginAt: tp.user.lastLoginAt,
      sessionsLast7,
      sessionsLast30,
      onTimePct,
      avgRating: rateRow?._avg.rating ? Number(rateRow._avg.rating.toFixed(2)) : null,
      totalRatings: rateRow?._count._all ?? 0,
      responseTimeAvgMin,
      activeClasses: tp.classes.length,
    };
  });

  return rows;
}

export function activityToCsv(rows: TeacherActivityRow[]): string {
  const header = [
    "teacherId",
    "name",
    "active",
    "isVerified",
    "lastLoginAt",
    "sessionsLast7",
    "sessionsLast30",
    "onTimePct",
    "avgRating",
    "totalRatings",
    "responseTimeAvgMin",
    "activeClasses",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.teacherId,
        `"${r.name.replace(/"/g, '""')}"`,
        r.active ? "1" : "0",
        r.isVerified ? "1" : "0",
        r.lastLoginAt ? r.lastLoginAt.toISOString() : "",
        r.sessionsLast7,
        r.sessionsLast30,
        r.onTimePct ?? "",
        r.avgRating ?? "",
        r.totalRatings,
        r.responseTimeAvgMin ?? "",
        r.activeClasses,
      ].join(",")
    );
  }
  return lines.join("\n");
}

// Touch unused Role import to keep type-checker happy if not used elsewhere.
export type _RoleUnused = Role;
