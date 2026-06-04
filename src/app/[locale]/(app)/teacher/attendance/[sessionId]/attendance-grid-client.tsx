"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveAttendanceAction } from "../../_actions/attendance";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface StudentRow {
  studentId: string;
  name: string;
  status: Status;
  autoMarked: boolean;
}

const STATUSES: Status[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

const STATUS_STYLE: Record<Status, string> = {
  PRESENT: "bg-brand-mint text-brand-navy",
  LATE: "bg-amber-100 text-amber-800",
  ABSENT: "bg-red-100 text-red-700",
  EXCUSED: "bg-hajr-hover text-brand-navy",
};

export function AttendanceGridClient({
  sessionId,
  className,
  scheduledDate,
  students: initial,
}: {
  sessionId: string;
  className: string;
  scheduledDate: string;
  students: StudentRow[];
}) {
  const t = useTranslations("Video");
  const locale = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const setStatus = (studentId: string, status: Status) => {
    setRows((r) => r.map((row) => (row.studentId === studentId ? { ...row, status } : row)));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveAttendanceAction({
        sessionId,
        entries: rows.map((r) => ({ studentId: r.studentId, status: r.status })),
      });
      if (res.ok) {
        toast.success(t("attendanceSaved"));
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const label: Record<Status, string> = {
    PRESENT: t("present"),
    LATE: t("late"),
    ABSENT: t("absent"),
    EXCUSED: t("excused"),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("takeAttendance")} — {className}</CardTitle>
          <p className="text-xs text-muted-foreground num">
            {new Date(scheduledDate).toLocaleString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.studentId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{row.name}</span>
                {row.autoMarked && (
                  <Badge variant="info" className="text-[10px]">
                    auto
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(row.studentId, s)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      row.status === s
                        ? STATUS_STYLE[s]
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {label[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">{t("noLiveClasses")}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="cta" disabled={isPending || rows.length === 0} onClick={handleSave}>
          {isPending ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="me-2 h-4 w-4" />
          )}
          {t("saveAttendance")}
        </Button>
      </div>
    </div>
  );
}
