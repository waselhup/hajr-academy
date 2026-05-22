import { auth } from "@/lib/auth";
import { runAgentLoop, generateConversationTitle, shouldEscalateToSonnet } from "@/lib/agent/engine";
import { checkRateLimit } from "@/lib/agent/rate-limiter";
import { getAdminSystemPrompt } from "@/lib/agent/prompts/admin";
import { getPublicSystemPrompt } from "@/lib/agent/prompts/public";
import { adminTools } from "@/lib/agent/tools/admin";
import { publicTools } from "@/lib/agent/tools/public";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { AgentConfig } from "@/lib/agent/types";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, conversationId, agentType, visitorId: clientVisitorId } = body as {
      message: string;
      conversationId?: string;
      agentType?: string;
      visitorId?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id;
    const userRole = session?.user?.role;
    const userName = session?.user?.name ?? "";
    const locale = (session?.user?.preferredLang?.toLowerCase() as "ar" | "en") ?? "ar";

    const isAdminAgent = agentType === "ADMIN_AGENT";

    if (isAdminAgent && (!userId || (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN"))) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    let visitorId = clientVisitorId;
    if (!userId && !visitorId) {
      const cookieStore = await cookies();
      visitorId = cookieStore.get("hajr_visitor_id")?.value;
      if (!visitorId) {
        visitorId = crypto.randomUUID();
      }
    }

    const rateCheck = await checkRateLimit({
      userId: userId ?? undefined,
      userRole: userRole ?? undefined,
      visitorId: !userId ? visitorId : undefined,
    });

    if (!rateCheck.allowed) {
      return Response.json(
        {
          error: "rate_limited",
          message: locale === "ar" ? rateCheck.messageAr : rateCheck.message,
          remaining: rateCheck.remaining,
        },
        { status: 429 }
      );
    }

    let model: "claude-sonnet-4-6" | "claude-haiku-4-5-20251001" = "claude-haiku-4-5-20251001";

    if (isAdminAgent) {
      model = "claude-sonnet-4-6";
    } else {
      let messageCount = 0;
      if (conversationId) {
        const convo = await prisma.agentConversation.findUnique({
          where: { id: conversationId },
          select: { messageCount: true },
        });
        messageCount = convo?.messageCount ?? 0;
      }
      if (shouldEscalateToSonnet(message, messageCount)) {
        model = "claude-sonnet-4-6";
      }
    }

    const systemPrompt = isAdminAgent
      ? getAdminSystemPrompt(userName, userRole ?? "ADMIN", locale)
      : getPublicSystemPrompt(userRole ?? null, userName || null, locale);

    const tools = isAdminAgent ? adminTools : publicTools;

    const config: AgentConfig & { visitorId?: string } = {
      agentType: isAdminAgent ? "ADMIN_AGENT" : "PUBLIC_ASSISTANT",
      systemPrompt,
      tools,
      model,
      maxTokens: isAdminAgent ? 4096 : 2048,
      userId: userId ?? undefined,
      userRole: userRole ?? undefined,
      locale,
      conversationId,
      visitorId,
    };

    const stream = await runAgentLoop(config, message.trim());

    if (!conversationId) {
      generateConversationTitle(config.conversationId!, message.trim()).catch(() => {});
    }

    await logAudit({
      userId: userId ?? null,
      action: "agent_message_sent",
      entity: "AgentConversation",
      entityId: conversationId ?? null,
      metadata: {
        agentType: isAdminAgent ? "ADMIN_AGENT" : "PUBLIC_ASSISTANT",
        model,
        messageLength: message.length,
      },
    });

    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    if (!userId && visitorId) {
      response.headers.set(
        "Set-Cookie",
        `hajr_visitor_id=${visitorId}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
      );
    }

    return response;
  } catch (err) {
    console.error("[agent/chat] error:", err);

    if (
      err instanceof Error &&
      (err.message.includes("API key") || err.message.includes("authentication"))
    ) {
      return Response.json(
        { error: "ai_unavailable", message: "هجر غير متاح حالياً، حاول لاحقاً" },
        { status: 503 }
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
