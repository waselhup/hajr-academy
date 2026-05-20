import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.agentConversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          toolName: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          costUsd: true,
          durationMs: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  if (conversation.userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...conversation,
    totalCostUsd: Number(conversation.totalCostUsd),
    messages: conversation.messages.map((m) => ({
      ...m,
      costUsd: m.costUsd ? Number(m.costUsd) : null,
    })),
  });
}
