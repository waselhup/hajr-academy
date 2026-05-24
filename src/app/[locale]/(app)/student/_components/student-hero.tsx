"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Pencil,
  Play,
  Bell,
  MessageSquare,
  BookCheck,
  FlaskConical,
  FileText,
  BarChart3,
  ArrowRight,
  Sparkles,
  Inbox,
  Receipt,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ActivityType =
  | "ASSIGNMENT_NEW"
  | "ASSIGNMENT_GRADED"
  | "EXAM_RESULT"
  | "INVOICE_DUE"
  | "CLASS_REMINDER";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  time: string;
  href: string;
  data: Record<string, string | number>;
}

export interface DashboardData {
  name: string;
  nameAr: string | null;
  avatar: string | null;
  gradeLevel: string | null;
  activePackage: string | null;
  attendancePct: number;
  openAssignments: number;
  avgGrade: number;
  nextClass: {
    id: string;
    classId: string;
    className: string;
    cohortCode: string;
    teacherName: string;
    scheduledStartAt: string;
    durationMinutes: number;
    isLive: boolean;
    hasMeeting: boolean;
    status: string;
  } | null;
  teachers: {
    userId: string;
    name: string;
    avatar: string | null;
    classes: string[];
  }[];
  activity: ActivityItem[];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Relative time string ("2h ago" / "in 30m"). */
function relTime(iso: string, locale: string, ar: boolean): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMs = t - now;
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  const hrs = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  const fmt = (n: number, unitAr: string, unitEn: string) => {
    const num = ar ? n.toLocaleString("ar-SA") : String(n);
    if (ar) return past ? `قبل ${num} ${unitAr}` : `بعد ${num} ${unitAr}`;
    return past ? `${num}${unitEn} ago` : `in ${num}${unitEn}`;
  };
  if (mins < 1) return ar ? "الآن" : "now";
  if (mins < 60) return fmt(mins, "د", "m");
  if (hrs < 24) return fmt(hrs, "س", "h");
  return fmt(days, "ي", "d");
}

function startsInText(iso: string, ar: boolean): string {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.max(0, Math.round(diff / 60_000));
  if (mins < 60) {
    const n = ar ? mins.toLocaleString("ar-SA") : String(mins);
    return ar ? `${n} دقيقة` : `${n} min`;
  }
  const hrs = Math.round(mins / 60);
  const n = ar ? hrs.toLocaleString("ar-SA") : String(hrs);
  return ar ? `${n} ساعة` : `${n}h`;
}

export function StudentHero({
  locale,
  data,
}: {
  locale: string;
  data: DashboardData;
}) {
  const t = useTranslations("StudentDashboard");
  const tAct = useTranslations("StudentDashboard");
  const router = useRouter();
  const ar = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [busyTeacher, setBusyTeacher] = useState<string | null>(null);

  const displayName = ar && data.nameAr ? data.nameAr : data.name;

  const openChat = (teacherUserId: string) => {
    setBusyTeacher(teacherUserId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/messages/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toUserId: teacherUserId }),
        });
        const d = await res.json();
        if (!res.ok) {
          toast.error(d.error ?? "Failed to start chat");
          return;
        }
        router.push(`/${locale}/messages?thread=${d.threadId}`);
      } finally {
        setBusyTeacher(null);
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Greeting Card ────────────────────────────────────── */}
      <Card className="overflow-hidden border-0 bg-brand-navy text-white shadow-lg">
        <CardContent className="relative p-5 sm:p-7">
          <Link
            href={`/${locale}/student/profile`}
            className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label={t("editProfile")}
          >
            <Pencil className="h-4 w-4" />
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-16 w-16 ring-4 ring-white/20">
              {data.avatar ? <AvatarImage src={data.avatar} alt={displayName} /> : null}
              <AvatarFallback className="bg-white/15 text-lg text-white">
                {initials(data.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                {t("greeting", { name: displayName })}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.gradeLevel && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium">
                    {t("gradeBadge", { grade: data.gradeLevel })}
                  </span>
                )}
                {data.activePackage && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium">
                    {t("packageBadge", { package: data.activePackage })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <HeroStat label={t("statAttendance")} value={`${formatNum(data.attendancePct, ar)}%`} />
            <HeroStat label={t("statAssignments")} value={formatNum(data.openAssignments, ar)} />
            <HeroStat label={t("statGrade")} value={`${formatNum(data.avgGrade, ar)}%`} />
          </div>
        </CardContent>
      </Card>

      {/* ── Next Class ────────────────────────────────────────── */}
      <NextClassCard locale={locale} data={data.nextClass} />

      {/* ── Teachers + Activity (side-by-side on lg) ──────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Teachers widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-brand-rose" />
              {t("teachersTitle")}
            </CardTitle>
            {data.teachers.length > 4 && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/${locale}/messages`}>
                  {t("teachersViewAll")}
                  <ArrowRight className="ms-1 h-3.5 w-3.5 rtl-flip" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.teachers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("teachersEmpty")}
              </p>
            ) : (
              <ul className="space-y-3">
                {data.teachers.slice(0, 4).map((tch) => (
                  <li
                    key={tch.userId}
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5"
                  >
                    <Avatar className="h-10 w-10">
                      {tch.avatar ? <AvatarImage src={tch.avatar} alt={tch.name} /> : null}
                      <AvatarFallback className="bg-brand-navy text-xs text-white">
                        {initials(tch.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tch.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {tch.classes.slice(0, 2).join(" · ") || "—"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 shrink-0"
                      disabled={busyTeacher === tch.userId || isPending}
                      onClick={() => openChat(tch.userId)}
                    >
                      <MessageSquare className="me-1 h-3.5 w-3.5" />
                      {t("teachersMessage")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Activity widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-brand-rose" />
              {t("activityTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.activity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("activityEmpty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.activity.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 rounded-md border bg-muted/30 p-2.5 transition-colors hover:bg-muted"
                    >
                      <ActivityIcon type={item.type} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm">
                          {tAct(`activity_${item.type}` as any, item.data as any)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground num">
                          {relTime(item.time, locale, ar)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("quickTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickTile
            href={`/${locale}/student/assignments`}
            label={t("quickAssignments")}
            icon={<BookCheck className="h-6 w-6" />}
          />
          <QuickTile
            href={`/${locale}/student/assignments?tab=lab`}
            label={t("quickLab")}
            icon={<FlaskConical className="h-6 w-6" />}
          />
          <QuickTile
            href={`/${locale}/student/assignments?tab=exams`}
            label={t("quickExams")}
            icon={<FileText className="h-6 w-6" />}
          />
          <QuickTile
            href={`/${locale}/student/progress`}
            label={t("quickProgress")}
            icon={<BarChart3 className="h-6 w-6" />}
          />
        </div>
      </div>
    </div>
  );
}

function formatNum(n: number, ar: boolean): string {
  return ar ? n.toLocaleString("ar-SA") : String(n);
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-1 text-xl font-bold num sm:text-2xl">{value}</p>
    </div>
  );
}

function NextClassCard({
  locale,
  data,
}: {
  locale: string;
  data: DashboardData["nextClass"];
}) {
  const t = useTranslations("StudentDashboard");
  const ar = locale === "ar";

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-3 p-6 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">{t("nextClassNone")}</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/student/classes`}>{t("nextClassExplore")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const date = new Date(data.scheduledStartAt);
  const dateStr = date.toLocaleString(ar ? "ar-SA" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  });
  const showLive = data.isLive;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        showLive ? "ring-2 ring-brand-rose shadow-md" : ""
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-rose">
              {t("nextClassTitle")}
            </p>
            <h3 className="mt-1 text-lg font-bold text-brand-navy">
              📚 {data.className}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground num">{data.cohortCode}</p>
          </div>
          {showLive && (
            <Badge variant="rose" className="shrink-0">
              ● {ar ? "مباشر" : "LIVE"}
            </Badge>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            {dateStr}
          </p>
          <p className="text-muted-foreground">
            👤 {data.teacherName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {showLive ? (
            <Button asChild variant="cta" size="lg" className="flex-1 sm:flex-initial">
              <Link href={`/${locale}/classroom/${data.id}`}>
                <Play className="me-2 h-4 w-4" />
                {t("nextClassEnter")}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="flex-1 sm:flex-initial">
                <Link href={`/${locale}/classroom/${data.id}`}>
                  <Play className="me-2 h-4 w-4" />
                  {t("nextClassStartsIn", { time: startsInText(data.scheduledStartAt, ar) })}
                </Link>
              </Button>
              <Button variant="outline" size="lg" disabled>
                <Bell className="me-2 h-4 w-4" />
                {t("nextClassRemind")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickTile({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-white p-3 text-center transition-all hover:border-brand-navy/30 hover:shadow-sm sm:h-28"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy transition-colors group-hover:bg-brand-navy/10">
        {icon}
      </span>
      <span className="text-sm font-medium text-brand-navy">{label}</span>
    </Link>
  );
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const wrap = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full";
  switch (type) {
    case "ASSIGNMENT_NEW":
      return (
        <span className={cn(wrap, "bg-blue-50 text-blue-700")}>
          <BookCheck className="h-4 w-4" />
        </span>
      );
    case "ASSIGNMENT_GRADED":
      return (
        <span className={cn(wrap, "bg-emerald-50 text-emerald-700")}>
          <BookCheck className="h-4 w-4" />
        </span>
      );
    case "EXAM_RESULT":
      return (
        <span className={cn(wrap, "bg-purple-50 text-purple-700")}>
          <FileText className="h-4 w-4" />
        </span>
      );
    case "INVOICE_DUE":
      return (
        <span className={cn(wrap, "bg-amber-50 text-amber-700")}>
          <Receipt className="h-4 w-4" />
        </span>
      );
    case "CLASS_REMINDER":
      return (
        <span className={cn(wrap, "bg-rose-50 text-rose-700")}>
          <Bell className="h-4 w-4" />
        </span>
      );
  }
}
