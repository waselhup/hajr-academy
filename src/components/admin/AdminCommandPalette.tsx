"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentChat } from "@/lib/agent/use-agent-chat";

/* ── inline markdown helpers ─────────────────────────────── */
function renderInlineMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-sm">$1</code>');
    return (
      <p
        key={i}
        className={cn("leading-relaxed", !line.trim() && "h-3")}
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

export default function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    suggestedActions,
    activeToolName,
    sendMessage,
    stop,
    reset,
  } = useAgentChat({ agentType: "ADMIN_AGENT" });

  /* ── keyboard shortcut ─────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* auto-focus */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  /* scroll to bottom */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleClose = useCallback(() => {
    setOpen(false);
    stop();
  }, [stop]);

  if (!open) return null;

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-navy/95 backdrop-blur-sm flex justify-center"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={cn(
          "w-full max-w-2xl flex flex-col",
          "sm:mt-[15vh] sm:max-h-[75vh]",
          "max-sm:h-full max-sm:mt-0"
        )}
      >
        {/* header row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Hajr Admin AI</span>
          </div>
          <button onClick={handleClose} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* input */}
        <div className="px-4">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="اسأل حجر أي شيء... / Ask Hajr anything..."
            className="w-full text-lg bg-white/10 text-white placeholder:text-white/40 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-white/40 transition-colors"
          />
        </div>

        {/* tool indicator */}
        {activeToolName && (
          <div className="px-4 pt-2 text-white/50 text-sm flex items-center gap-2">
            <span className="text-base">🔧</span>
            <span>جاري البحث...</span>
          </div>
        )}

        {/* response area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "mb-3",
                msg.role === "user"
                  ? "text-white/50 text-sm"
                  : "text-white/90 prose prose-invert max-w-none"
              )}
            >
              {msg.role === "user" ? (
                <p className="italic">{msg.content}</p>
              ) : msg.content ? (
                renderInlineMarkdown(msg.content)
              ) : isLoading ? (
                <BouncingDots className="text-white/60" />
              ) : null}
            </div>
          ))}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* suggested actions */}
        {suggestedActions.length > 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {suggestedActions.map((a) => (
              <button
                key={a.action}
                onClick={() => {
                  sendMessage(a.action);
                  setInput("");
                }}
                className="bg-white/10 hover:bg-white/20 text-white text-sm rounded-full px-3 py-1 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* bottom bar */}
        <div className="px-4 pb-4 flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-brand-rose hover:bg-brand-rose/80 disabled:opacity-40 text-white rounded-lg px-3 py-2 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => { reset(); setInput(""); }}
              className="text-white/40 hover:text-white/70 text-xs ms-auto"
            >
              محادثة جديدة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
