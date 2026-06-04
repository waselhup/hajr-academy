"use client";

/**
 * RescheduleSessionButton — lets a teacher (their own class) or an admin
 * (any class) change a class session's scheduled date/time. Enrolled
 * students are notified of the change by the API route.
 */

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/western-fields";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

/** Format an ISO instant for a <input type="datetime-local"> (local time). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function RescheduleSessionButton({
  sessionId,
  scheduledDate,
  variant = "outline",
  size = "sm",
}: {
  sessionId: string;
  scheduledDate: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "icon";
}) {
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toLocalInput(scheduledDate));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!value) {
      toast.error(isAr ? "اختر التاريخ والوقت" : "Pick a date and time");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/class-sessions/${sessionId}/reschedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // datetime-local has no zone — interpret as local, send as ISO.
          body: JSON.stringify({
            scheduledDate: new Date(value).toISOString(),
          }),
        }
      );
      const json = await res.json();
      if (json.ok) {
        toast.success(isAr ? "تم تغيير الموعد" : "Session rescheduled");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        title={isAr ? "تغيير الموعد" : "Reschedule"}
      >
        <CalendarClock className={size === "icon" ? "h-4 w-4" : "me-1.5 h-3.5 w-3.5"} />
        {size !== "icon" && (isAr ? "تغيير الموعد" : "Reschedule")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isAr ? "تغيير موعد الحصة" : "Reschedule Session"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>{isAr ? "التاريخ والوقت" : "Date & time"}</Label>
            <DateTimeField
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
