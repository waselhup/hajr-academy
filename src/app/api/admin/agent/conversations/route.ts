import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);
  const skip = (page - 1) * limit;
  const agentType = url.searchParams.get("agentType");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  if (agentType) where.agentType = agentType;
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    where.createdAt = dateFilter;
  }

  const [conversations, total] = await Promise.all([
    prisma.agentConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
          where: { role: "USER" },
          select: { content: true },
        },
      },
    }),
    prisma.agentConversation.count({ where }),
  ]);

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      agentType: c.agentType,
      title: c.title,
      user: c.user
        ? { id: c.user.id, name: c.user.name, email: c.user.email, role: c.user.role }
        : null,
      messageCount: c.messageCount,
      totalTokens: c.totalTokens,
      totalCostUsd: Number(c.totalCostUsd),
      firstMessage: c.messages[0]?.content?.slice(0, 100) ?? null,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
