"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Video, Search, Loader2, ExternalLink } from "lucide-react";
import { RecordingPlayer } from "@/components/video/recording-player";
import { toast } from "sonner";
import Link from "next/link";

export interface RecordingRow {
  id: string;
  scheduledDate: string;
  startedAt: string | null;
  endedAt: string | null;
  className: string;
  classNameAr: string | null;
  teacherName: string;
  durationMinutes: number;
  zoomRecordingUrl: string;
  hasSummary: boolean;
  summaryConfidence: number | null;
  matchedExcerpt?: string | null;
}

export function RecordingsClient({ rows: initial }: { rows: RecordingRow[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<RecordingRow[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  async function runSearch() {
    if (!query.trim()) {
      setFiltered(initial);
      return;
    }
    setSearching(true);
    try {
      const r = await fetch(
        `/api/admin/recordings/search?q=${encodeURIComponent(query)}`
      );
      const j = await r.json();
      setFiltered(j.rows ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "search failed");
    } finally {
      setSearching(false);
    }
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkGenerate() {
    if (selected.size === 0) {
      toast.message(t("Qa.selectAtLeastOne"));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/sessions/bulk-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: Array.from(selected) }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "failed");
      const j = await r.json();
      const ok = j.results.filter((x: any) => x.ok).length;
      toast.success(t("LessonAi.bulkSuccess", { count: ok }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function genOne(id: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/sessions/${id}/summary`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error ?? "failed");
      toast.success(t("LessonAi.regenerated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 grow min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("Qa.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <Button variant="outline" onClick={runSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Common.search")}
          </Button>
        </div>
        <Button
          onClick={bulkGenerate}
          disabled={busy || selected.size === 0}
          className="bg-brand-navy text-white"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Sparkles className="h-4 w-4 me-2" />
          )}
          {t("LessonAi.generateBulk")} ({selected.size})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <Video className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-muted-foreground">{t("Video.noRecordings")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>{t("Video.date")}</TableHead>
                  <TableHead>{t("Nav.classes")}</TableHead>
                  <TableHead>{t("Nav.teachers")}</TableHead>
                  <TableHead>{t("Video.duration")}</TableHead>
                  <TableHead>{t("LessonAi.summary")}</TableHead>
                  <TableHead className="text-end">{t("Common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const dateStr = new Date(r.scheduledDate).toLocaleDateString(
                    isAr ? "ar-SA" : "en-GB"
                  );
                  const dur =
                    r.startedAt && r.endedAt
                      ? Math.round(
                          (new Date(r.endedAt).getTime() -
                            new Date(r.startedAt).getTime()) /
                            60000
                        )
                      : r.durationMinutes;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={() => toggleRow(r.id)}
                          aria-label="select"
                        />
                      </TableCell>
                      <TableCell className="num">{dateStr}</TableCell>
                      <TableCell>
                        {r.classNameAr ?? r.className}
                        {r.matchedExcerpt && (
                          <div className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                            {r.matchedExcerpt}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{r.teacherName}</TableCell>
                      <TableCell className="num">{dur}m</TableCell>
                      <TableCell>
                        {r.hasSummary ? (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-navy">
                            <Sparkles className="h-3 w-3 text-brand-rose" />
                            {Math.round((r.summaryConfidence ?? 0) * 100)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${locale}/teacher/sessions/${r.id}/summary`}
                            className="inline-flex items-center text-xs text-brand-navy hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 me-1" />
                            {t("LessonAi.view")}
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => genOne(r.id)}
                            disabled={busy}
                          >
                            <Sparkles className="h-3 w-3 me-1" />
                            {r.hasSummary
                              ? t("LessonAi.regenerate")
                              : t("LessonAi.generateNow")}
                          </Button>
                          <RecordingPlayer
                            url={r.zoomRecordingUrl}
                            title={r.classNameAr ?? r.className}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
