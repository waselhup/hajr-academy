"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentChat } from "@/lib/agent/use-agent-chat";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/* ── inline markdown ─────────────────────────────────────── */
function renderInlineMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code class="bg-black/5 px-1 rounded text-sm">$1</code>');
    return (
      <p
        key={i}
        className={cn("leading-relaxed", !line.trim() && "h-2")}
        dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
      />
    );
  });
}

/* ── bouncing dots ───────────────────────────────────────── */
function BouncingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          style={{
            animation: "hajr-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`@keyframes hajr-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </span>
  );
}

export default function AdminChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    suggestedActions,
    activeToolName,
    sendMessage,
    reset,
  } = useAgentChat({ agentType: "ADMIN_AGENT" });

  /* auto-scroll */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  }, [input, isLoading, sendMessage]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed bottom-6 end-6 z-40 flex items-center gap-2 bg-brand-navy text-white rounded-full px-4 py-2.5 shadow-lg hover:bg-brand-navy/90 transition-colors">
          <Bot className="h-5 w-5" />
          <span className="text-sm font-medium">هجر</span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col p-0 w-full sm:max-w-md">
        {/* header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b space-y-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-brand-navy">
              <Bot className="h-5 w-5" />
              هجر Admin
            </SheetTitle>
            <button
              onClick={() => { reset(); setInput(""); }}
              className="text-muted-foreground hover:text-brand-navy transition-colors"
              title="محادثة جديدة"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-hajr-deep-navy text-white ms-auto"
                  : "bg-gray-100 text-brand-navy"
              )}
            >
              {msg.role === "assistant" && !msg.content && isLoading ? (
                <BouncingDots className="text-brand-rose" />
              ) : (
                renderInlineMarkdown(msg.content)
              )}
            </div>
          ))}

          {/* tool indicator */}
          {activeToolName && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span>🔧</span>
              <span>جاري تنفيذ: {activeToolName}</span>
            </div>
          )}

          {/* error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          {/* suggested actions */}
          {suggestedActions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestedActions.map((a) => (
                <button
                  key={a.action}
                  onClick={() => {
                    sendMessage(a.action);
                    setInput("");
                  }}
                  className="bg-hajr-hover/40 hover:bg-hajr-hover/70 text-brand-navy text-xs rounded-full px-3 py-1.5 transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* input area */}
        <div className="border-t px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="اكتب رسالتك..."
              className="flex-1 rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-rose/30"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-hajr-deep-navy hover:bg-hajr-deep-navy/80 disabled:opacity-40 text-white rounded-xl p-2 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
