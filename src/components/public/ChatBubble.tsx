"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentChat } from "@/lib/agent/use-agent-chat";

/* ── inline markdown ─────────────────────────────────────── */
function renderInlineMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code class="bg-black/5 px-1 rounded text-xs">$1</code>');
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

/* ── quick-reply chips ───────────────────────────────────── */
const QUICK_REPLIES_AR = [
  { label: "البرامج", action: "ما هي البرامج المتاحة؟" },
  { label: "الأسعار", action: "ما هي أسعار الدورات؟" },
  { label: "حجز تجريبي", action: "أريد حجز حصة تجريبية" },
  { label: "سؤال آخر", action: "لدي سؤال آخر" },
];
const QUICK_REPLIES_EN = [
  { label: "Programs", action: "What programs do you offer?" },
  { label: "Pricing", action: "What are the course prices?" },
  { label: "Book Trial", action: "I'd like to book a trial class" },
  { label: "Other Question", action: "I have another question" },
];

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [visitorId] = useState(() => crypto.randomUUID());
  const [showedWelcome, setShowedWelcome] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    error,
    suggestedActions,
    activeToolName,
    remaining,
    sendMessage,
    reset,
  } = useAgentChat({ agentType: "PUBLIC_ASSISTANT", visitorId });

  const isArabic = typeof document !== "undefined" && document.documentElement.lang === "ar";
  const quickReplies = isArabic ? QUICK_REPLIES_AR : QUICK_REPLIES_EN;

  const welcomeMessage = isArabic
    ? "مرحبا! 👋 أنا هجر، مساعدك في أكاديمية هجر.\n\nكيف أقدر أساعدك اليوم؟"
    : "Hello! 👋 I'm Hajr, your assistant at Hajr A° Academy.\n\nHow can I help you today?";

  /* scroll on new messages */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  /* focus input on open */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (!showedWelcome) setShowedWelcome(true);
    }
  }, [open, showedWelcome]);

  const handleSend = useCallback(
    (text?: string) => {
      const msg = text ?? input;
      if (!msg.trim() || isLoading) return;
      sendMessage(msg);
      setInput("");
    },
    [input, isLoading, sendMessage]
  );

  const hasConversation = messages.length > 0;

  return (
    <>
      {/* floating button — NAVY circle per brand v2 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className={cn(
            "fixed z-50 bottom-6 end-6",
            "h-14 w-14 rounded-full bg-hajr-deep-navy text-white shadow-lg",
            "flex items-center justify-center",
            "hover:scale-105 transition-transform",
            "animate-[hajr-pulse_2s_ease-in-out_infinite]"
          )}
        >
          <MessageCircle className="h-6 w-6" />
          <style>{`@keyframes hajr-pulse{0%,100%{box-shadow:0 0 0 0 rgba(30,42,54,0.35)}70%{box-shadow:0 0 0 12px rgba(30,42,54,0)}}`}</style>
        </button>
      )}

      {/* chat window */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          /* desktop */
          "sm:bottom-6 sm:end-6 sm:w-[380px] sm:h-[500px] sm:rounded-2xl sm:shadow-2xl",
          /* mobile: full-width bottom sheet */
          "max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[85vh] max-sm:rounded-t-2xl max-sm:shadow-2xl",
          /* open/close */
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="flex flex-col h-full bg-white rounded-[inherit] overflow-hidden">
          {/* header — deep navy */}
          <div className="flex items-center justify-between bg-hajr-deep-navy text-white px-4 py-3">
            <span className="font-semibold text-sm">هجر | مساعدك الذكي</span>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {/* welcome */}
            {showedWelcome && (
              <div className="bg-white border border-hajr-border text-hajr-navy rounded-2xl px-4 py-2.5 text-sm max-w-[85%]">
                {renderInlineMarkdown(welcomeMessage)}
              </div>
            )}

            {/* quick replies (before first message) */}
            {!hasConversation && showedWelcome && (
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((qr) => (
                  <button
                    key={qr.action}
                    onClick={() => handleSend(qr.action)}
                    className="bg-hajr-surface hover:bg-hajr-hover border border-hajr-border text-hajr-navy text-xs rounded-full px-3 py-1.5 transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* conversation messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-slate-100 text-hajr-navy ms-auto"
                    : "bg-white border border-hajr-border text-hajr-navy"
                )}
              >
                {msg.role === "assistant" && !msg.content && isLoading ? (
                  <BouncingDots className="text-hajr-navy" />
                ) : (
                  renderInlineMarkdown(msg.content)
                )}
              </div>
            ))}

            {/* tool indicator */}
            {activeToolName && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>🔧</span>
                <span>جاري البحث...</span>
              </div>
            )}

            {/* error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2">{error}</div>
            )}

            {/* suggested actions */}
            {suggestedActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map((a) => (
                  <button
                    key={a.action}
                    onClick={() => handleSend(a.action)}
                    className="bg-hajr-surface hover:bg-hajr-hover border border-hajr-border text-hajr-navy text-xs rounded-full px-3 py-1.5 transition-colors"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* remaining messages */}
          {remaining !== null && (
            <div className="px-4 text-xs text-muted-foreground text-center">
              {remaining > 0
                ? isArabic
                  ? `${remaining} رسالة متبقية`
                  : `${remaining} messages remaining`
                : isArabic
                  ? "تم استنفاد الرسائل المجانية"
                  : "Free messages used up"}
            </div>
          )}

          {/* input area */}
          <div className="border-t px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={isArabic ? "اكتب رسالتك..." : "Type your message..."}
                className="flex-1 rounded-xl border border-hajr-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-hajr-navy/25"
                disabled={remaining === 0}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim() || remaining === 0}
                aria-label="Send"
                className="bg-hajr-deep-navy hover:bg-hajr-navy disabled:opacity-40 text-white rounded-xl p-2 transition-colors"
              >
                <Send className="h-4 w-4 rtl-flip" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              powered by هجر AI
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
