"use client";

/**
 * User-facing targeted recordings (C7) — a personal library of videos an admin
 * shared specifically with this user. The list comes from
 * GET /api/recordings/targeted (server-gated: only rows where the user is a
 * viewer), each carrying a fresh short-lived signed playback URL. Opening a
 * recording marks it viewed (POST). Mobile-first, RTL-safe, with
 * loading/empty/error states.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Film, Play } from "lucide-react";

interface MyRecording {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSec: number | null;
  createdAt: string;
  viewedAt: string | null;
  url: string | null;
}

export function MyRecordingsClient() {
  const t = useTranslations("TargetedRecordings");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [rows, setRows] = useState<MyRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<MyRecording | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/recordings/targeted");
      if (res.ok) {
        const data = await res.json();
        setRows(data.recordings ?? []);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = useCallback(
    (r: MyRecording) => {
      setActive(r);
      if (!r.viewedAt) {
        // Mark viewed (best-effort) and reflect it locally.
        fetch("/api/recordings/targeted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.id }),
        }).catch(() => {});
        setRows((prev) =>
          prev.map((x) => (x.id === r.id ? { ...x, viewedAt: new Date().toISOString() } : x))
        );
      }
    },
    []
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-navy" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          <Button variant="outline" size="sm" onClick={load}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
          <Film className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-muted-foreground">{t("emptyMine")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const displayTitle = isAr && r.titleAr ? r.titleAr : r.title;
          const displayDesc = isAr && r.descriptionAr ? r.descriptionAr : r.description;
          const dateStr = new Date(r.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-GB");
          return (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Film className="h-4 w-4 shrink-0 text-brand-rose" />
                    <span className="truncate font-medium">{displayTitle}</span>
                  </span>
                  {!r.viewedAt && (
                    <Badge variant="info" className="shrink-0 px-1.5 py-0 text-[10px]">
                      {t("newBadge")}
                    </Badge>
                  )}
                </div>
                {displayDesc && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{displayDesc}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="num text-xs text-muted-foreground">{dateStr}</span>
                  <Button size="sm" onClick={() => open(r)} disabled={!r.url} className="bg-brand-navy text-white">
                    <Play className="me-1.5 h-3.5 w-3.5 rtl-flip" />
                    {t("watch")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{active ? (isAr && active.titleAr ? active.titleAr : active.title) : ""}</DialogTitle>
          </DialogHeader>
          {active?.url ? (
            <video
              controls
              autoPlay
              src={active.url}
              className="aspect-video w-full rounded-lg bg-black"
              playsInline
            />
          ) : (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              {t("playbackUnavailable")}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
