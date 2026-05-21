"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Send, Plus, Search, MessageSquare } from "lucide-react";
import { fmtRelative } from "@/lib/format";

interface Conversation {
  threadId: string;
  lastMessage: string;
  lastAt: string;
  otherUserId: string;
  otherName: string;
  otherRole: string;
  unread: number;
}
interface ThreadMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  body: string;
  createdAt: string;
  mine: boolean;
}
interface Recipient {
  userId: string;
  name: string;
  role: Role;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MessagesClient({
  currentUserId,
  currentRole,
}: {
  currentUserId: string;
  currentRole: Role;
}) {
  const t = useTranslations("Messages");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");

  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Compose-new dialog state.
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(
    null
  );
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // ── Load conversation list ──
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
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

  // ── Open a thread ──
  const openThread = useCallback(
    async (threadId: string, other: { id: string; name: string }) => {
      setActiveThread(threadId);
      setActiveOther(other);
      setLoadingThread(true);
      try {
        const res = await fetch(`/api/messages/${threadId}`);
        if (res.ok) {
          const data = await res.json();
          setThreadMessages(data.messages);
          if (data.other) setActiveOther(data.other);
        }
      } finally {
        setLoadingThread(false);
        // Refresh list (unread count may have cleared).
        loadConversations();
      }
    },
    [loadConversations]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  // ── Send a reply in the active thread ──
  async function sendReply() {
    if (!draft.trim() || !activeOther) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: activeOther.id,
          body: draft.trim(),
          threadId: activeThread,
        }),
      });
      if (res.ok) {
        setDraft("");
        if (activeThread) {
          await openThread(activeThread, activeOther);
        }
      }
    } finally {
      setSending(false);
    }
  }

  // ── Recipient search for compose ──
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

  async function sendNew() {
    if (!selectedRecipient || !composeBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: selectedRecipient.userId,
          subject: composeSubject.trim() || undefined,
          body: composeBody.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComposeOpen(false);
        setSelectedRecipient(null);
        setComposeSubject("");
        setComposeBody("");
        await loadConversations();
        openThread(data.message.threadId, {
          id: selectedRecipient.userId,
          name: selectedRecipient.name,
        });
      }
    } finally {
      setSending(false);
    }
  }

  const filteredConvos = conversations.filter((c) =>
    c.otherName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => setComposeOpen(true)}
          className="bg-brand-rose text-white"
        >
          <Plus className="me-2 h-4 w-4" />
          {t("newMessage")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <Card className="h-[600px] overflow-hidden">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
          <div className="h-[540px] overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-rose" />
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("noConversations")}
              </div>
            ) : (
              filteredConvos.map((c) => (
                <button
                  key={c.threadId}
                  onClick={() =>
                    openThread(c.threadId, {
                      id: c.otherUserId,
                      name: c.otherName,
                    })
                  }
                  className={`flex w-full items-center gap-3 border-b p-3 text-start hover:bg-gray-50 ${
                    activeThread === c.threadId ? "bg-brand-lavender/10" : ""
                  }`}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{initials(c.otherName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          c.unread > 0 ? "font-bold" : "font-medium"
                        }`}
                      >
                        {c.otherName}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {fmtRelative(c.lastAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {c.lastMessage}
                      </span>
                      {c.unread > 0 && (
                        <Badge variant="rose" className="num shrink-0">
                          {c.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Thread view */}
        <Card className="flex h-[600px] flex-col">
          {!activeThread ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageSquare className="h-10 w-10 text-gray-300" />
              <p className="text-sm">{t("selectConversation")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {initials(activeOther?.name ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{activeOther?.name}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingThread ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-rose" />
                  </div>
                ) : (
                  threadMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          m.mine
                            ? "bg-brand-rose text-white"
                            : "bg-gray-100 text-brand-navy"
                        }`}
                      >
                        <div className="whitespace-pre-line">{m.body}</div>
                        <div
                          className={`mt-1 text-[10px] ${
                            m.mine ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {fmtRelative(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="flex items-end gap-2 border-t p-3">
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("typeMessage")}
                  className="resize-none"
                />
                <Button
                  onClick={sendReply}
                  disabled={sending || !draft.trim()}
                  className="bg-brand-rose text-white"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 rtl-flip" />
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Compose new message */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newMessage")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t("to")}</label>
              {selectedRecipient ? (
                <div className="mt-1 flex items-center justify-between rounded-md border p-2">
                  <span className="text-sm">{selectedRecipient.name}</span>
                  <button
                    onClick={() => setSelectedRecipient(null)}
                    className="text-xs text-brand-rose"
                  >
                    {t("change")}
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    placeholder={t("searchRecipient")}
                    className="mt-1"
                  />
                  {recipients.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-md border">
                      {recipients.map((r) => (
                        <button
                          key={r.userId}
                          onClick={() => setSelectedRecipient(r)}
                          className="flex w-full items-center justify-between p-2 text-start text-sm hover:bg-gray-50"
                        >
                          <span>{r.name}</span>
                          <Badge variant="outline">{r.role}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">{t("subject")}</label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("messageBody")}</label>
              <Textarea
                rows={5}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={sendNew}
              disabled={sending || !selectedRecipient || !composeBody.trim()}
              className="bg-brand-rose text-white"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("send")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
