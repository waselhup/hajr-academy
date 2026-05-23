"use client";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";
import { Users, ClipboardCheck, ArrowRight } from "lucide-react";

const DAY_AR: Record<string, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الإثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

export type TeacherClassItem = {
  kind: "GROUP" | "PRIVATE";
  id: string;
  title: string;
  cohortCode: string;
  programName: string;
  scheduleDays: string[];
  timeSlot: string;
  durationMinutes: number;
  maxStudents: number;
  studentCount: number;
  studentName?: string;
  status: string;
  nextSession: {
    id: string;
    scheduledDate: string;
    status: string;
    hasMeeting: boolean;
  } | null;
};

export function TeacherClassesClient({
  locale,
  items,
}: {
  locale: string;
  items: TeacherClassItem[];
}) {
  const t = useTranslations();
  const [filter, setFilter] = useState<"ALL" | "GROUP" | "PRIVATE">("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((i) => i.kind === filter);
  }, [filter, items]);

  return (
    <>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="ALL">{t("Classes.filterAll")}</TabsTrigger>
          <TabsTrigger value="GROUP">{t("Classes.filterGroup")}</TabsTrigger>
          <TabsTrigger value="PRIVATE">{t("Classes.filterPrivate")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("Classes.noClasses")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{c.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground num">{c.cohortCode}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={c.kind === "PRIVATE" ? "info" : "default"} className="text-[10px]">
                      {c.kind === "PRIVATE" ? t("Classes.typePrivate") : t("Classes.typeGroup")}
                    </Badge>
                    <Badge variant={c.status === "ACTIVE" || c.status === "LIVE" ? "success" : "default"}>
                      {c.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{c.programName}</span>
                  <span>•</span>
                  <span className="num">
                    {c.studentCount} / {c.maxStudents}
                  </span>
                  {c.kind === "GROUP" && c.scheduleDays.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {c.scheduleDays.map((d) => (locale === "ar" ? DAY_AR[d] : d.slice(0, 3))).join("، ")}{" "}
                        <span className="num">{c.timeSlot}</span>
                      </span>
                    </>
                  )}
                  {c.kind === "PRIVATE" && c.studentName && (
                    <>
                      <span>•</span>
                      <span>{c.studentName}</span>
                    </>
                  )}
                </div>

                {c.nextSession ? (
                  <UpcomingSessionCard
                    mode="start"
                    locale={locale}
                    session={{
                      id: c.nextSession.id,
                      kind: c.kind === "PRIVATE" ? "privateLesson" : "classSession",
                      title: c.title,
                      scheduledDate: c.nextSession.scheduledDate,
                      durationMinutes: c.durationMinutes,
                      status: c.nextSession.status as any,
                      hasMeeting: c.nextSession.hasMeeting,
                    }}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {locale === "ar" ? "لا توجد جلسات قادمة." : "No upcoming sessions."}
                  </p>
                )}

                {c.kind === "GROUP" && (
                  <div className="flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/${locale}/teacher/classes/${c.id}`}>
                        <Users className="me-2 h-4 w-4" />
                        {locale === "ar" ? "عرض الفصل" : "View Class"}
                        <ArrowRight className="ms-auto h-3.5 w-3.5 rtl-flip" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
