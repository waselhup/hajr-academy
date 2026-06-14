"use client";
// Locale-aware Link (next-intl) keeps dashboard links inside the current
// locale; the explicit `/${locale}` prefixes below are therefore dropped.
import { Link } from "@/i18n/routing";
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
  return ar ? n.toLocaleString("ar-SA-u-nu-latn") : n.toLocaleString("en-US");
}

function fmtSar(n: number, ar: boolean): string {
  return new Intl.NumberFormat(ar ? "ar-SA-u-nu-latn" : "en-US", {
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
    const num = ar ? n.toLocaleString("ar-SA-u-nu-latn") : String(n);
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
    const n = ar ? mins.toLocaleString("ar-SA-u-nu-latn") : String(mins);
    return ar ? `${n} دقيقة` : `${n} min`;
  }
  const hrs = Math.round(mins / 60);
  const n = ar ? hrs.toLocaleString("ar-SA-u-nu-latn") : String(hrs);
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          tint="emerald"
          label={t("AdminDashboard.monthRevenue")}
          value={`${fmtSar(payload.monthRevenue.value, ar)} ${ar ? "ر.س" : "SAR"}`}
          delta={payload.monthRevenue.delta}
          deltaSuffix={t("AdminDashboard.vsLastMonth")}
          sparkline={payload.monthRevenue.sparkline}
          ar={ar}
          href={"/admin/finance"}
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
          href={"/admin/students"}
        />
        <KpiCard
          icon={<Radio className="h-5 w-5" />}
          tint="rose"
          label={t("AdminDashboard.liveClassesNow")}
          value={fmtNum(payload.liveClasses.value, ar)}
          pulse={payload.liveClasses.value > 0}
          ar={ar}
          href={"/admin/live"}
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
          payload.alerts.total > 0 ? "border-red-200" : "border-emerald-200"
        )}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            {payload.alerts.total > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            <h2 className="text-sm font-semibold text-hajr-deep-navy">
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
            <ul className="space-y-2">
              {payload.alerts.newContactRequests > 0 && (
                <AlertRow
                  icon={<Inbox className="h-4 w-4" />}
                  tint="amber"
                  label={t("AdminDashboard.alertContactRequests")}
                  count={payload.alerts.newContactRequests}
                  href={"/admin/communications/contacts"}
                  ar={ar}
                />
              )}
              {payload.alerts.pendingPayments > 0 && (
                <AlertRow
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  tint="emerald"
                  label={t("AdminDashboard.alertPendingPayments")}
                  count={payload.alerts.pendingPayments}
                  href={"/admin/teachers/payments"}
                  ar={ar}
                />
              )}
              {payload.alerts.overdueInvoices > 0 && (
                <AlertRow
                  icon={<Receipt className="h-4 w-4" />}
                  tint="red"
                  label={t("AdminDashboard.alertOverdueInvoices")}
                  count={payload.alerts.overdueInvoices}
                  href={"/admin/finance"}
                  ar={ar}
                />
              )}
              {payload.alerts.flaggedMessages > 0 && (
                <AlertRow
                  icon={<Flag className="h-4 w-4" />}
                  tint="rose"
                  label={t("AdminDashboard.alertFlaggedMessages")}
                  count={payload.alerts.flaggedMessages}
                  href={"/admin/communications/chats"}
                  ar={ar}
                />
              )}
              {payload.alerts.newTrials > 0 && (
                <AlertRow
                  icon={<UserPlus className="h-4 w-4" />}
                  tint="blue"
                  label={t("AdminDashboard.alertNewTrials")}
                  count={payload.alerts.newTrials}
                  href={"/admin/trials"}
                  ar={ar}
                />
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 3 — Today + Activity ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TodayClasses locale={locale} items={payload.todayClasses} ar={ar} />
        <SmartActivity locale={locale} items={payload.activity} ar={ar} />
      </div>

      {/* ── SECTION 4 — Quick Actions ────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-hajr-muted">
          {t("AdminDashboard.quickActionsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <QuickTile
            href={"/admin/students"}
            icon={<UserCheck className="h-6 w-6" />}
            label={t("AdminDashboard.quickAddStudent")}
          />
          <QuickTile
            href={"/admin/teachers"}
            icon={<GraduationCap className="h-6 w-6" />}
            label={t("AdminDashboard.quickAddTeacher")}
          />
          <QuickTile
            href={"/admin/classes"}
            icon={<BookText className="h-6 w-6" />}
            label={t("AdminDashboard.quickCreateClass")}
          />
          <QuickTile
            href={"/admin/finance"}
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
  // Utility icon chips are neutral grey by design (navy icon on #EFF1F4);
  // the `tint` prop is preserved for the semantic sparkline accent below.
  void tint;

  const positive = (delta ?? 0) >= 0;
  const sparkColor = positive ? "#10b981" : "#ef4444";

  const inner = (
    <Card className="h-full p-5">
      <CardContent className="space-y-3 p-0">
        <div className="flex items-start justify-between gap-2">
          <span className="icon-chip">
            {icon}
          </span>
          {pulse && (
            <span className="relative inline-flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hajr-rose opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-hajr-rose" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-hajr-muted">
            {label}
          </p>
          <p className="mt-1 truncate text-2xl font-bold text-hajr-deep-navy num">
            {value}
          </p>
          {subline && (
            <p className="mt-0.5 truncate text-xs text-hajr-muted">{subline}</p>
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
                <span className="truncate text-hajr-muted">{deltaSuffix}</span>
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
        className="subrow flex items-center gap-3 p-3 text-sm transition-colors hover:bg-hajr-chip"
      >
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl", tintCls)}>
          {icon}
        </span>
        <span className="flex-1 truncate font-medium text-hajr-deep-navy">{label}</span>
        <Badge variant="danger" className="num">
          {ar ? count.toLocaleString("ar-SA-u-nu-latn") : count}
        </Badge>
        <ArrowRight className="h-4 w-4 text-hajr-muted rtl-flip" />
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
    <Card className="p-5 sm:p-6">
      <CardContent className="space-y-4 p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-hajr-rose" />
            <h2 className="text-sm font-semibold text-hajr-deep-navy">
              {t("todayClassesTitle")}
            </h2>
            {items.length > 0 && (
              <span className="num text-xs text-hajr-muted">
                ({ar ? items.length.toLocaleString("ar-SA-u-nu-latn") : items.length})
              </span>
            )}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={"/admin/schedule"}>
              {t("todayClassesViewAll")}
              <ArrowRight className="ms-1 h-3 w-3 rtl-flip" />
            </Link>
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-hajr-muted">
            {t("todayClassesEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={"/admin/schedule"}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-sm transition-colors",
                    c.status === "LIVE"
                      ? "border border-hajr-rose/30 bg-hajr-rose/5"
                      : "bg-hajr-ivory hover:bg-hajr-chip"
                  )}
                >
                  <StatusDot status={c.status} />
                  <span className="num w-14 shrink-0 text-xs font-medium text-hajr-muted">
                    {new Date(c.scheduledStartAt).toLocaleTimeString(
                      ar ? "ar-SA-u-nu-latn" : "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Riyadh",
                      }
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-hajr-deep-navy">{c.className}</span>
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
                    <p className="truncate text-xs text-hajr-muted">
                      {c.teacherName} ·{" "}
                      {t("studentsCount", {
                        n: ar
                          ? c.studentCount.toLocaleString("ar-SA-u-nu-latn")
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
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hajr-rose opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-hajr-rose" />
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
    <Card className="p-5 sm:p-6">
      <CardContent className="space-y-4 p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-hajr-rose" />
            <h2 className="text-sm font-semibold text-hajr-deep-navy">
              {t("activityTitle")}
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={"/admin/audit-log"}>
              {t("activityViewAudit")}
              <ArrowRight className="ms-1 h-3 w-3 rtl-flip" />
            </Link>
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-hajr-muted">
            {t("activityEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id}>
                <Link
                  href={it.href}
                  className="subrow flex items-start gap-3 p-3 text-sm transition-colors hover:bg-hajr-chip"
                >
                  <ActivityIcon type={it.type} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-hajr-deep-navy">
                      {t(`evt_${it.type}` as any, it.data as any)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-hajr-muted num">
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
  // Feed type-indicators are generic utility icons → neutral grey chip
  // (navy icon on #EFF1F4). The icon glyph still distinguishes each event.
  const wrap = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hajr-chip text-hajr-deep-navy";
  switch (type) {
    case "PAYMENT_RECEIVED":
      return (
        <span className={wrap}>
          <Wallet className="h-4 w-4" />
        </span>
      );
    case "STUDENT_REGISTERED":
      return (
        <span className={wrap}>
          <UserPlus className="h-4 w-4" />
        </span>
      );
    case "TRIAL_REQUESTED":
      return (
        <span className={wrap}>
          <UserCheck className="h-4 w-4" />
        </span>
      );
    case "CLASS_STARTED":
      return (
        <span className={wrap}>
          <Play className="h-4 w-4" />
        </span>
      );
    case "INVOICE_OVERDUE":
      return (
        <span className={wrap}>
          <Receipt className="h-4 w-4" />
        </span>
      );
    case "CONTACT_SUBMITTED":
      return (
        <span className={wrap}>
          <Inbox className="h-4 w-4" />
        </span>
      );
    case "TEACHER_EARNING_APPROVED":
      return (
        <span className={wrap}>
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
      className="group flex h-24 flex-col items-center justify-center gap-2 rounded-card border border-hajr-border bg-white p-4 text-center shadow-card transition-all hover:shadow-card-hover sm:h-28"
    >
      <span className="icon-chip transition-colors group-hover:bg-hajr-border">
        {icon}
      </span>
      <span className="text-sm font-medium text-hajr-deep-navy">{label}</span>
    </Link>
  );
}
