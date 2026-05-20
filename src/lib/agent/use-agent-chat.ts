"use client";

import { useState, useCallback, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface SuggestedAction {
  label: string;
  action: string;
  payload?: string;
}

interface UseAgentChatOptions {
  agentType: "ADMIN_AGENT" | "PUBLIC_ASSISTANT";
  conversationId?: string;
  visitorId?: string;
  onConversationCreated?: (id: string) => void;
}

export function useAgentChat(options: UseAgentChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(
    options.conversationId
  );
  const [remaining, setRemaining] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      setSuggestedActions([]);
      setIsLoading(true);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "", createdAt: new Date() },
      ]);

      try {
        abortRef.current = new AbortController();

        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            conversationId,
            agentType: options.agentType,
            visitorId: options.visitorId,
          }),
          signal: abortRef.current.signal,
        });

        if (res.status === 429) {
          const data = await res.json();
          setError(data.message);
          setRemaining(0);
          setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
          setIsLoading(false);
          return;
        }

        if (res.status === 503) {
          setError("حجر غير متاح حالياً، حاول لاحقاً");
          setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to send message");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case "text":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: m.content + event.content }
                        : m
                    )
                  );
                  break;
                case "tool_start":
                  setActiveToolName(event.toolName);
                  break;
                case "tool_end":
                  setActiveToolName(null);
                  break;
                case "suggested_actions":
                  setSuggestedActions(event.suggestedActions ?? []);
                  break;
                case "done":
                  if (event.conversationId && !conversationId) {
                    setConversationId(event.conversationId);
                    options.onConversationCreated?.(event.conversationId);
                  }
                  break;
                case "error":
                  setError(event.content);
                  break;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      } finally {
        setIsLoading(false);
        setActiveToolName(null);
        abortRef.current = null;
      }
    },
    [isLoading, conversationId, options]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setActiveToolName(null);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
    setSuggestedActions([]);
    setRemaining(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    suggestedActions,
    activeToolName,
    conversationId,
    remaining,
    sendMessage,
    stop,
    reset,
  };
}
