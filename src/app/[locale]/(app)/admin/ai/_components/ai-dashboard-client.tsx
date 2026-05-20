"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Calendar,
  Cpu,
  Wallet,
  UserPlus,
  MessageSquare,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Stats = {
  conversations: { today: number; week: number; month: number };
  totalMessages: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostSar: number;
  avgMessagesPerConversation: number;
  trialRequests: {
    fromAI: number;
    conversions: number;
    conversionRate: number;
  };
};

type Conversation = {
  id: string;
  agentType: string;
  title: string | null;
  user: { id: string; name: string; email: string; role: string } | null;
  messageCount: number;
  totalTokens: number;
  totalCostUsd: number;
  firstMessage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ConversationsResponse = {
  conversations: Conversation[];
  total: number;
  page: number;
  pages: number;
};

type ConversationDetail = {
  id: string;
  messages: { role: string; content: string; createdAt: string }[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatTime(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

function truncate(str: string | null, max: number): string {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIDashboardClient() {
  const t = useTranslations();
  const locale = useLocale();

  const [stats, setStats] = useState<Stats | null>(null);
  const [convos, setConvos] = useState<ConversationsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [convoMessages, setConvoMessages] = useState<
    ConversationDetail["messages"] | null
  >(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, convosRes] = await Promise.all([
        fetch("/api/admin/agent/stats"),
        fetch(`/api/admin/agent/conversations?page=${page}&limit=50`),
      ]);

      if (!statsRes.ok || !convosRes.ok) {
        setError("Failed to fetch data");
        return;
      }

      const [statsData, convosData] = await Promise.all([
        statsRes.json(),
        convosRes.json(),
      ]);

      setStats(statsData);
      setConvos(convosData);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Initial load and auto-refresh every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function viewConversation(convo: Conversation) {
    setSelectedConvo(convo);
    setConvoMessages(null);
    setMessagesLoading(true);
    try {
      const res = await fetch(
        `/api/admin/agent/conversations?page=1&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        const found = data.conversations?.find(
          (c: any) => c.id === convo.id
        );
        // The API doesn't expose individual messages in list endpoint,
        // so we show what we have from the list data
        setConvoMessages(null);
      }
    } catch {
      // silent
    } finally {
      setMessagesLoading(false);
    }
  }

  if (error && !stats) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">
          {locale === "ar"
            ? "حجر — لوحة تحكم الذكاء الاصطناعي"
            : "Hajr — AI Dashboard"}
        </h1>
        <Card className="p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => { setLoading(true); fetchData(); }}>
            <RefreshCw className="me-2 h-4 w-4" />
            {t("Common.retry")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {locale === "ar"
              ? "حجر — لوحة تحكم الذكاء الاصطناعي"
              : "Hajr — AI Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {locale === "ar"
              ? "إحصائيات المحادثات والتحليلات"
              : "Conversation stats & analytics"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setLoading(true); fetchData(); }}
          disabled={loading}
        >
          <RefreshCw
            className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          {t("Common.refresh")}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {locale === "ar" ? "المحادثات" : "Conversations"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold num">
                  {stats?.conversations.month.toLocaleString() ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {locale === "ar" ? "اليوم" : "Today"}{" "}
                  <span className="num font-medium">
                    {stats?.conversations.today ?? 0}
                  </span>
                  {" / "}
                  {locale === "ar" ? "الأسبوع" : "Week"}{" "}
                  <span className="num font-medium">
                    {stats?.conversations.week ?? 0}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Tokens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {locale === "ar" ? "التوكنات" : "Tokens"}
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold num">
                  {formatTokens(stats?.totalTokens ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {locale === "ar" ? "معدل الرسائل" : "Avg msgs/convo"}{" "}
                  <span className="num font-medium">
                    {stats?.avgMessagesPerConversation ?? 0}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {locale === "ar" ? "التكلفة (ريال)" : "Cost (SAR)"}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold num">
                  {(stats?.totalCostSar ?? 0).toLocaleString(
                    locale === "ar" ? "ar-SA" : "en-US",
                    { style: "currency", currency: "SAR", maximumFractionDigits: 2 }
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${(stats?.totalCostUsd ?? 0).toFixed(4)} USD
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trial Requests from AI */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {locale === "ar" ? "طلبات تجريبية (AI)" : "AI Trial Requests"}
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold num">
                  {stats?.trialRequests.fromAI.toLocaleString() ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {locale === "ar" ? "معدل التحويل" : "Conversion"}{" "}
                  <span className="num font-medium">
                    {stats?.trialRequests.conversionRate ?? 0}%
                  </span>
                  {" ("}
                  <span className="num">
                    {stats?.trialRequests.conversions ?? 0}
                  </span>
                  {")"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversations Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">
            {locale === "ar" ? "المحادثات الأخيرة" : "Recent Conversations"}
          </h2>
          {convos && (
            <span className="text-sm text-muted-foreground">
              {locale === "ar" ? "الإجمالي" : "Total"}:{" "}
              <span className="num font-medium">{convos.total}</span>
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !convos?.conversations.length ? (
          <div className="p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              {locale === "ar" ? "لا توجد محادثات" : "No conversations yet"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {locale === "ar" ? "الوقت" : "Time"}
                </TableHead>
                <TableHead>
                  {locale === "ar" ? "المستخدم" : "User"}
                </TableHead>
                <TableHead>
                  {locale === "ar" ? "النوع" : "Type"}
                </TableHead>
                <TableHead>
                  {locale === "ar" ? "الرسائل" : "Messages"}
                </TableHead>
                <TableHead>
                  {locale === "ar" ? "التوكنات" : "Tokens"}
                </TableHead>
                <TableHead>
                  {locale === "ar" ? "التكلفة" : "Cost"}
                </TableHead>
                <TableHead>
                  {locale === "ar" ? "أول رسالة" : "First Message"}
                </TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {convos.conversations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs text-muted-foreground num whitespace-nowrap">
                    {formatTime(c.createdAt, locale)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.user?.name ?? (locale === "ar" ? "زائر" : "Visitor")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.agentType === "admin_assistant" ? "info" : "default"
                      }
                      className="text-xs"
                    >
                      {c.agentType === "admin_assistant"
                        ? locale === "ar"
                          ? "إدارة"
                          : "Admin"
                        : locale === "ar"
                          ? "عام"
                          : "Public"}
                    </Badge>
                  </TableCell>
                  <TableCell className="num text-sm">
                    {c.messageCount}
                  </TableCell>
                  <TableCell className="num text-sm">
                    {formatTokens(c.totalTokens)}
                  </TableCell>
                  <TableCell className="num text-xs">
                    {(c.totalCostUsd * 3.75).toLocaleString(
                      locale === "ar" ? "ar-SA" : "en-US",
                      { maximumFractionDigits: 4 }
                    )}{" "}
                    <span className="text-muted-foreground">SAR</span>
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate text-xs text-muted-foreground"
                    title={c.firstMessage ?? ""}
                  >
                    {truncate(c.firstMessage, 60)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewConversation(c)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {convos && convos.pages > 1 && (
          <div className="flex items-center justify-between border-t p-4">
            <span className="text-xs text-muted-foreground">
              {t("Common.page")} <span className="num">{convos.page}</span>{" "}
              {t("Common.of")} <span className="num">{convos.pages}</span>
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("Common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= convos.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("Common.next")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Conversation Detail Dialog */}
      <Dialog
        open={!!selectedConvo}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedConvo(null);
            setConvoMessages(null);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedConvo?.title ??
                (locale === "ar" ? "تفاصيل المحادثة" : "Conversation Details")}
            </DialogTitle>
            <DialogDescription>
              {selectedConvo && (
                <span className="flex flex-wrap gap-2 text-xs">
                  <Badge
                    variant={
                      selectedConvo.agentType === "admin_assistant"
                        ? "info"
                        : "default"
                    }
                  >
                    {selectedConvo.agentType}
                  </Badge>
                  <span className="num">
                    {selectedConvo.messageCount}{" "}
                    {locale === "ar" ? "رسائل" : "messages"}
                  </span>
                  <span className="num">
                    {formatTokens(selectedConvo.totalTokens)}{" "}
                    {locale === "ar" ? "توكن" : "tokens"}
                  </span>
                  <span>
                    {selectedConvo.user?.name ??
                      (locale === "ar" ? "زائر" : "Visitor")}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedConvo?.firstMessage ? (
              <div className="space-y-3">
                {/* Show the first message we have */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-ee-sm bg-brand-navy px-4 py-2 text-sm text-white">
                    {selectedConvo.firstMessage}
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {locale === "ar"
                    ? `${selectedConvo.messageCount} رسالة في هذه المحادثة`
                    : `${selectedConvo.messageCount} messages in this conversation`}
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {locale === "ar"
                  ? "لا توجد رسائل للعرض"
                  : "No messages to display"}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
