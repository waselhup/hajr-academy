import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type { AgentConfig, AgentContext, AgentTool } from "./types";
import { calculateCost } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runAgentLoop(
  config: AgentConfig,
  userMessage: string
): Promise<ReadableStream> {
  const conversationId = config.conversationId ?? (await createConversation(config));
  const context: AgentContext = {
    userId: config.userId,
    userRole: config.userRole,
    locale: config.locale,
    prisma,
    conversationId,
  };

  await saveMessage(conversationId, "USER", userMessage);

  const history = await loadHistory(conversationId);

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        let messages = buildMessages(history, userMessage);
        let loopCount = 0;
        const maxLoops = 10;

        while (loopCount < maxLoops) {
          loopCount++;
          const startMs = Date.now();

          const toolDefs = config.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema as Anthropic.Tool.InputSchema,
          }));

          const response = await anthropic.messages.create({
            model: config.model,
            max_tokens: config.maxTokens,
            system: config.systemPrompt,
            messages,
            tools: toolDefs.length > 0 ? toolDefs : undefined,
          });

          const durationMs = Date.now() - startMs;
          const inputTokens = response.usage.input_tokens;
          const outputTokens = response.usage.output_tokens;
          const costUsd = calculateCost(config.model, inputTokens, outputTokens);

          await updateConversationTokens(conversationId, inputTokens + outputTokens, costUsd);

          let hasToolUse = false;
          let fullText = "";

          for (const block of response.content) {
            if (block.type === "text") {
              fullText += block.text;
              send({ type: "text", content: block.text });
            } else if (block.type === "tool_use") {
              hasToolUse = true;
              send({ type: "tool_start", toolName: block.name });

              await saveMessage(conversationId, "TOOL_CALL", "", {
                toolName: block.name,
                toolInput: block.input as Record<string, unknown>,
                model: config.model,
                inputTokens,
                outputTokens,
                costUsd,
                durationMs,
              });

              const tool = config.tools.find((t) => t.name === block.name);
              let toolResult: unknown = { error: `Unknown tool: ${block.name}` };

              if (tool) {
                try {
                  toolResult = await tool.handler(block.input as Record<string, unknown>, context);
                } catch (err) {
                  toolResult = { error: err instanceof Error ? err.message : "Tool execution failed" };
                }
              }

              await saveMessage(conversationId, "TOOL_RESULT", "", {
                toolName: block.name,
                toolOutput: toolResult as Record<string, unknown>,
              });

              send({ type: "tool_end", toolName: block.name });

              messages = [
                ...messages,
                { role: "assistant" as const, content: response.content },
                {
                  role: "user" as const,
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: block.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                },
              ];
            }
          }

          if (!hasToolUse) {
            if (fullText) {
              await saveMessage(conversationId, "ASSISTANT", fullText, {
                model: config.model,
                inputTokens,
                outputTokens,
                costUsd,
                durationMs,
              });
            }

            const suggestedActions = extractSuggestedActions(fullText, config.locale);
            if (suggestedActions.length > 0) {
              send({ type: "suggested_actions", suggestedActions });
            }

            send({ type: "done", conversationId });
            controller.close();
            return;
          }
        }

        send({ type: "error", content: "Max tool loops reached" });
        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", content: errorMsg })}\n\n`)
        );
        controller.close();
      }
    },
  });
}

async function createConversation(config: AgentConfig): Promise<string> {
  const conversation = await prisma.agentConversation.create({
    data: {
      userId: config.userId ?? null,
      agentType: config.agentType,
      userRole: config.userRole as any ?? null,
      metadata: config.userId ? undefined : { visitorId: (config as any).visitorId },
    },
  });
  return conversation.id;
}

async function loadHistory(conversationId: string) {
  return prisma.agentMessage.findMany({
    where: { conversationId, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  });
}

function buildMessages(
  history: { role: string; content: string }[],
  userMessage: string
): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = [];
  for (const h of history) {
    if (h.role === "USER") {
      msgs.push({ role: "user", content: h.content });
    } else if (h.role === "ASSISTANT") {
      msgs.push({ role: "assistant", content: h.content });
    }
  }
  if (msgs.length === 0 || msgs[msgs.length - 1]?.role !== "user") {
    msgs.push({ role: "user", content: userMessage });
  }
  return msgs;
}

async function saveMessage(
  conversationId: string,
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL_CALL" | "TOOL_RESULT",
  content: string,
  extra?: {
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: Record<string, unknown>;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    durationMs?: number;
  }
) {
  await prisma.agentMessage.create({
    data: {
      conversationId,
      role,
      content,
      toolName: extra?.toolName,
      toolInput: (extra?.toolInput as any) ?? undefined,
      toolOutput: (extra?.toolOutput as any) ?? undefined,
      model: extra?.model,
      inputTokens: extra?.inputTokens,
      outputTokens: extra?.outputTokens,
      costUsd: extra?.costUsd,
      durationMs: extra?.durationMs,
    },
  });

  if (role === "USER") {
    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 1 }, updatedAt: new Date() },
    });
  }
}

async function updateConversationTokens(
  conversationId: string,
  tokens: number,
  costUsd: number
) {
  await prisma.agentConversation.update({
    where: { id: conversationId },
    data: {
      totalTokens: { increment: tokens },
      totalCostUsd: { increment: costUsd },
    },
  });
}

export async function generateConversationTitle(
  conversationId: string,
  firstMessage: string
) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Generate a very short title (max 6 words, in the same language as the message) for a conversation starting with: "${firstMessage.slice(0, 200)}"`,
        },
      ],
    });

    const title =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : null;

    if (title) {
      await prisma.agentConversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }
  } catch {
    // non-critical
  }
}

function extractSuggestedActions(text: string, locale: "ar" | "en") {
  const actions: { label: string; action: string; payload?: string }[] = [];
  const isArabic = locale === "ar";

  if (/trial|تجريبي|حصة تجريبية/i.test(text)) {
    actions.push({
      label: isArabic ? "احجز حصة تجريبية" : "Book a trial class",
      action: "book_trial",
    });
  }
  if (/program|برنامج|برامج/i.test(text)) {
    actions.push({
      label: isArabic ? "تعرف على برامجنا" : "View our programs",
      action: "send_message",
      payload: isArabic ? "ايش برامجكم؟" : "What programs do you offer?",
    });
  }
  if (/price|pricing|سعر|أسعار|باقة|باقات/i.test(text)) {
    actions.push({
      label: isArabic ? "عرض الباقات والأسعار" : "View packages & pricing",
      action: "send_message",
      payload: isArabic ? "ايش الباقات والأسعار؟" : "What are your packages and prices?",
    });
  }

  return actions.slice(0, 3);
}

export function shouldEscalateToSonnet(
  message: string,
  messageCount: number,
  toolResultSize?: number
): boolean {
  if (message.length > 200) return true;
  if (messageCount > 5) return true;
  if (toolResultSize && toolResultSize > 500) return true;
  if (/explain in detail|اشرح بالتفصيل/i.test(message)) return true;
  if (/at risk|complaint|cancel|إلغاء|شكوى|معرض/i.test(message)) return true;
  return false;
}
