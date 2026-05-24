"use client";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname, useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardCheck, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClassesClient } from "./classes-client";

export type AttendanceSummaryRow = {
  sessionId: string;
  classId: string;
  className: string;
  cohortCode: string;
  scheduledDate: string;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  marked: number;
  status: string;
};

export function ClassesTabs({
  initialTab,
  classRows,
  total,
  page,
  pageSize,
  programs,
  teachers,
  attendanceSummary,
}: {
  initialTab: "classes" | "attendance";
  classRows: any[];
  total: number;
  page: number;
  pageSize: number;
  programs: any[];
  teachers: any[];
  attendanceSummary: AttendanceSummaryRow[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();
  const ar = locale === "ar";
  const [tab, setTab] = useState<"classes" | "attendance">(initialTab);

  const onTabChange = (v: string) => {
    setTab(v as any);
    const p = new URLSearchParams(sp.toString());
    if (v === "classes") p.delete("tab");
    else p.set("tab", v);
    router.replace(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="classes">{t("Nav.classes")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("Nav.attendance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-4">
          <ClassesClient
            rows={classRows}
            total={total}
            page={page}
            pageSize={pageSize}
            programs={programs}
            teachers={teachers}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab rows={attendanceSummary} locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AttendanceTab({
  rows,
  locale,
}: {
  rows: AttendanceSummaryRow[];
  locale: string;
}) {
  const ar = locale === "ar";
  const fmtN = (n: number) => (ar ? n.toLocaleString("ar-SA") : String(n));

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد جلسات حديثة." : "No recent sessions."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        {ar ? "آخر ٣٠ يوماً من الجلسات." : "Last 30 days of sessions."}
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const pct =
            r.marked > 0 ? Math.round(((r.present + r.late * 0.5) / r.marked) * 100) : 0;
          return (
            <Card key={r.sessionId}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 shrink-0 text-brand-navy" />
                    <p className="truncate font-medium">{r.className}</p>
                    <span className="num text-xs text-muted-foreground">{r.cohortCode}</span>
                    {r.status === "LIVE" && (
                      <Badge variant="rose" className="text-[10px]">
                        ● {ar ? "مباشر" : "LIVE"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground num">
                    {new Date(r.scheduledDate).toLocaleString(ar ? "ar-SA" : "en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Riyadh",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">
                    {fmtN(r.present)} {ar ? "حاضر" : "present"}
                  </Badge>
                  {r.late > 0 && (
                    <Badge variant="warning">
                      {fmtN(r.late)} {ar ? "متأخر" : "late"}
                    </Badge>
                  )}
                  {r.absent > 0 && (
                    <Badge variant="danger">
                      {fmtN(r.absent)} {ar ? "غائب" : "absent"}
                    </Badge>
                  )}
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold num",
                      pct >= 90
                        ? "bg-emerald-50 text-emerald-700"
                        : pct >= 75
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    )}
                  >
                    {fmtN(pct)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
