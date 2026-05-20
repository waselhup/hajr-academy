"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Radio, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
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

interface LiveRow {
  id: string;
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

export function LiveMonitorClient({ rows }: { rows: LiveRow[] }) {
  const t = useTranslations("Video");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tick, setTick] = useState(0);

  // Auto-refresh every 30s.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  // Local clock for "elapsed" display.
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleEnd = (sessionId: string) => {
    startTransition(async () => {
      const res = await forceEndSessionAction({ sessionId });
      if (res.ok) {
        toast.success(t("forceEnd"));
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
        <h1 className="text-2xl font-bold">{t("liveMonitor")}</h1>
        <Badge variant="rose" className="num">
          {rows.length}
        </Badge>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <Radio className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-muted-foreground">{t("noLiveClasses")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" data-tick={tick}>
          {rows.map((r) => {
            const elapsedMin = Math.max(
              0,
              Math.floor((Date.now() - new Date(r.startedAt).getTime()) / 60_000)
            );
            return (
              <Card key={r.id} className="ring-2 ring-brand-rose/40">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-brand-navy">{r.className}</h3>
                      <p className="text-xs text-muted-foreground num">{r.cohortCode}</p>
                    </div>
                    <Badge variant="rose">{t("live")}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">{t("elapsed")}</div>
                      <div className="font-bold text-brand-navy num">{elapsedMin}m</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t("participants")}</div>
                      <div className="font-bold text-brand-navy num">
                        {r.participantCount ?? r.joinedCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t("present")}</div>
                      <div className="font-bold text-brand-navy num">
                        {r.joinedCount}/{r.enrolledCount}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.teacherName}</p>
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isPending}>
                          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                          {t("forceEnd")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("forceEnd")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("forceEndConfirm")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("present") /* reuse generic */ && "إلغاء / Cancel"}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleEnd(r.id)}>
                            {t("forceEnd")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
