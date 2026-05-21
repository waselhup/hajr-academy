"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCheck, Bell } from "lucide-react";
import { fmtRelative } from "@/lib/format";

interface Item {
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

const FILTERS = ["all", "unread"] as const;

/** Bucket a notification's date into a human group. */
function dateGroup(iso: string, isAr: boolean): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((+now - +d) / 86400_000);
  if (days <= 0) return isAr ? "اليوم" : "Today";
  if (days === 1) return isAr ? "أمس" : "Yesterday";
  if (days <= 7) return isAr ? "هذا الأسبوع" : "Earlier this week";
  return isAr ? "أقدم" : "Earlier";
}

export function NotificationsClient() {
  const t = useTranslations("Notifications");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?filter=${filter}&page=1`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function open(n: Item) {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
    }
    if (n.actionUrl) router.push(`/${locale}${n.actionUrl}`);
  }

  // Group items by date bucket.
  const groups: Record<string, Item[]> = {};
  for (const n of items) {
    const g = dateGroup(n.createdAt, isAr);
    (groups[g] ??= []).push(n);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs ${
                filter === f
                  ? "bg-brand-navy text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {f === "all" ? t("filterAll") : t("filterUnread")}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="me-2 h-4 w-4" />
          {t("markAllRead")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-rose" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <Bell className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groups).map(([group, list]) => (
          <div key={group}>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {group}
            </div>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {list.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => open(n)}
                        className={`flex w-full flex-col gap-1 p-4 text-start hover:bg-gray-50 ${
                          n.isRead ? "" : "bg-brand-lavender/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {!n.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-rose" />
                            )}
                            {isAr ? n.titleAr : n.title}
                          </span>
                          {n.priority === "URGENT" && (
                            <Badge variant="danger">{t("urgent")}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {isAr ? n.bodyAr : n.body}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {fmtRelative(n.createdAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
