"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Radio, Loader2, Eye, Moon, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { forceEndSessionAction } from "../../_actions/zoom";
import { joinClassAsParticipant } from "@/lib/zoom/launcher";

export interface LiveRow {
  id: string;
  classId: string;
  className: string;
  cohortCode: string;
  teacherName: string;
  startedAt: string;
  durationMinutes: number;
  enrolledCount: number;
  joinedCount: number;
  participantCount: number | null;
  meetingId: string | null;
}

export interface RecentRow {
  id: string;
  className: string;
  cohortCode: string;
  teacherName: string;
  endedAt: string;
  durationMinutes: number;
  enrolledCount: number;
  attendanceCount: number;
}

function fmtElapsed(iso: string, ar: boolean): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 60) {
    const n = ar ? mins.toLocaleString("ar-SA") : String(mins);
    return ar ? `${n} د` : `${n}m`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hn = ar ? h.toLocaleString("ar-SA") : String(h);
  const mn = ar ? m.toLocaleString("ar-SA") : String(m);
  return ar ? `${hn}س ${mn}د` : `${hn}h ${mn}m`;
}

export function LiveMonitorClient({
  live,
  recent,
}: {
  live: LiveRow[];
  recent: RecentRow[];
}) {
  const t = useTranslations("Classroom");
  const tV = useTranslations("Video");
  const locale = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  // Live clock for "elapsed since X" labels.
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Realtime: refetch whenever any session starts or ends.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    const channel = supabase.channel("admin-live", {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "session_started" }, () => router.refresh())
      .on("broadcast", { event: "session_ended" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Safety net: still refresh every 60s in case Realtime is down.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

  const handleMonitor = (row: LiveRow) => {
    startTransition(async () => {
      try {
        await joinClassAsParticipant(row.id);
        toast.message(t("joiningClass"));
      } catch (e: any) {
        toast.error(e?.message ?? t("classError"));
      }
    });
  };

  const handleForceEnd = (row: LiveRow) => {
    startTransition(async () => {
      const res = await forceEndSessionAction({ sessionId: row.id });
      if (res.ok) {
        toast.success(tV("forceEnd"));
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold">{t("liveClassesTitle")}</h1>
        <Badge variant="rose" className="num">
          {ar ? live.length.toLocaleString("ar-SA") : live.length}
        </Badge>
      </div>

      {live.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Moon className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("noLiveClasses")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {live.map((r) => (
            <Card key={r.id} className="ring-2 ring-brand-rose/40">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
                      </span>
                      <h3 className="font-semibold text-brand-navy">{r.className}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground num">
                      {r.cohortCode}
                    </p>
                  </div>
                  <Badge variant="rose">{t("liveBadge")}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <Stat
                    label={tV("elapsed")}
                    value={fmtElapsed(r.startedAt, ar)}
                  />
                  <Stat
                    label={tV("participants")}
                    value={
                      ar
                        ? (r.participantCount ?? r.joinedCount).toLocaleString("ar-SA")
                        : String(r.participantCount ?? r.joinedCount)
                    }
                    icon={<Users className="h-3 w-3" />}
                  />
                  <Stat
                    label={tV("present")}
                    value={`${
                      ar ? r.joinedCount.toLocaleString("ar-SA") : r.joinedCount
                    }/${ar ? r.enrolledCount.toLocaleString("ar-SA") : r.enrolledCount}`}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  👤 {r.teacherName} ·{" "}
                  <span className="num">
                    {t("startedAgo", { time: fmtElapsed(r.startedAt, ar) })}
                  </span>
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleMonitor(r)}
                  >
                    {isPending ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="me-2 h-4 w-4" />
                    )}
                    {t("monitorClass")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isPending}>
                        {tV("forceEnd")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{tV("forceEnd")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {tV("forceEndConfirm")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleForceEnd(r)}>
                          {tV("forceEnd")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Clock className="h-4 w-4" />
            {t("recentClasses")}
          </h2>
          <div className="grid gap-2">
            {recent.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.className}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.teacherName} ·{" "}
                      <span className="num">{r.cohortCode}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="default" className="num">
                      {ar ? r.attendanceCount.toLocaleString("ar-SA") : r.attendanceCount}/
                      {ar ? r.enrolledCount.toLocaleString("ar-SA") : r.enrolledCount}
                    </Badge>
                    <span className="num">
                      {new Date(r.endedAt).toLocaleString(ar ? "ar-SA" : "en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Asia/Riyadh",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 num font-bold text-brand-navy">{value}</div>
    </div>
  );
}
