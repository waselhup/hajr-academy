"use client";

/**
 * Live admin Activity feed — segmented, newest-first, auto-refreshing.
 *
 * Surfaces the existing AuditLog (via /api/admin/activity) as a calm, filterable
 * stream instead of one giant table. Category tabs + role filter + search narrow
 * it server-side; a 15s poll keeps it live (pausable). Each row shows who / what
 * / when with both Gregorian (Riyadh) and Hijri timestamps per house style.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Pause,
  Play,
  RefreshCw,
  Users,
  GraduationCap,
  Wallet,
  BookOpen,
  LifeBuoy,
  MessageSquare,
  Activity as ActivityIcon,
  LayoutGrid,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { fmtRiyadh, fmtHijri } from "@/lib/format";
import {
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
} from "@/lib/activity-categories";

type Item = {
  id: string;
  createdAt: string;
  action: string;
  category: ActivityCategory;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  user: { name: string; nameAr: string | null; email: string; role: string } | null;
};

const POLL_MS = 15_000;

const CAT_ICON: Record<ActivityCategory, React.ComponentType<{ className?: string }>> = {
  accounts: Users,
  classes: GraduationCap,
  assignments: BookOpen,
  finance: Wallet,
  content: LayoutGrid,
  tickets: LifeBuoy,
  comms: MessageSquare,
  other: ActivityIcon,
};

function categoryTone(cat: ActivityCategory): string {
  switch (cat) {
    case "finance":
      return "bg-emerald-50 text-emerald-700";
    case "classes":
      return "bg-blue-50 text-blue-700";
    case "assignments":
      return "bg-violet-50 text-violet-700";
    case "content":
      return "bg-amber-50 text-amber-700";
    case "tickets":
      return "bg-rose-50 text-rose-700";
    case "comms":
      return "bg-cyan-50 text-cyan-700";
    case "accounts":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-hajr-gray-100 text-hajr-gray-600";
  }
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ActivityClient({ initialItems }: { initialItems: Item[] }) {
  const t = useTranslations("AdminActivity");
  const locale = useLocale();
  const ar = locale === "ar";

  const [items, setItems] = useState<Item[]>(initialItems);
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [role, setRole] = useState<string>("all");
  const [q, setQ] = useState("");
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<number>(() => 0);
  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce the search box so typing doesn't hammer the API.
  useEffect(() => {
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => {
      if (qTimer.current) clearTimeout(qTimer.current);
    };
  }, [q]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (role !== "all") params.set("role", role);
      if (debouncedQ) params.set("q", debouncedQ);
      const r = await fetch(`/api/admin/activity?${params.toString()}`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (j.ok) {
        setItems(j.items ?? []);
        setLastSync(Date.now());
      }
    } catch {
      /* keep prior items on transient failure */
    } finally {
      setLoading(false);
    }
  }, [category, role, debouncedQ]);

  // Refetch whenever a filter changes.
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Live polling (pausable).
  useEffect(() => {
    if (!live) return;
    const id = setInterval(fetchItems, POLL_MS);
    return () => clearInterval(id);
  }, [live, fetchItems]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.category] = (c[it.category] ?? 0) + 1;
    return c;
  }, [items]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSync) return null;
    return new Date(lastSync).toLocaleTimeString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Riyadh",
    });
  }, [lastSync, ar]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-navy">
            <ActivityIcon className="h-6 w-6 text-brand-rose" />
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {live && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              {t("liveOn")}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLive((v) => !v)}
            aria-pressed={live}
          >
            {live ? (
              <>
                <Pause className="me-1.5 h-3.5 w-3.5" />
                {t("pause")}
              </>
            ) : (
              <>
                <Play className="me-1.5 h-3.5 w-3.5" />
                {t("resume")}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchItems}
            disabled={loading}
            aria-label={t("refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="space-y-3">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            <CatChip
              label={t("catAll")}
              icon={ActivityIcon}
              active={category === "all"}
              count={counts.all}
              onClick={() => setCategory("all")}
            />
            {ACTIVITY_CATEGORIES.map((cat) => (
              <CatChip
                key={cat}
                label={t(`cat_${cat}`)}
                icon={CAT_ICON[cat]}
                active={category === cat}
                count={counts[cat] ?? 0}
                onClick={() => setCategory(cat)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                placeholder={t("searchPlaceholder")}
                className="ps-9"
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("filterRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allRoles")}</SelectItem>
                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="TEACHER">TEACHER</SelectItem>
                <SelectItem value="STUDENT">STUDENT</SelectItem>
                <SelectItem value="PARENT">PARENT</SelectItem>
                <SelectItem value="MARKETER">MARKETER</SelectItem>
              </SelectContent>
            </Select>
            {lastSyncLabel && (
              <span className="num ms-auto text-xs text-muted-foreground">
                {t("lastSync")} {lastSyncLabel}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Feed */}
      <Card>
        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <FeedSkeleton />
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => (
                <ActivityRow key={it.id} item={it} ar={ar} t={t} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CatChip({
  label,
  icon: Icon,
  active,
  count,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-hajr-gray-200 text-hajr-gray-600 hover:border-hajr-gray-300 hover:bg-hajr-gray-50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      {count > 0 && (
        <span
          className={`num rounded-full px-1.5 text-[10px] ${
            active ? "bg-white/20" : "bg-hajr-gray-100"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ActivityRow({
  item,
  ar,
  t,
}: {
  item: Item;
  ar: boolean;
  t: (k: string, vals?: Record<string, string | number>) => string;
}) {
  const Icon = CAT_ICON[item.category];
  const who = item.user ? (ar ? item.user.nameAr || item.user.name : item.user.name) : null;
  return (
    <li className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/40 sm:px-4">
      <span
        className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${categoryTone(
          item.category
        )}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {who ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-brand-navy">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px]">{initials(who)}</AvatarFallback>
              </Avatar>
              {who}
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {t("systemActor")}
            </span>
          )}
          {item.user && (
            <Badge variant="outline" className="text-[10px]">
              {item.user.role}
            </Badge>
          )}
          <Badge variant="default" className="font-mono text-[10px]">
            {item.action}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.entity ? (
            <span>
              {item.entity}
              {item.entityId ? ` · ${item.entityId.slice(0, 8)}…` : ""}
            </span>
          ) : null}
          {item.ipAddress ? <span className="num"> · {item.ipAddress}</span> : null}
        </p>
      </div>
      <div className="shrink-0 text-end">
        <div className="num text-xs text-muted-foreground">
          {fmtRiyadh(item.createdAt, "HH:mm:ss")}
        </div>
        <div className="num text-[10px] text-muted-foreground">
          {fmtRiyadh(item.createdAt, "yyyy-MM-dd")}
        </div>
        <div className="text-[10px] text-muted-foreground" dir="rtl">
          {fmtHijri(item.createdAt)}
        </div>
      </div>
    </li>
  );
}

function FeedSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 p-3 sm:px-4">
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-hajr-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-hajr-gray-100" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-hajr-gray-100" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-hajr-gray-100" />
        </li>
      ))}
    </ul>
  );
}
