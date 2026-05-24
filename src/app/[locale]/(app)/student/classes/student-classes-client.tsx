"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, Play, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_AR: Record<string, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الإثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

export type StudentClassItem = {
  kind: "GROUP" | "PRIVATE";
  id: string;
  title: string;
  cohortCode: string;
  programName: string;
  teacherName: string;
  scheduleDays: string[];
  timeSlot: string;
  durationMinutes: number;
  studentCount: number;
  status: string;
  nextSession: {
    id: string;
    scheduledDate: string;
    status: string;
    hasMeeting: boolean;
  } | null;
};

export function StudentClassesClient({
  locale,
  items,
}: {
  locale: string;
  items: StudentClassItem[];
}) {
  const t = useTranslations("Classes");
  const [filter, setFilter] = useState<"ALL" | "GROUP" | "PRIVATE">("ALL");
  const ar = locale === "ar";

  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((i) => i.kind === filter);
  }, [filter, items]);

  return (
    <>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="ALL">{t("tabAll")}</TabsTrigger>
          <TabsTrigger value="GROUP">{t("tabGroup")}</TabsTrigger>
          <TabsTrigger value="PRIVATE">{t("tabPrivate")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-8 text-center">
            <p className="text-lg font-semibold">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => {
            const isLive = c.nextSession?.status === "LIVE";
            const date = c.nextSession ? new Date(c.nextSession.scheduledDate) : null;
            return (
              <Card
                key={c.id}
                className={cn(
                  "overflow-hidden transition-shadow hover:shadow-md",
                  isLive && "ring-2 ring-brand-rose"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground num">
                        {c.cohortCode}
                      </p>
                      <CardTitle className="mt-1 truncate text-base">{c.title}</CardTitle>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={c.kind === "PRIVATE" ? "info" : "default"} className="text-[10px]">
                        {c.kind === "PRIVATE" ? t("typePrivate") : t("typeGroup")}
                      </Badge>
                      {isLive && (
                        <Badge variant="rose" className="text-[10px]">
                          ● {ar ? "مباشر" : "LIVE"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("cardTeacher")}:</span>
                    <span className="truncate font-medium">{c.teacherName}</span>
                  </div>

                  {c.scheduleDays.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {c.scheduleDays.map((d) => (ar ? DAY_AR[d] : d.slice(0, 3))).join("، ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="num">{c.timeSlot}</span>
                  </div>

                  {c.kind === "GROUP" && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="num">{c.studentCount}</span>
                      <span className="text-muted-foreground">{t("cardStudents")}</span>
                    </div>
                  )}

                  {date && (
                    <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground num">
                      {date.toLocaleString(ar ? "ar-SA" : "en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Riyadh",
                      })}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    {c.nextSession && (
                      <Button
                        asChild
                        size="sm"
                        variant={isLive ? "cta" : "default"}
                        className="flex-1"
                      >
                        <Link href={`/${locale}/classroom/${c.nextSession.id}`}>
                          <Play className="me-2 h-3.5 w-3.5" />
                          {t("cardEnterClass")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
