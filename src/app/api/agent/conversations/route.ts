import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
  const skip = (page - 1) * limit;

  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  const agentType = url.searchParams.get("agentType");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (agentType === "ADMIN_AGENT" && isAdmin) {
    where.agentType = "ADMIN_AGENT";
  } else if (agentType === "PUBLIC_ASSISTANT") {
    where.agentType = "PUBLIC_ASSISTANT";
  }

  const [conversations, total] = await Promise.all([
    prisma.agentConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        agentType: true,
        title: true,
        messageCount: true,
        totalTokens: true,
        totalCostUsd: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.agentConversation.count({ where }),
  ]);

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      ...c,
      totalCostUsd: Number(c.totalCostUsd),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
