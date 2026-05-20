import type { PrismaClient } from "@prisma/client";

export interface AgentConfig {
  agentType: "ADMIN_AGENT" | "PUBLIC_ASSISTANT";
  systemPrompt: string;
  tools: AgentTool[];
  model: "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";
  maxTokens: number;
  userId?: string;
  userRole?: string;
  locale: "ar" | "en";
  conversationId?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
}

export interface AgentContext {
  userId?: string;
  userRole?: string;
  locale: "ar" | "en";
  prisma: PrismaClient;
  conversationId: string;
}

export interface StreamEvent {
  type: "text" | "tool_start" | "tool_end" | "done" | "error" | "suggested_actions";
  content?: string;
  toolName?: string;
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  label: string;
  action: string;
  payload?: string;
}

export const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model] ?? PRICING["claude-haiku-4-5-20251001"];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
