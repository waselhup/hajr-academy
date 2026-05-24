"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Wallet,
  Users,
  Radio,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Inbox,
  BadgeDollarSign,
  Receipt,
  Flag,
  UserPlus,
  Calendar,
  Sparkles,
  UserCheck,
  ClipboardCheck,
  Play,
  GraduationCap,
  BookText,
  FileText,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SmartActivityType =
  | "PAYMENT_RECEIVED"
  | "STUDENT_REGISTERED"
  | "TRIAL_REQUESTED"
  | "CLASS_STARTED"
  | "INVOICE_OVERDUE"
  | "CONTACT_SUBMITTED"
  | "TEACHER_EARNING_APPROVED";

export interface DashboardPayload {
  name: string;
  today: string;
  monthRevenue: { value: number; delta: number; sparkline: number[] };
  activeStudents: { value: number; newThisWeek: number; sparkline: number[] };
  liveClasses: { value: number };
  monthlyClassCount: { value: number; delta: number; sparkline: number[] };
  alerts: {
    total: number;
    newContactRequests: number;
    pendingPayments: number;
    overdueInvoices: number;
    flaggedMessages: number;
    newTrials: number;
  };
  todayClasses: {
    id: string;
    classId: string;
    className: string;
    cohortCode: string;
    teacherName: string;
    scheduledStartAt: string;
    studentCount: number;
    status: "LIVE" | "SOON" | "LATER" | "DONE";
  }[];
  activity: {
    id: string;
    type: SmartActivityType;
    time: string;
    href: string;
    data: Record<string, string | number>;
  }[];
}

function fmtNum(n: number, ar: boolean): string {
  return ar ? n.toLocaleString("ar-SA") : n.toLocaleString("en-US");
}

function fmtSar(n: number, ar: boolean): string {
  return new Intl.NumberFormat(ar ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function relTime(iso: string, ar: boolean): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const past = t < now;
  const abs = Math.abs(t - now);
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

export function AdminCommandCenter({
  locale,
  payload,
}: {
  locale: string;
  payload: DashboardPayload;
}) {
  const t = useTranslations();
  const ar = locale === "ar";

  return (
    <div className="space-y-6">
      {/* ── SECTION 1 — Hero KPIs ─────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          tint="emerald"
          label={t("AdminDashboard.monthRevenue")}
          value={`${fmtSar(payload.monthRevenue.value, ar)} ${ar ? "ر.س" : "SAR"}`}
          delta={payload.monthRevenue.delta}
          deltaSuffix={t("AdminDashboard.vsLastMonth")}
          sparkline={payload.monthRevenue.sparkline}
          ar={ar}
          href={`/${locale}/admin/finance`}
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          tint="blue"
          label={t("AdminDashboard.activeStudents")}
          value={fmtNum(payload.activeStudents.value, ar)}
          subline={`+${fmtNum(payload.activeStudents.newThisWeek, ar)} ${t(
            "AdminDashboard.newThisWeek"
          )}`}
          sparkline={payload.activeStudents.sparkline}
          ar={ar}
          href={`/${locale}/admin/students`}
        />
        <KpiCard
          icon={<Radio className="h-5 w-5" />}
          tint="rose"
          label={t("AdminDashboard.liveClassesNow")}
          value={fmtNum(payload.liveClasses.value, ar)}
          pulse={payload.liveClasses.value > 0}
          ar={ar}
          href={`/${locale}/admin/live`}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tint="amber"
          label={t("AdminDashboard.attentionCount")}
          value={fmtNum(payload.alerts.total, ar)}
          subline={
            payload.alerts.total === 0
              ? t("AdminDashboard.alertsEmpty")
              : t("AdminDashboard.alertsTitle")
          }
          ar={ar}
          href="#alerts"
        />
      </div>

      {/* ── SECTION 2 — Alerts panel ──────────────────────────── */}
      <Card
        id="alerts"
        className={cn(
          "border-2",
          payload.alerts.total > 0 ? "border-red-200" : "border-emerald-200"
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            {payload.alerts.total > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            <h2 className="text-sm font-semibold text-brand-navy">
              {payload.alerts.total > 0
                ? t("AdminDashboard.alertsTitle")
                : t("AdminDashboard.alertsEmpty")}
            </h2>
          </div>
          {payload.alerts.total === 0 ? (
            <p className="py-3 text-center text-sm text-emerald-700">
              {ar
                ? "كل شيء على ما يرام — لا توجد طلبات أو تنبيهات معلّقة."
                : "All caught up — no pending requests or alerts."}
            </p>
          ) : (
            <ul className="divide-y">
              {payload.alerts.newContactRequests > 0 && (
                <AlertRow
                  icon={<Inbox className="h-4 w-4" />}
                  tint="amber"
                  label={t("AdminDashboard.alertContactRequests")}
                  count={payload.alerts.newContactRequests}
                  href={`/${locale}/admin/communications/contacts`}
                  ar={ar}
                />
              )}
              {payload.alerts.pendingPayments > 0 && (
                <AlertRow
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  tint="emerald"
                  label={t("AdminDashboard.alertPendingPayments")}
                  count={payload.alerts.pendingPayments}
                  href={`/${locale}/admin/teachers/payments`}
                  ar={ar}
                />
              )}
              {payload.alerts.overdueInvoices > 0 && (
                <AlertRow
                  icon={<Receipt className="h-4 w-4" />}
                  tint="red"
                  label={t("AdminDashboard.alertOverdueInvoices")}
                  count={payload.alerts.overdueInvoices}
                  href={`/${locale}/admin/finance`}
                  ar={ar}
                />
              )}
              {payload.alerts.flaggedMessages > 0 && (
                <AlertRow
                  icon={<Flag className="h-4 w-4" />}
                  tint="rose"
                  label={t("AdminDashboard.alertFlaggedMessages")}
                  count={payload.alerts.flaggedMessages}
                  href={`/${locale}/admin/communications/chats`}
                  ar={ar}
                />
              )}
              {payload.alerts.newTrials > 0 && (
                <AlertRow
                  icon={<UserPlus className="h-4 w-4" />}
                  tint="blue"
                  label={t("AdminDashboard.alertNewTrials")}
                  count={payload.alerts.newTrials}
                  href={`/${locale}/admin/trials`}
                  ar={ar}
                />
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 3 — Today + Activity ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TodayClasses locale={locale} items={payload.todayClasses} ar={ar} />
        <SmartActivity locale={locale} items={payload.activity} ar={ar} />
      </div>

      {/* ── SECTION 4 — Quick Actions ────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("AdminDashboard.quickActionsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickTile
            href={`/${locale}/admin/students`}
            icon={<UserCheck className="h-6 w-6" />}
            label={t("AdminDashboard.quickAddStudent")}
          />
          <QuickTile
            href={`/${locale}/admin/teachers`}
            icon={<GraduationCap className="h-6 w-6" />}
            label={t("AdminDashboard.quickAddTeacher")}
          />
          <QuickTile
            href={`/${locale}/admin/classes`}
            icon={<BookText className="h-6 w-6" />}
            label={t("AdminDashboard.quickCreateClass")}
          />
          <QuickTile
            href={`/${locale}/admin/finance`}
            icon={<FileText className="h-6 w-6" />}
            label={t("AdminDashboard.quickMonthReport")}
          />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */

function KpiCard({
  icon,
  tint,
  label,
  value,
  subline,
  delta,
  deltaSuffix,
  sparkline,
  pulse,
  ar,
  href,
}: {
  icon: React.ReactNode;
  tint: "emerald" | "blue" | "rose" | "amber";
  label: string;
  value: string;
  subline?: string;
  delta?: number;
  deltaSuffix?: string;
  sparkline?: number[];
  pulse?: boolean;
  ar: boolean;
  href: string;
}) {
  const tintCls = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  }[tint];

  const positive = (delta ?? 0) >= 0;
  const sparkColor = positive ? "#10b981" : "#ef4444";

  const inner = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg",
              tintCls
            )}
          >
            {icon}
          </span>
          {pulse && (
            <span className="relative inline-flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-2xl font-bold text-brand-navy num">
            {value}
          </p>
          {subline && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subline}</p>
          )}
          {typeof delta === "number" && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              {positive ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span
                className={cn(
                  "num font-semibold",
                  positive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {Math.abs(delta)}%
              </span>
              {deltaSuffix && (
                <span className="truncate text-muted-foreground">{deltaSuffix}</span>
              )}
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 0 && (
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparkline.map((v, i) => ({ i, v }))}
                margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={`spark-${tint}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${tint})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href.startsWith("#")) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

function AlertRow({
  icon,
  tint,
  label,
  count,
  href,
  ar,
}: {
  icon: React.ReactNode;
  tint: "amber" | "emerald" | "red" | "rose" | "blue";
  label: string;
  count: number;
  href: string;
  ar: boolean;
}) {
  const tintCls = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  }[tint];
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-1 py-2.5 text-sm transition-colors hover:bg-muted/50"
      >
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", tintCls)}>
          {icon}
        </span>
        <span className="flex-1 truncate font-medium">{label}</span>
        <Badge variant="danger" className="num">
          {ar ? count.toLocaleString("ar-SA") : count}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground rtl-flip" />
      </Link>
    </li>
  );
}

function TodayClasses({
  locale,
  items,
  ar,
}: {
  locale: string;
  items: DashboardPayload["todayClasses"];
  ar: boolean;
}) {
  const t = useTranslations("AdminDashboard");
  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-rose" />
            <h2 className="text-sm font-semibold text-brand-navy">
              {t("todayClassesTitle")}
            </h2>
            {items.length > 0 && (
              <span className="num text-xs text-muted-foreground">
                ({ar ? items.length.toLocaleString("ar-SA") : items.length})
              </span>
            )}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/admin/schedule`}>
              {t("todayClassesViewAll")}
              <ArrowRight className="ms-1 h-3 w-3 rtl-flip" />
            </Link>
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("todayClassesEmpty")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${locale}/admin/schedule`}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-2.5 text-sm transition-colors hover:bg-muted/50",
                    c.status === "LIVE" && "border-rose-200 bg-rose-50/30"
                  )}
                >
                  <StatusDot status={c.status} />
                  <span className="num w-14 shrink-0 text-xs font-medium text-muted-foreground">
                    {new Date(c.scheduledStartAt).toLocaleTimeString(
                      ar ? "ar-SA" : "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Riyadh",
                      }
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.className}</span>
                      {c.status === "LIVE" && (
                        <Badge variant="rose" className="text-[9px]">
                          ● {t("liveBadge")}
                        </Badge>
                      )}
                      {c.status === "SOON" && (
                        <Badge variant="warning" className="text-[9px]">
                          {t("startsIn", {
                            time: startsInText(c.scheduledStartAt, ar),
                          })}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.teacherName} ·{" "}
                      {t("studentsCount", {
                        n: ar
                          ? c.studentCount.toLocaleString("ar-SA")
                          : c.studentCount,
                      })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: "LIVE" | "SOON" | "LATER" | "DONE" }) {
  if (status === "LIVE") {
    return (
      <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
      </span>
    );
  }
  if (status === "SOON") {
    return (
      <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
    );
  }
  if (status === "DONE") {
    return (
      <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500/70" />
    );
  }
  return (
    <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
  );
}

function SmartActivity({
  locale,
  items,
  ar,
}: {
  locale: string;
  items: DashboardPayload["activity"];
  ar: boolean;
}) {
  const t = useTranslations("AdminDashboard");
  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-rose" />
            <h2 className="text-sm font-semibold text-brand-navy">
              {t("activityTitle")}
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/admin/audit-log`}>
              {t("activityViewAudit")}
              <ArrowRight className="ms-1 h-3 w-3 rtl-flip" />
            </Link>
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("activityEmpty")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li key={it.id}>
                <Link
                  href={it.href}
                  className="flex items-start gap-3 rounded-md border p-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <ActivityIcon type={it.type} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2">
                      {t(`evt_${it.type}` as any, it.data as any)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground num">
                      {relTime(it.time, ar)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: SmartActivityType }) {
  const wrap = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full";
  switch (type) {
    case "PAYMENT_RECEIVED":
      return (
        <span className={cn(wrap, "bg-emerald-50 text-emerald-700")}>
          <Wallet className="h-4 w-4" />
        </span>
      );
    case "STUDENT_REGISTERED":
      return (
        <span className={cn(wrap, "bg-blue-50 text-blue-700")}>
          <UserPlus className="h-4 w-4" />
        </span>
      );
    case "TRIAL_REQUESTED":
      return (
        <span className={cn(wrap, "bg-purple-50 text-purple-700")}>
          <UserCheck className="h-4 w-4" />
        </span>
      );
    case "CLASS_STARTED":
      return (
        <span className={cn(wrap, "bg-rose-50 text-rose-700")}>
          <Play className="h-4 w-4" />
        </span>
      );
    case "INVOICE_OVERDUE":
      return (
        <span className={cn(wrap, "bg-red-50 text-red-700")}>
          <Receipt className="h-4 w-4" />
        </span>
      );
    case "CONTACT_SUBMITTED":
      return (
        <span className={cn(wrap, "bg-amber-50 text-amber-700")}>
          <Inbox className="h-4 w-4" />
        </span>
      );
    case "TEACHER_EARNING_APPROVED":
      return (
        <span className={cn(wrap, "bg-teal-50 text-teal-700")}>
          <BadgeDollarSign className="h-4 w-4" />
        </span>
      );
  }
}

function QuickTile({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
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
