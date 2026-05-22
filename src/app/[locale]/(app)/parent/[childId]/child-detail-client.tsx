"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, MessageSquare } from "lucide-react";

interface Skill {
  skill: string;
  currentLevel: string;
  confidence: number;
  totalPoints: number;
}
interface Grades {
  labResults: {
    id: string;
    title: string;
    titleAr: string | null;
    type: string;
    score: number | null;
    teacherReview: string | null;
    completedAt: string | null;
  }[];
  examResults: {
    id: string;
    title: string;
    titleAr: string | null;
    totalScore: number | null;
    passed: boolean | null;
    submittedAt: string | null;
  }[];
}
interface ScheduleItem {
  classId: string;
  className: string;
  teacherName: string;
  programName: string;
  scheduleDays: string[];
  timeSlot: string;
  durationMinutes: number;
}
interface Attendance {
  year: number;
  month: number;
  days: { date: string; status: string }[];
  total: number;
  present: number;
  rate: number | null;
}
interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  issuedAt: string;
  dueDate: string;
}

const CEFR_COLORS: Record<string, string> = {
  A1: "#E74C3C",
  A2: "#F39C12",
  B1: "#F1C40F",
  B2: "#B5E5D8",
  C1: "#27AE60",
  C2: "#2C3E50",
};

export function ChildDetailClient({
  childId,
  skills,
  grades,
  schedule,
  attendance,
  invoices,
}: {
  childId: string;
  skills: Skill[];
  grades: Grades;
  schedule: ScheduleItem[];
  attendance: Attendance;
  invoices: InvoiceRow[];
}) {
  const t = useTranslations("ParentPortal");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [tab, setTab] = useState("progress");

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";
  const date = (s: string | null) =>
    s ? new Date(s).toISOString().slice(0, 10) : "—";

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="progress">{t("tabProgress")}</TabsTrigger>
        <TabsTrigger value="attendance">{t("tabAttendance")}</TabsTrigger>
        <TabsTrigger value="schedule">{t("tabSchedule")}</TabsTrigger>
        <TabsTrigger value="grades">{t("tabGrades")}</TabsTrigger>
        <TabsTrigger value="invoices">{t("tabInvoices")}</TabsTrigger>
        <TabsTrigger value="communication">{t("tabCommunication")}</TabsTrigger>
      </TabsList>

      {/* Progress — CEFR skill cards */}
      <TabsContent value="progress" className="mt-4">
        {skills.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t("noData")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((s) => (
              <Card key={s.skill}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{s.skill}</span>
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                      style={{
                        background: CEFR_COLORS[s.currentLevel] ?? "#8A8580",
                      }}
                    >
                      {s.currentLevel}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t("points")}:{" "}
                    <span className="num font-medium">{s.totalPoints}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-hajr-rose"
                      style={{
                        width: `${Math.min(100, s.confidence)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Attendance — calendar grid */}
      <TabsContent value="attendance" className="mt-4">
        <AttendanceCalendar attendance={attendance} isAr={isAr} t={t} />
      </TabsContent>

      {/* Schedule */}
      <TabsContent value="schedule" className="mt-4">
        {schedule.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t("noData")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedule.map((s) => (
              <Card key={s.classId}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-semibold">{s.className}</div>
                    <div className="text-sm text-muted-foreground">
                      {s.programName} · {s.teacherName}
                    </div>
                  </div>
                  <div className="text-sm">
                    <Badge variant="outline">{s.timeSlot}</Badge>
                    <span className="ms-2 text-xs text-muted-foreground">
                      {s.scheduleDays.join(", ")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Grades */}
      <TabsContent value="grades" className="mt-4 space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-3 text-sm font-semibold">
              {t("labResults")}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("exercise")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.labResults.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="p-6 text-center text-muted-foreground"
                    >
                      {t("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.labResults.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{isAr ? r.titleAr ?? r.title : r.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.type}</Badge>
                      </TableCell>
                      <TableCell className="num">
                        {r.score != null ? r.score : "—"}
                      </TableCell>
                      <TableCell className="num">
                        {date(r.completedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-3 text-sm font-semibold">
              {t("examResults")}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("exam")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("result")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.examResults.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="p-6 text-center text-muted-foreground"
                    >
                      {t("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.examResults.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{isAr ? r.titleAr ?? r.title : r.title}</TableCell>
                      <TableCell className="num">
                        {r.totalScore != null ? r.totalScore : "—"}
                      </TableCell>
                      <TableCell>
                        {r.passed == null ? (
                          "—"
                        ) : (
                          <Badge variant={r.passed ? "success" : "danger"}>
                            {r.passed ? t("passed") : t("failed")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="num">
                        {date(r.submittedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Invoices */}
      <TabsContent value="invoices" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoice")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-end">—</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="p-6 text-center text-muted-foreground"
                    >
                      {t("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="num">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="num">
                        {money(inv.totalAmount)} {sar}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === "PAID"
                              ? "success"
                              : inv.status === "OVERDUE"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          {inv.status !== "PAID" &&
                            inv.status !== "CANCELLED" && (
                              <Button asChild size="sm">
                                <Link href={`/${locale}/parent/pay/${inv.id}`}>
                                  {t("payNow")}
                                </Link>
                              </Button>
                            )}
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`/api/invoices/${inv.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Communication */}
      <TabsContent value="communication" className="mt-4">
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("communicationHint")}
            </p>
            <Button asChild>
              <Link href={`/${locale}/messages`}>
                <MessageSquare className="me-2 h-4 w-4" />
                {t("messageTeacher")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

/** Monthly attendance calendar grid. */
function AttendanceCalendar({
  attendance,
  isAr,
  t,
}: {
  attendance: Attendance;
  isAr: boolean;
  t: (k: string) => string;
}) {
  const { year, month, days, total, present, rate } = attendance;
  const statusByDate = new Map(days.map((d) => [d.date, d.status]));

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weekdayNames = isAr
    ? ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function cellColor(day: number): string {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const status = statusByDate.get(iso);
    if (!status) return "bg-muted/40 text-muted-foreground";
    if (status === "PRESENT" || status === "LATE")
      return "bg-hajr-success text-white";
    if (status === "ABSENT") return "bg-hajr-error text-white";
    return "bg-hajr-warning text-white"; // EXCUSED
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold num">
            {year}-{String(month).padStart(2, "0")}
          </span>
          <span className="text-sm">
            {rate != null ? (
              <>
                <span className="num font-bold">{present}</span>/
                <span className="num">{total}</span>{" "}
                <span className="text-muted-foreground">
                  ({rate}% {t("attended")})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{t("noData")}</span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayNames.map((w) => (
            <div key={w} className="text-xs font-medium text-muted-foreground">
              {w}
            </div>
          ))}
          {cells.map((day, i) => (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-md text-xs num ${
                day ? cellColor(day) : ""
              }`}
            >
              {day ?? ""}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-hajr-success" /> {t("present")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-hajr-error" /> {t("absent")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-hajr-warning" /> {t("excused")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
