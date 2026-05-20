import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    convosToday,
    convosWeek,
    convosMonth,
    totalMessages,
    tokenStats,
    avgMessages,
    trialRequestsFromAI,
    trialConversions,
  ] = await Promise.all([
    prisma.agentConversation.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.agentConversation.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.agentConversation.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.agentMessage.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.agentConversation.aggregate({
      _sum: { totalTokens: true, totalCostUsd: true },
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.agentConversation.aggregate({
      _avg: { messageCount: true },
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.trialRequest.count({
      where: { source: "public_assistant", createdAt: { gte: monthStart } },
    }),
    prisma.trialRequest.count({
      where: {
        source: "public_assistant",
        status: "CONVERTED",
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  const costUsd = Number(tokenStats._sum.totalCostUsd ?? 0);
  const costSar = costUsd * 3.75;

  return NextResponse.json({
    conversations: {
      today: convosToday,
      week: convosWeek,
      month: convosMonth,
    },
    totalMessages,
    totalTokens: tokenStats._sum.totalTokens ?? 0,
    totalCostUsd: costUsd,
    totalCostSar: costSar,
    avgMessagesPerConversation: Math.round(avgMessages._avg.messageCount ?? 0),
    trialRequests: {
      fromAI: trialRequestsFromAI,
      conversions: trialConversions,
      conversionRate:
        trialRequestsFromAI > 0
          ? Math.round((trialConversions / trialRequestsFromAI) * 100)
          : 0,
    },
  });
}
