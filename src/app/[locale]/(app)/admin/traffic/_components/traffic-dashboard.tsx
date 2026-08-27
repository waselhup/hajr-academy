"use client";

/**
 * The traffic dashboard's presentation layer.
 *
 * Ordering is the design decision here: funnel and campaigns come before raw
 * visit counts, because "3,000 visits" is not a result — "3,000 visits, 4 of
 * whom booked, all from one campaign" is. A dashboard that opens with a big
 * traffic number quietly encourages buying more traffic.
 *
 * All numbers render with Western digits in both languages, per the
 * platform-wide rule.
 */
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  Breakdown,
  DailyPoint,
  Delta,
  SummaryDeltas,
  FunnelStep,
  PageStat,
  SourceStat,
  TrafficSummary,
} from "@/lib/analytics/traffic-queries";

type Locale = "ar" | "en";

interface Props {
  locale: Locale;
  viewerName: string | null;
  days: number;
  ranges: number[];
  summary: TrafficSummary;
  funnel: FunnelStep[];
  sources: SourceStat[];
  pages: PageStat[];
  exits: PageStat[];
  trend: DailyPoint[];
  deltas?: SummaryDeltas;
  devices: Breakdown[];
  countries: Breakdown[];
  landings: Breakdown[];
}

/** Always en-US grouping: Arabic-Indic numerals are banned platform-wide. */
function num(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(n: number): string {
  return `${num(n)}%`;
}

function duration(seconds: number): string {
  if (seconds < 60) return `${num(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${num(m)}m` : `${num(m)}m ${num(s)}s`;
}

function sar(n: number): string {
  return `${num(Math.round(n))} SAR`;
}

const CHANNEL_TONE: Record<string, string> = {
  paid: "bg-[#B86E7B]/12 text-[#8B4A56] border-[#B86E7B]/25",
  social: "bg-[#B5E5D8]/30 text-[#1E2A36] border-[#B5E5D8]",
  "organic search": "bg-emerald-50 text-emerald-800 border-emerald-200",
  referral: "bg-slate-100 text-slate-700 border-slate-200",
  email: "bg-amber-50 text-amber-800 border-amber-200",
  direct: "bg-slate-50 text-slate-500 border-slate-200",
};

export function TrafficDashboard(props: Props) {
  const { locale } = props;
  const ar = locale === "ar";
  const dir = ar ? "rtl" : "ltr";

  const t = (arabic: string, english: string) => (ar ? arabic : english);

  return (
    <div dir={dir} className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E2A36]">
            {t("ترافيك الموقع", "Site traffic")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t(
              "من أين يأتي الزوار، ماذا شاهدوا، وأين توقفوا.",
              "Where visitors come from, what they saw, and where they stopped.",
            )}
          </p>
        </div>

        <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {props.ranges.map((d) => (
            <Link
              key={d}
              href={`?days=${d}`}
              scroll={false}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                d === props.days
                  ? "bg-[#1E2A36] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {num(d)} {t("يوم", "days")}
            </Link>
          ))}
        </nav>
      </header>

      {props.summary.visits === 0 ? (
        <EmptyState ar={ar} />
      ) : (
        <>
          <SummaryCards summary={props.summary} deltas={props.deltas} t={t} />
          <Funnel steps={props.funnel} ar={ar} t={t} />
          <Sources sources={props.sources} t={t} />
          <div className="grid gap-6 lg:grid-cols-2">
            <Pages pages={props.pages} t={t} />
            <div className="space-y-6">
              <ExitPages exits={props.exits} t={t} />
              <Landings landings={props.landings} t={t} />
            </div>
          </div>
          <Trend points={props.trend} t={t} />
          <div className="grid gap-6 md:grid-cols-2">
            <BreakdownCard
              title={t("الأجهزة", "Devices")}
              rows={props.devices}
              t={t}
            />
            <BreakdownCard
              title={t("الدول", "Countries")}
              rows={props.countries}
              t={t}
            />
          </div>
        </>
      )}

      <p className="pt-2 text-xs text-slate-400">
        {t(
          "لا تُحفظ أي بيانات شخصية. الزائر معرّف عشوائي في كوكي، وعنوان IP يُخزَّن مشفّراً فقط. مدة القراءة تقريبية — بعض المتصفحات لا ترسلها عند الإغلاق.",
          "No personal data is stored. Visitors are a random cookie id and IP is only ever kept hashed. Read times are a floor, not a measurement — some browsers never report them on close.",
        )}
      </p>
    </div>
  );
}

// --- sections --------------------------------------------------------------

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium text-[#1E2A36]">
          {ar ? "لا توجد زيارات مسجّلة بعد" : "No visits recorded yet"}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          {ar
            ? "التتبع يبدأ من أول زيارة بعد النشر. إذا نشرت للتو، افتح الموقع في متصفح آخر وحدّث هذه الصفحة."
            : "Tracking starts with the first visit after deploy. If you just shipped, open the site in another browser and refresh this page."}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Period-over-period change, shown beside the figure it belongs to.
 *
 * Never colour alone: the arrow and the sign carry the direction, so the chip
 * still reads correctly in greyscale, in print, and to a colourblind reader —
 * the colour only reinforces whether the movement is GOOD, which is not the
 * same as whether it went up (a rising bounce rate is a bad thing).
 */
function DeltaChip({
  delta,
  previousLabel,
  t,
}: {
  delta?: Delta;
  previousLabel: string;
  t: (a: string, e: string) => string;
}) {
  if (!delta) return null;

  // No baseline to divide by — say so rather than invent a percentage.
  if (delta.percent === null) {
    return (
      <p className="mt-1 text-xs text-slate-400">
        {delta.previous === 0
          ? t("لا مقارنة — الفترة السابقة صفر", "No baseline — previous period was zero")
          : t("بدون تغيير", "No change")}
      </p>
    );
  }

  const up = delta.percent > 0;
  const flat = delta.percent === 0;
  const tone = flat
    ? "text-slate-500"
    : delta.good
      ? "text-emerald-700"
      : "text-red-700";

  return (
    <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${tone}`}>
      <span aria-hidden>{flat ? "→" : up ? "▲" : "▼"}</span>
      <span className="tabular-nums">
        {up ? "+" : ""}
        {delta.percent}%
      </span>
      <span className="font-normal text-slate-400">
        {t("مقارنة بـ", "vs")} {previousLabel}
      </span>
    </p>
  );
}

function SummaryCards({
  summary,
  deltas,
  t,
}: {
  summary: TrafficSummary;
  deltas?: SummaryDeltas;
  t: (a: string, e: string) => string;
}) {
  const tiles: {
    label: string;
    value: string;
    hint?: string;
    accent?: boolean;
    delta?: Delta;
  }[] = [
    {
      label: t("زيارات", "Visits"),
      delta: deltas?.visits,
      value: num(summary.visits),
      hint: `${num(summary.uniqueVisitors)} ${t("زائر مختلف", "unique")}`,
    },
    {
      label: t("صفحات مشاهَدة", "Page views"),
      delta: deltas?.pageViews,
      value: num(summary.pageViews),
    },
    {
      label: t("تحويلات", "Conversions"),
      delta: deltas?.conversions,
      value: num(summary.conversions),
      hint: `${pct(summary.conversionRate)} ${t("من الزيارات", "of visits")}`,
      accent: true,
    },
    {
      label: t("إيراد منسوب", "Attributed revenue"),
      delta: deltas?.revenueSar,
      value: sar(summary.revenueSar),
      accent: true,
    },
    {
      label: t("زيارات مدفوعة", "Paid visits"),
      delta: deltas?.paidVisits,
      value: num(summary.paidVisits),
      hint: t("من إعلان", "from an ad click"),
    },
    {
      label: t("ارتداد", "Bounce rate"),
      delta: deltas?.bounceRate,
      value: pct(summary.bounceRate),
      hint: t("غادروا من أول صفحة", "left from the first page"),
    },
    {
      label: t("متوسط الزيارة", "Avg. visit"),
      delta: deltas?.avgDurationSec,
      value: duration(summary.avgDurationSec),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card
          key={tile.label}
          className={tile.accent ? "border-[#B86E7B]/30 bg-[#B86E7B]/[0.04]" : undefined}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {tile.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1E2A36]">
              {tile.value}
            </p>
            {tile.hint && <p className="mt-1 text-xs text-slate-400">{tile.hint}</p>}
            <DeltaChip
              delta={tile.delta}
              previousLabel={deltas?.previousLabel ?? ""}
              t={t}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Funnel({
  steps,
  ar,
  t,
}: {
  steps: FunnelStep[];
  ar: boolean;
  t: (a: string, e: string) => string;
}) {
  const top = steps[0]?.visits ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("مسار الشراء", "Purchase funnel")}</CardTitle>
        <CardDescription>
          {t(
            "كم واحد وصل لكل مرحلة، وكم نسبة اللي وقفوا قبلها.",
            "How many reached each stage, and what share dropped before it.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, i) => {
          // Width is relative to the first step, so the shape of the funnel is
          // visible at a glance rather than needing the numbers read.
          const width = top > 0 ? Math.max(2, (step.visits / top) * 100) : 0;
          const badRoi = step.dropOffRate >= 60;

          return (
            <div key={step.key}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-[#1E2A36]">
                  {ar ? step.labelAr : step.label}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-slate-700">{num(step.visits)}</span>
                  {i > 0 && step.dropOffRate > 0 && (
                    <span className={badRoi ? "text-[#B86E7B]" : "text-slate-400"}>
                      −{pct(step.dropOffRate)}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#2C3E50] transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Sources({
  sources,
  t,
}: {
  sources: SourceStat[];
  t: (a: string, e: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("مصادر الزيارات والحملات", "Sources & campaigns")}
        </CardTitle>
        <CardDescription>
          {t(
            "هذا الجدول هو اللي يقرر وين تصرف فلوس الإعلانات.",
            "This is the table that decides where the ad budget goes.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("المصدر", "Source")}</TableHead>
              <TableHead>{t("النوع", "Channel")}</TableHead>
              <TableHead>{t("الحملة", "Campaign")}</TableHead>
              <TableHead className="text-right">{t("زيارات", "Visits")}</TableHead>
              <TableHead className="text-right">{t("ارتداد", "Bounce")}</TableHead>
              <TableHead className="text-right">{t("تحويلات", "Conv.")}</TableHead>
              <TableHead className="text-right">{t("نسبة", "Rate")}</TableHead>
              <TableHead className="text-right">{t("إيراد", "Revenue")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.slice(0, 25).map((s) => (
              <TableRow key={`${s.source}-${s.channel}-${s.campaign ?? ""}`}>
                <TableCell className="font-medium">{s.source}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={CHANNEL_TONE[s.channel] ?? CHANNEL_TONE.referral}
                  >
                    {s.channel}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500">{s.campaign ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{num(s.visits)}</TableCell>
                <TableCell className="text-right tabular-nums text-slate-500">
                  {pct(s.bounceRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {num(s.conversions)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {/* Green only above 1%: for a paid campaign, anything less is
                      usually losing money, and colouring it green would mislead. */}
                  <span className={s.conversionRate >= 1 ? "text-emerald-700" : "text-slate-500"}>
                    {pct(s.conversionRate)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {s.revenueSar > 0 ? sar(s.revenueSar) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Pages({
  pages,
  t,
}: {
  pages: PageStat[];
  t: (a: string, e: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("الصفحات", "Pages")}</CardTitle>
        <CardDescription>
          {t("كل صفحة زارها كم واحد وكم جلس فيها.", "Who saw each page, and for how long.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("الصفحة", "Page")}</TableHead>
              <TableHead className="text-right">{t("زوار", "Visitors")}</TableHead>
              <TableHead className="text-right">{t("مشاهدات", "Views")}</TableHead>
              <TableHead className="text-right">{t("المدة", "Time")}</TableHead>
              <TableHead className="text-right">{t("تمرير", "Scroll")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((p) => (
              <TableRow key={p.path}>
                <TableCell className="max-w-[220px] truncate font-mono text-xs" title={p.path}>
                  {p.path}
                </TableCell>
                <TableCell className="text-right tabular-nums">{num(p.visitors)}</TableCell>
                <TableCell className="text-right tabular-nums text-slate-500">
                  {num(p.views)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-500">
                  {duration(p.avgDurationSec)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-500">
                  {p.avgScrollDepth === null ? "—" : pct(p.avgScrollDepth)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ExitPages({
  exits,
  t,
}: {
  exits: PageStat[];
  t: (a: string, e: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("وين وقفوا", "Where they stopped")}</CardTitle>
        <CardDescription>
          {t(
            "آخر صفحة شافوها قبل ما يغادرون. أعلى نسبة = أكبر مشكلة.",
            "The last page before leaving. The highest rate is the biggest problem.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {exits.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-slate-400">
            {t("لا توجد بيانات كافية بعد.", "Not enough data yet.")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("الصفحة", "Page")}</TableHead>
                <TableHead className="text-right">{t("غادروا", "Exits")}</TableHead>
                <TableHead className="text-right">{t("النسبة", "Rate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exits.map((p) => (
                <TableRow key={p.path}>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs" title={p.path}>
                    {p.path}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{num(p.exits)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={p.exitRate >= 70 ? "font-medium text-[#B86E7B]" : "text-slate-500"}>
                      {pct(p.exitRate)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Landings({
  landings,
  t,
}: {
  landings: Breakdown[];
  t: (a: string, e: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("صفحات الدخول", "Landing pages")}</CardTitle>
        <CardDescription>
          {t("أول صفحة وصلوا لها — وين تنزل فلوس الإعلان.", "The first page they hit — where ad money lands.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {landings.map((l) => (
          <div key={l.label} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 truncate font-mono text-xs text-slate-600" title={l.label}>
              {l.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#B5E5D8]" style={{ width: `${l.share}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums text-slate-600">
              {num(l.visits)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Trend({
  points,
  t,
}: {
  points: DailyPoint[];
  t: (a: string, e: string) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.visits));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("الزيارات يومياً", "Visits per day")}</CardTitle>
        <CardDescription>
          {t(
            "الشريط الوردي = التحويلات في نفس اليوم. عمود اليوم مخطّط لأنه لم ينتهِ بعد.",
            "The rose bar is conversions that day. Today's bar is hatched because the day is not over.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Two series, so a legend is required — identity must never rest on
            colour alone. */}
        <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-[#2C3E50]" />
            {t("زيارات", "Visits")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-[#B86E7B]" />
            {t("تحويلات", "Conversions")}
          </span>
        </div>

        {/* Deliberately CSS bars, not a chart library: two small series do not
            justify a charting dependency on a page one person opens. */}
        <div className="flex h-48 items-end gap-1 overflow-x-auto" dir="ltr">
          {points.map((p) => (
            <div key={p.day} className="flex min-w-[34px] flex-1 flex-col items-center gap-1">
              {/* The number on top: the owner asked to READ the daily figure,
                  not hover for it. */}
              <span className="text-[11px] font-semibold tabular-nums text-[#1E2A36]">
                {p.visits}
              </span>
              <div className="flex h-28 w-full flex-col justify-end gap-0.5">
                {p.conversions > 0 && (
                  <div
                    className="w-full rounded-t bg-[#B86E7B]"
                    style={{ height: `${Math.max(4, (p.conversions / max) * 100)}%` }}
                    title={`${p.conversions} conversions`}
                  />
                )}
                <div
                  className={`w-full rounded-t bg-[#2C3E50] ${
                    p.partial ? "opacity-60" : ""
                  }`}
                  style={{
                    height: `${(p.visits / max) * 100}%`,
                    // Today is still filling, so it is drawn hatched rather
                    // than solid — a shorter solid bar reads as a real drop.
                    ...(p.partial
                      ? {
                          backgroundImage:
                            "repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.45) 4px 8px)",
                        }
                      : {}),
                  }}
                  title={`${p.visits} visits${p.partial ? " so far today" : ""}`}
                />
              </div>
              {p.partial ? (
                // No up/down arrow on a day that has not finished: comparing
                // a part-day against a whole one is not a comparison.
                <span className="text-[10px] text-slate-400">
                  {t("حتى الآن", "so far")}
                </span>
              ) : (
                p.changePercent !== null && (
                  <span
                    className={`text-[10px] tabular-nums ${
                      p.changePercent > 0
                        ? "text-emerald-700"
                        : p.changePercent < 0
                          ? "text-red-700"
                          : "text-slate-400"
                    }`}
                  >
                    {p.changePercent > 0 ? "▲" : p.changePercent < 0 ? "▼" : "→"}
                    {Math.abs(p.changePercent)}%
                  </span>
                )
              )}
              <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-400">
                {p.day}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
  t,
}: {
  title: string;
  rows: Breakdown[];
  t: (a: string, e: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">{t("لا توجد بيانات.", "No data.")}</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 truncate text-slate-600">{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#2C3E50]" style={{ width: `${r.share}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right tabular-nums text-slate-500">
                {num(r.visits)} · {pct(r.share)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
