"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { Role } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Send, Plus, Search, MessageSquare, Paperclip, X,
  Check, CheckCheck, ArrowLeft, FileText, ImageIcon, Mic, Video,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { VoiceRecorder } from "@/components/shared/voice-recorder";

/* ── types ──────────────────────────────────────────────── */
interface Conversation {
  threadId: string;
  lastMessage: string;
  lastAt: string;
  lastFromMe: boolean;
  otherUserId: string;
  otherName: string;
  otherRole: string;
  otherAvatar: string | null;
  unread: number;
}
interface ChatMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  createdAt: string;
  readAt: string | null;
  status: string;
  mine: boolean;
}
interface Other {
  id: string;
  name: string;
  role?: string;
  avatar?: string | null;
}
interface Recipient {
  userId: string;
  name: string;
  role: Role;
}
interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function roleBadgeVariant(role: string): "navy" | "info" | "success" | "default" {
  if (role === "TEACHER") return "info";
  if (role === "PARENT") return "success";
  if (role === "STUDENT") return "default";
  return "navy";
}

export function MessagesClient({
  currentUserId,
  currentRole,
}: {
  currentUserId: string;
  currentRole: Role;
}) {
  const t = useTranslations("Messages");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");

  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  // In-browser recorder: null = closed, else the active capture mode.
  const [recorderMode, setRecorderMode] = useState<"voice" | "video" | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseClient>["channel"]> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  // Compose-new dialog.
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [startingWith, setStartingWith] = useState<string | null>(null);

  /* ── load conversation list ──────────────────────────── */
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Deep-link: ?thread=<id> opens that conversation once the list loads.
  const sp = useSearchParams();
  const deepThread = sp.get("thread");
  const openedDeepLink = useRef(false);
  useEffect(() => {
    if (!deepThread || openedDeepLink.current || conversations.length === 0) return;
    const match = conversations.find((c) => c.threadId === deepThread);
    if (match) {
      openedDeepLink.current = true;
      openThread(match.threadId, {
        id: match.otherUserId,
        name: match.otherName,
        role: match.otherRole,
        avatar: match.otherAvatar,
      });
    }
    // If no match yet (brand-new thread w/ no messages), the list refreshes
    // after the first send and the user can tap it manually.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepThread, conversations]);

  /* ── open a thread + subscribe to its Realtime channel ── */
  const openThread = useCallback(
    async (threadId: string, other: Other) => {
      setActiveThread(threadId);
      setActiveOther(other);
      setOtherTyping(false);
      setLoadingThread(true);

      // Tear down any previous channel.
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      try {
        const res = await fetch(`/api/messages/${threadId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
          if (data.other) setActiveOther(data.other);
        } else {
          setMessages([]);
        }
      } finally {
        setLoadingThread(false);
        loadConversations();
      }

      // Subscribe to chat:{threadId} for live events.
      const supabase = createSupabaseClient();
      const channel = supabase.channel(`chat:${threadId}`, {
        config: { broadcast: { self: false } },
      });
      channel
        .on("broadcast", { event: "new_message" }, ({ payload }) => {
          const p = payload as ChatMessage & { fromUserId: string };
          if (p.fromUserId === currentUserId) return; // our own echo
          setMessages((prev) =>
            prev.some((m) => m.id === p.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: p.id,
                    fromUserId: p.fromUserId,
                    fromName: p.fromName,
                    body: p.body,
                    attachmentUrl: p.attachmentUrl,
                    attachmentName: p.attachmentName,
                    attachmentType: p.attachmentType,
                    attachmentSize: p.attachmentSize,
                    createdAt: p.createdAt,
                    readAt: null,
                    status: "DELIVERED",
                    mine: false,
                  },
                ]
          );
          setOtherTyping(false);
          // Mark the incoming message read (we have the thread open).
          fetch(`/api/messages/${threadId}`).catch(() => {});
        })
        .on("broadcast", { event: "read" }, ({ payload }) => {
          const p = payload as { readerUserId: string; readAt: string };
          if (p.readerUserId === currentUserId) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.mine && !m.readAt
                ? { ...m, readAt: p.readAt, status: "READ" }
                : m
            )
          );
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const p = payload as { userId: string };
          if (p.userId === currentUserId) return;
          setOtherTyping(true);
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setOtherTyping(false), 3500);
        })
        .subscribe();
      channelRef.current = channel;
    },
    [currentUserId, loadConversations]
  );

  // Clean up the channel on unmount.
  useEffect(() => {
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // Scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // Auto-grow the composer (max 4 lines).
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [draft]);

  /* ── typing broadcast ────────────────────────────────── */
  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return; // throttle
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }

  /* ── send a message ──────────────────────────────────── */
  async function sendMessage() {
    if ((!draft.trim() && !pendingFile) || !activeOther || sending) return;
    setSending(true);
    const optimisticBody = draft.trim();
    const optimisticFile = pendingFile;
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: activeOther.id,
          body: optimisticBody,
          threadId: activeThread,
          attachment: optimisticFile ?? undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraft("");
        setPendingFile(null);
        // Optimistically append our own message.
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            fromUserId: currentUserId,
            fromName: "",
            body: optimisticBody,
            attachmentUrl: optimisticFile?.url ?? null,
            attachmentName: optimisticFile?.name ?? null,
            attachmentType: optimisticFile?.type ?? null,
            attachmentSize: optimisticFile?.size ?? null,
            createdAt: data.message.createdAt,
            readAt: null,
            status: "SENT",
            mine: true,
          },
        ]);
        loadConversations();
      }
    } finally {
      setSending(false);
    }
  }

  /* ── attachment upload ───────────────────────────────── */
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t("fileTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/messages/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setPendingFile(data.attachment);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || t("uploadFailed"));
      }
    } finally {
      setUploading(false);
    }
  }

  /* ── in-browser recording upload (reuses the chat upload route) ── */
  async function uploadRecording(
    blob: Blob,
    durationSec: number,
    mode: "voice" | "video",
    mimeType?: string,
  ) {
    setUploading(true);
    try {
      const fd = new FormData();
      // Use the REAL container the recorder produced (Safari = mp4, others = webm)
      // so the filename extension + server magic-byte check agree on the bytes.
      const realMime = (mimeType || blob.type || "").toLowerCase();
      const ext = realMime.includes("mp4")
        ? mode === "video"
          ? "mp4"
          : "m4a"
        : realMime.includes("ogg")
        ? "ogg"
        : "webm";
      const kind = mode === "video" ? "VIDEO" : "AUDIO";
      fd.append("file", blob, `${mode}.${ext}`);
      fd.append("kind", kind);
      fd.append("durationSec", String(durationSec));
      // Defense in depth: pass the REAL container mime the recorder produced so
      // the server can trust a take it already previewed even if magic-byte
      // sniffing of iOS fragmented-MP4 audio is inconclusive.
      fd.append("declaredMime", realMime);
      const res = await fetch("/api/messages/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setPendingFile(data.attachment);
        setRecorderMode(null);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error(
          "[messages] recording upload rejected:",
          res.status,
          err.error ?? err,
        );
        toast.error(err.error || t("uploadFailed"));
      }
    } catch (e) {
      // Network/thrown error — keep the generic toast but log the real detail
      // so these failures aren't opaque in the field.
      console.error("[messages] recording upload failed:", e);
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  /* ── recipient search ────────────────────────────────── */
  useEffect(() => {
    if (!composeOpen) return;
    const tid = setTimeout(async () => {
      const res = await fetch(
        `/api/messages/recipients?q=${encodeURIComponent(recipientQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients);
      }
    }, 250);
    return () => clearTimeout(tid);
  }, [composeOpen, recipientQuery]);

  async function startConversation(r: Recipient) {
    setStartingWith(r.userId);
    try {
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: r.userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setComposeOpen(false);
        setRecipientQuery("");
        await openThread(data.threadId, {
          id: r.userId,
          name: r.name,
          role: r.role,
        });
      }
    } finally {
      setStartingWith(null);
    }
  }

  const filtered = conversations.filter((c) =>
    c.otherName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-hajr-muted">{t("subtitle")}</p>
        <Button variant="cta" onClick={() => setComposeOpen(true)}>
          <Plus className="me-1.5 h-4 w-4" />
          {t("newMessage")}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid h-[640px] grid-cols-1 md:grid-cols-[320px_1fr]">
          {/* ── conversation list ── */}
          <div
            className={cn(
              "flex flex-col border-hajr-border md:border-e",
              activeThread && "hidden md:flex"
            )}
          >
            <div className="border-b border-hajr-border p-3">
              <div className="relative">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-hajr-light" />
                <Input
                  placeholder={t("search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-hajr-navy" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <MessageSquare className="h-9 w-9 text-hajr-light" />
                  <p className="text-sm text-hajr-muted">{t("noConversations")}</p>
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.threadId}
                    onClick={() =>
                      openThread(c.threadId, {
                        id: c.otherUserId,
                        name: c.otherName,
                        role: c.otherRole,
                        avatar: c.otherAvatar,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-hajr-border p-3 text-start transition-colors hover:bg-hajr-hover",
                      activeThread === c.threadId && "bg-hajr-surface"
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {c.otherAvatar && <AvatarImage src={c.otherAvatar} />}
                      <AvatarFallback className="bg-hajr-deep-navy text-xs font-semibold text-white">
                        {initials(c.otherName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm text-hajr-navy",
                            c.unread > 0 ? "font-bold" : "font-medium"
                          )}
                        >
                          {c.otherName}
                        </span>
                        <span className="shrink-0 text-[11px] text-hajr-light">
                          {fmtClock(c.lastAt, isAr)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-xs",
                            c.unread > 0
                              ? "font-medium text-hajr-body"
                              : "text-hajr-muted"
                          )}
                        >
                          {c.lastFromMe ? `${t("youPrefix")} ` : ""}
                          {c.lastMessage}
                        </span>
                        {c.unread > 0 && (
                          <span className="num flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-hajr-rose px-1.5 text-[11px] font-bold text-white">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── thread pane ── */}
          <div
            className={cn(
              "flex flex-col bg-hajr-surface",
              !activeThread && "hidden md:flex"
            )}
          >
            {!activeThread ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-hajr-muted">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
                  <MessageSquare className="h-8 w-8 text-hajr-light" />
                </div>
                <p className="text-sm">{t("selectConversation")}</p>
              </div>
            ) : (
              <>
                {/* header */}
                <div className="flex items-center gap-3 border-b border-hajr-border bg-white px-4 py-3">
                  <button
                    onClick={() => {
                      setActiveThread(null);
                      setActiveOther(null);
                      if (channelRef.current) {
                        channelRef.current.unsubscribe();
                        channelRef.current = null;
                      }
                    }}
                    className="rounded-md p-1 text-hajr-navy hover:bg-hajr-hover md:hidden"
                    aria-label={t("back")}
                  >
                    <ArrowLeft className="h-5 w-5 rtl-flip" />
                  </button>
                  <Avatar className="h-9 w-9">
                    {activeOther?.avatar && <AvatarImage src={activeOther.avatar} />}
                    <AvatarFallback className="bg-hajr-deep-navy text-xs font-semibold text-white">
                      {initials(activeOther?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-hajr-navy">
                      {activeOther?.name}
                    </div>
                    {activeOther?.role && (
                      <Badge
                        variant={roleBadgeVariant(activeOther.role)}
                        className="mt-0.5 px-1.5 py-0 text-[10px]"
                      >
                        {t(`role_${activeOther.role}` as any)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* messages */}
                <div className="flex-1 space-y-1 overflow-y-auto p-4">
                  {loadingThread ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-5 w-5 animate-spin text-hajr-navy" />
                    </div>
                  ) : (
                    renderMessages(messages, isAr, t)
                  )}
                  {otherTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-card">
                        <span className="text-xs text-hajr-muted">{t("typing")}</span>
                        <span className="flex gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-hajr-light"
                              style={{ animationDelay: `${i * 0.18}s` }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* attachment preview */}
                {pendingFile && (
                  <div className="flex items-center gap-2 border-t border-hajr-border bg-white px-4 py-2">
                    <AttachmentChip att={pendingFile} />
                    <button
                      onClick={() => setPendingFile(null)}
                      className="ms-auto rounded-md p-1 text-hajr-muted hover:bg-hajr-hover"
                      aria-label={t("removeAttachment")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* composer */}
                <div className="flex items-end gap-2 border-t border-hajr-border bg-white p-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFile}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !!recorderMode}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-hajr-navy transition-colors hover:bg-hajr-hover disabled:opacity-50"
                    aria-label={t("attach")}
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => setRecorderMode((m) => (m === "voice" ? null : "voice"))}
                    disabled={uploading}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-hajr-hover disabled:opacity-50",
                      recorderMode === "voice" ? "bg-hajr-rose/10 text-hajr-rose" : "text-hajr-navy"
                    )}
                    aria-label={t("recordVoice")}
                    title={t("recordVoice")}
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setRecorderMode((m) => (m === "video" ? null : "video"))}
                    disabled={uploading}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-hajr-hover disabled:opacity-50",
                      recorderMode === "video" ? "bg-hajr-rose/10 text-hajr-rose" : "text-hajr-navy"
                    )}
                    aria-label={t("recordVideo")}
                    title={t("recordVideo")}
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <textarea
                    ref={composerRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      notifyTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={t("typeMessage")}
                    className="max-h-28 flex-1 resize-none rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm text-hajr-navy outline-none transition-colors focus:ring-2 focus:ring-hajr-navy/20"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || (!draft.trim() && !pendingFile)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hajr-deep-navy text-white transition-colors hover:bg-hajr-navy disabled:opacity-40"
                    aria-label={t("send")}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 rtl-flip" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── compose-new dialog ── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newMessage")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-hajr-light" />
              <Input
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
                placeholder={t("searchRecipient")}
                className="ps-9"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-hajr-border">
              {recipients.length === 0 ? (
                <div className="p-6 text-center text-sm text-hajr-muted">
                  {t("noRecipients")}
                </div>
              ) : (
                recipients.map((r) => (
                  <button
                    key={r.userId}
                    onClick={() => startConversation(r)}
                    disabled={startingWith === r.userId}
                    className="flex w-full items-center gap-3 border-b border-hajr-border p-3 text-start transition-colors last:border-0 hover:bg-hajr-hover"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-hajr-deep-navy text-xs font-semibold text-white">
                        {initials(r.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm font-medium text-hajr-navy">
                      {r.name}
                    </span>
                    {startingWith === r.userId ? (
                      <Loader2 className="h-4 w-4 animate-spin text-hajr-navy" />
                    ) : (
                      <Badge
                        variant={roleBadgeVariant(r.role)}
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {t(`role_${r.role}` as any)}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── in-browser recorder dialog (voice/video) ──
          Rendered in a portal as a fixed, centered modal — completely OUTSIDE
          the messages-card flow — so a tall portrait camera preview can NEVER
          push the composer or chat list around. Closing the dialog unmounts
          VoiceRecorder, whose cleanup effect stops the camera/mic stream. */}
      <Dialog
        open={!!recorderMode}
        onOpenChange={(open) => {
          if (!open) setRecorderMode(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {recorderMode === "video" ? t("recordVideo") : t("recordVoice")}
            </DialogTitle>
          </DialogHeader>
          {/* Scrollable body: preview is height-capped inside VoiceRecorder, and
              this container scrolls if the controls ever exceed the modal. */}
          <div className="-mx-1 flex-1 overflow-y-auto px-1 py-1">
            {recorderMode && (
              <VoiceRecorder
                mode={recorderMode}
                maxSeconds={3 * 60}
                busy={uploading}
                onCaptured={(blob, sec, mime) =>
                  uploadRecording(blob, sec, recorderMode, mime)
                }
                onCancel={() => setRecorderMode(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── helpers ────────────────────────────────────────────── */

function fmtClock(iso: string, isAr: boolean): string {
  return new Date(iso).toLocaleTimeString(isAr ? "ar-SA-u-nu-latn" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string, isAr: boolean, t: (k: string) => string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t("dateToday");
  if (d.toDateString() === yest.toDateString()) return t("dateYesterday");
  return d.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US", {
    day: "numeric",
    month: "long",
  });
}

/** Render the message list with date separators and bubbles. */
function renderMessages(
  messages: ChatMessage[],
  isAr: boolean,
  t: (k: string) => string
) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-hajr-muted">
        {t("emptyThread")}
      </div>
    );
  }
  const out: React.ReactNode[] = [];
  let lastDay = "";
  for (const m of messages) {
    const k = dayKey(m.createdAt);
    if (k !== lastDay) {
      lastDay = k;
      out.push(
        <div key={`sep-${m.id}`} className="flex justify-center py-2">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-hajr-muted shadow-card">
            {dayLabel(m.createdAt, isAr, t)}
          </span>
        </div>
      );
    }
    out.push(<MessageBubble key={m.id} m={m} isAr={isAr} />);
  }
  return out;
}

function MessageBubble({ m, isAr }: { m: ChatMessage; isAr: boolean }) {
  return (
    <div className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[78%]">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm shadow-card",
            m.mine
              ? "bg-hajr-deep-navy text-white"
              : "bg-white text-hajr-navy"
          )}
        >
          {m.attachmentUrl && (
            <AttachmentBlock
              url={m.attachmentUrl}
              name={m.attachmentName ?? "attachment"}
              type={m.attachmentType ?? ""}
              mine={m.mine}
            />
          )}
          {m.body && (
            <div className={cn("whitespace-pre-wrap break-words", m.attachmentUrl && "mt-1.5")}>
              {m.body}
            </div>
          )}
        </div>
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1 px-1 text-[10px] text-hajr-light",
            m.mine ? "justify-end" : "justify-start"
          )}
        >
          <span>{fmtClock(m.createdAt, isAr)}</span>
          {m.mine && <ReadReceipt status={m.status} readAt={m.readAt} />}
        </div>
      </div>
    </div>
  );
}

function ReadReceipt({ status, readAt }: { status: string; readAt: string | null }) {
  if (readAt || status === "READ") {
    return <CheckCheck className="h-3.5 w-3.5 text-hajr-info" />;
  }
  if (status === "DELIVERED") {
    return <CheckCheck className="h-3.5 w-3.5 text-hajr-light" />;
  }
  return <Check className="h-3.5 w-3.5 text-hajr-light" />;
}

function AttachmentBlock({
  url,
  name,
  type,
  mine,
}: {
  url: string;
  name: string;
  type: string;
  mine: boolean;
}) {
  const isImage = type.startsWith("image/");
  const isAudio = type.startsWith("audio/");
  const isVideo = type.startsWith("video/");
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          className="max-h-56 w-full rounded-lg object-cover"
        />
      </a>
    );
  }
  if (isAudio) {
    return <audio controls src={url} className="w-full max-w-[240px]" />;
  }
  if (isVideo) {
    return (
      <video
        controls
        src={url}
        // Keep a portrait phone video a COMPACT chat bubble: bound both width
        // (≤240px) and height (≤280px) and object-contain so it never grows into
        // a tall full-width box. Matches the audio bubble's ≤240px footprint.
        className="h-auto max-h-[280px] w-full max-w-[240px] rounded-lg bg-black object-contain"
        playsInline
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2",
        mine ? "bg-white/10" : "bg-hajr-surface"
      )}
    >
      <FileText className={cn("h-5 w-5 shrink-0", mine ? "text-white" : "text-hajr-navy")} />
      <span className="truncate text-xs underline">{name}</span>
    </a>
  );
}

function AttachmentChip({ att }: { att: Attachment }) {
  const isImage = att.type.startsWith("image/");
  const isAudio = att.type.startsWith("audio/");
  const isVideo = att.type.startsWith("video/");
  return (
    <div className="flex items-center gap-2 rounded-lg bg-hajr-surface px-2.5 py-1.5">
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-hajr-navy" />
      ) : isAudio ? (
        <Mic className="h-4 w-4 text-hajr-navy" />
      ) : isVideo ? (
        <Video className="h-4 w-4 text-hajr-navy" />
      ) : (
        <FileText className="h-4 w-4 text-hajr-navy" />
      )}
      <span className="max-w-[200px] truncate text-xs font-medium text-hajr-navy">
        {att.name}
      </span>
    </div>
  );
}
