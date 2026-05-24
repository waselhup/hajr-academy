"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabase";
import { fmtRelative } from "@/lib/format";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  actionUrl: string | null;
  isRead: boolean;
  priority: string;
  createdAt: string;
}

/**
 * Topbar notification bell.
 *
 * - Polls the unread count and dropdown list on open.
 * - Subscribes to Supabase Realtime INSERTs on the Notification table
 *   (filtered to this user) and bumps the badge live.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const t = useTranslations("Notifications");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const { count } = await res.json();
        setUnread(count);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?page=1");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications.slice(0, 10));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Initial count + Realtime subscription.
  useEffect(() => {
    loadCount();
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${userId}`,
        },
        () => {
          setUnread((u) => u + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadCount]);

  // Load the list whenever the dropdown opens.
  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function openNotification(n: NotificationItem) {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.actionUrl) {
      router.push(`/${locale}${n.actionUrl}`);
    } else {
      router.push(`/${locale}/notifications`);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-md p-2 text-hajr-navy transition-colors hover:bg-hajr-hover"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hajr-rose px-1 text-[10px] font-bold text-white num">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("title")}</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-brand-rose hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={`flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-start hover:bg-gray-50 ${
                  n.isRead ? "" : "bg-hajr-hover/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  {!n.isRead && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hajr-deep-navy" />
                  )}
                  <span className="text-sm font-medium">
                    {isAr ? n.titleAr : n.title}
                  </span>
                </div>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {isAr ? n.bodyAr : n.body}
                </span>
                <span className="text-[11px] text-gray-400">
                  {fmtRelative(n.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              setOpen(false);
              router.push(`/${locale}/notifications`);
            }}
          >
            {t("viewAll")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
