"use client";

/**
 * Owner batch 5 — #9: "Available teachers" discovery section on the student
 * Classes screen. Surfaces active teachers (name + photo + specializations +
 * GMT+3 availability ONLY — never salary/rate/contact) and lets the student
 * request a specific teacher for a one-to-one (PRIVATE) course. The request is
 * POSTed to /api/student/teacher-requests, which notifies admins.
 *
 * Shown always, but especially valuable in the empty state (no classes yet).
 * All numbers/days/times render in Western digits in both languages.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarClock, Loader2, UserPlus } from "lucide-react";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const DAY_KEYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type AvailableTeacher = {
  id: string;
  name: string;
  avatar: string | null;
  specializations: string[];
  availabilityDays: string[];
  availabilityHours: string | null;
};

export type PrivateProgram = {
  id: string;
  name: string;
};

export function AvailableTeachers({
  locale,
  teachers,
  privatePrograms,
}: {
  locale: string;
  teachers: AvailableTeacher[];
  privatePrograms: PrivateProgram[];
}) {
  const t = useTranslations("Discovery");
  const tDays = useTranslations("Days");
  const ar = locale === "ar";

  const [active, setActive] = useState<AvailableTeacher | null>(null);
  const [programId, setProgramId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (teachers.length === 0) return null;

  // Keep availability days in canonical week order regardless of stored order.
  const orderDays = (days: string[]) =>
    DAY_KEYS.filter((d) => days.includes(d)).map((d) => tDays(d));

  const openDialog = (teacher: AvailableTeacher) => {
    setActive(teacher);
    setProgramId("");
    setMessage("");
  };

  const onSubmit = async () => {
    if (!active) return;
    setPending(true);
    try {
      const res = await fetch("/api/student/teacher-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: active.id,
          programId: programId || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(t("requestSuccess"));
        setActive(null);
      } else {
        toast.error(t("requestError"));
      }
    } catch {
      toast.error(t("requestError"));
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="space-y-4 pt-2">
      <div>
        <h2 className="text-lg font-semibold">{t("sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("sectionSubtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => {
          const days = orderDays(teacher.availabilityDays);
          return (
            <Card key={teacher.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 ring-2 ring-brand-rose/15">
                    {teacher.avatar ? (
                      <AvatarImage src={teacher.avatar} alt={teacher.name} />
                    ) : null}
                    <AvatarFallback className="bg-brand-navy text-xs text-white">
                      {initials(teacher.name)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="min-w-0 flex-1 truncate text-base">
                    {teacher.name}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {teacher.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.specializations.slice(0, 4).map((spec) => (
                      <Badge key={spec} variant="outline" className="text-[10px]">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    {t("availabilityLabel")}
                  </p>
                  {days.length > 0 || teacher.availabilityHours ? (
                    <div className="space-y-1 text-sm">
                      {days.length > 0 && (
                        <p className="truncate">{days.join(ar ? "، " : ", ")}</p>
                      )}
                      {teacher.availabilityHours && (
                        <p className="num text-muted-foreground" dir="ltr">
                          {teacher.availabilityHours}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("availabilityNone")}</p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="default"
                  className="w-full"
                  onClick={() => openDialog(teacher)}
                >
                  <UserPlus className="me-2 h-3.5 w-3.5" />
                  {t("requestButton")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-md" dir={ar ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {active && (
              <p className="text-sm text-muted-foreground">
                {t("dialogFor", { name: active.name })}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tr-program">{t("programLabel")}</Label>
              {privatePrograms.length > 0 ? (
                <Select value={programId} onValueChange={setProgramId} disabled={pending}>
                  <SelectTrigger id="tr-program">
                    <SelectValue placeholder={t("programPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {privatePrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">{t("programNone")}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tr-message">{t("messageLabel")}</Label>
              <Textarea
                id="tr-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                disabled={pending}
                maxLength={2000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActive(null)}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button variant="cta" size="sm" onClick={onSubmit} disabled={pending}>
              {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("requestSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
