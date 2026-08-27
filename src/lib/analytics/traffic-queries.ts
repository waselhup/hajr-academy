/**
 * Aggregations behind /admin/traffic.
 *
 * Each function answers one question an ad budget actually turns on. They are
 * separate rather than one big query so a slow section can be diagnosed on its
 * own, and so the page can render what it has if one part fails.
 *
 * Raw SQL appears only where Prisma cannot express the shape — counting
 * DISTINCT sessions per page, and the funnel. Every raw query is parameterised;
 * no caller value is ever interpolated into SQL text.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FUNNEL_STEPS, trafficChannel, trafficSource } from "./traffic";

export interface DateRange {
  from: Date;
  to: Date;
}

export function rangeForDays(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

/**
 * The equally-long window immediately before this one.
 *
 * "Up 20%" only means something against a stated baseline, and the only
 * baseline that is fair is the same number of days ending where this window
 * began — comparing 7 days against 30 would flatter or damn every figure.
 */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span), to: range.from };
}

export interface Delta {
  /** Signed percentage change, rounded. Null when there is no baseline. */
  percent: number | null;
  /** The previous period's raw figure, so the UI can show what it compared to. */
  previous: number;
  /**
   * Whether the movement is GOOD for the academy. Direction is not goodness:
   * visits rising is good, bounce rate rising is bad — so each metric declares
   * its own polarity rather than the UI assuming "up is green".
   */
  good: boolean | null;
}

/**
 * Compare two figures.
 *
 * `higherIsBetter: false` flips the verdict for metrics where a rise is a
 * problem (bounce rate). A change from zero has no percentage — reporting
 * "+100%" or "∞" there would be arithmetic theatre — so `percent` is null and
 * the UI shows the raw move instead.
 */
export function computeDelta(
  current: number,
  previous: number,
  higherIsBetter = true
): Delta {
  if (previous === 0) {
    return {
      percent: null,
      previous,
      good: current === 0 ? null : higherIsBetter,
    };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  return {
    percent,
    previous,
    good: percent === 0 ? null : higherIsBetter ? percent > 0 : percent < 0,
  };
}

export interface SummaryDeltas {
  visits: Delta;
  uniqueVisitors: Delta;
  pageViews: Delta;
  conversions: Delta;
  revenueSar: Delta;
  bounceRate: Delta;
  avgDurationSec: Delta;
  paidVisits: Delta;
  /** Rendered label for the window compared against, e.g. "02/08 – 09/08". */
  previousLabel: string;
}

const dm = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Every headline figure, measured against the preceding equal window. */
export async function getSummaryDeltas(
  range: DateRange,
  current: TrafficSummary
): Promise<SummaryDeltas> {
  const prevRange = previousRange(range);
  const prev = await getSummary(prevRange);
  return {
    visits: computeDelta(current.visits, prev.visits),
    uniqueVisitors: computeDelta(current.uniqueVisitors, prev.uniqueVisitors),
    pageViews: computeDelta(current.pageViews, prev.pageViews),
    conversions: computeDelta(current.conversions, prev.conversions),
    revenueSar: computeDelta(current.revenueSar, prev.revenueSar),
    // A visitor leaving from the first page is a failure, so a rise is bad.
    bounceRate: computeDelta(current.bounceRate, prev.bounceRate, false),
    avgDurationSec: computeDelta(current.avgDurationSec, prev.avgDurationSec),
    paidVisits: computeDelta(current.paidVisits, prev.paidVisits),
    previousLabel: `${dm(prevRange.from)} – ${dm(prevRange.to)}`,
  };
}

// --- headline numbers ------------------------------------------------------

export interface TrafficSummary {
  visits: number;
  uniqueVisitors: number;
  pageViews: number;
  bounceRate: number;
  avgDurationSec: number;
  conversions: number;
  conversionRate: number;
  revenueSar: number;
  /** Visits that arrived from a paid click. */
  paidVisits: number;
}

export async function getSummary(range: DateRange): Promise<TrafficSummary> {
  const where = { startedAt: { gte: range.from, lte: range.to } };

  const [agg, uniqueVisitors, pageViews, bounces, conversions, revenue, paid] =
    await Promise.all([
      prisma.visitorSession.aggregate({
        where,
        _count: { id: true },
        _avg: { durationSec: true },
      }),
      prisma.visitorSession
        .findMany({ where, distinct: ["visitorId"], select: { visitorId: true } })
        .then((rows) => rows.length),
      prisma.visitorPageView.count({
        where: { session: where },
      }),
      prisma.visitorSession.count({ where: { ...where, isBounce: true } }),
      prisma.visitorSession.count({ where: { ...where, convertedAt: { not: null } } }),
      prisma.visitorSession.aggregate({
        where: { ...where, conversionValueSar: { not: null } },
        _sum: { conversionValueSar: true },
      }),
      prisma.visitorSession.count({
        where: { ...where, OR: [{ clickId: { not: null } }, { utmMedium: { in: ["cpc", "ppc", "paid"] } }] },
      }),
    ]);

  const visits = agg._count.id;

  return {
    visits,
    uniqueVisitors,
    pageViews,
    // Guarded: an empty range must show 0%, not NaN.
    bounceRate: visits ? Math.round((bounces / visits) * 1000) / 10 : 0,
    avgDurationSec: Math.round(agg._avg.durationSec ?? 0),
    conversions,
    conversionRate: visits ? Math.round((conversions / visits) * 1000) / 10 : 0,
    revenueSar: Number(revenue._sum.conversionValueSar ?? 0),
    paidVisits: paid,
  };
}

// --- per page --------------------------------------------------------------

export interface PageStat {
  path: string;
  views: number;
  visitors: number;
  avgDurationSec: number;
  avgScrollDepth: number | null;
  exits: number;
  /** Share of visits that ENDED here. The drop-off signal. */
  exitRate: number;
}

/**
 * Per-page performance.
 *
 * `visitors` counts distinct sessions, not views — a page reloaded six times by
 * one person is one visitor, and reporting six would flatter the page.
 */
export async function getPageStats(range: DateRange, limit = 50): Promise<PageStat[]> {
  const rows = await prisma.$queryRaw<
    {
      path: string;
      views: bigint;
      visitors: bigint;
      avg_duration: number | null;
      avg_scroll: number | null;
      exits: bigint;
    }[]
  >(Prisma.sql`
    SELECT
      pv."path"                                      AS path,
      COUNT(*)                                       AS views,
      COUNT(DISTINCT pv."sessionId")                 AS visitors,
      AVG(NULLIF(pv."durationSec", 0))               AS avg_duration,
      AVG(pv."scrollDepth")                          AS avg_scroll,
      COUNT(*) FILTER (WHERE pv."isExit")            AS exits
    FROM "VisitorPageView" pv
    JOIN "VisitorSession" s ON s."id" = pv."sessionId"
    WHERE s."startedAt" >= ${range.from} AND s."startedAt" <= ${range.to}
    GROUP BY pv."path"
    ORDER BY views DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => {
    const views = Number(r.views);
    const exits = Number(r.exits);
    return {
      path: r.path,
      views,
      visitors: Number(r.visitors),
      avgDurationSec: Math.round(r.avg_duration ?? 0),
      avgScrollDepth: r.avg_scroll === null ? null : Math.round(r.avg_scroll),
      exits,
      exitRate: views ? Math.round((exits / views) * 1000) / 10 : 0,
    };
  });
}

// --- where traffic comes from ---------------------------------------------

export interface SourceStat {
  source: string;
  channel: string;
  campaign: string | null;
  visits: number;
  conversions: number;
  conversionRate: number;
  revenueSar: number;
  bounceRate: number;
}

/**
 * Traffic grouped the way a marketer thinks about it: by campaign where one is
 * set, otherwise by where the click came from.
 *
 * The grouping is done in TypeScript rather than SQL because the label depends
 * on precedence rules (UTM, then click id, then referrer) that belong next to
 * their explanation in traffic.ts, not duplicated in a query.
 */
export async function getSourceStats(range: DateRange): Promise<SourceStat[]> {
  const sessions = await prisma.visitorSession.findMany({
    where: { startedAt: { gte: range.from, lte: range.to } },
    select: {
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmTerm: true,
      utmContent: true,
      clickId: true,
      clickIdSource: true,
      referrerHost: true,
      convertedAt: true,
      conversionValueSar: true,
      isBounce: true,
    },
  });

  const buckets = new Map<string, SourceStat & { bounces: number }>();

  for (const s of sessions) {
    const attribution = {
      utmSource: s.utmSource,
      utmMedium: s.utmMedium,
      utmCampaign: s.utmCampaign,
      utmTerm: s.utmTerm,
      utmContent: s.utmContent,
      clickId: s.clickId,
      clickIdSource: s.clickIdSource,
    };
    const source = trafficSource(attribution, s.referrerHost);
    const channel = trafficChannel(attribution, s.referrerHost);
    const key = `${source}|${channel}|${s.utmCampaign ?? ""}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        source,
        channel,
        campaign: s.utmCampaign,
        visits: 0,
        conversions: 0,
        conversionRate: 0,
        revenueSar: 0,
        bounceRate: 0,
        bounces: 0,
      };
      buckets.set(key, bucket);
    }

    bucket.visits++;
    if (s.convertedAt) bucket.conversions++;
    if (s.isBounce) bucket.bounces++;
    bucket.revenueSar += Number(s.conversionValueSar ?? 0);
  }

  return [...buckets.values()]
    .map((b) => ({
      ...b,
      conversionRate: b.visits ? Math.round((b.conversions / b.visits) * 1000) / 10 : 0,
      bounceRate: b.visits ? Math.round((b.bounces / b.visits) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.visits - a.visits);
}

// --- the funnel ------------------------------------------------------------

export interface FunnelStep {
  key: string;
  label: string;
  labelAr: string;
  visits: number;
  /** Percentage of the previous step that did NOT continue. */
  dropOffRate: number;
}

/**
 * How many visits reached each stage of the purchase path.
 *
 * Counted as "reached this step at any point in the visit", not "went straight
 * there" — people wander between the landing page and pricing before buying,
 * and a strict-sequence funnel would report most real purchases as skipped
 * steps.
 */
export async function getFunnel(range: DateRange): Promise<FunnelStep[]> {
  const steps: FunnelStep[] = [];
  let previous: number | null = null;

  for (const step of FUNNEL_STEPS) {
    const visits = await prisma.visitorSession.count({
      where: {
        startedAt: { gte: range.from, lte: range.to },
        pageViews: {
          some: {
            OR: step.paths.flatMap((p) =>
              p === "/" ? [{ path: "/" }] : [{ path: p }, { path: { startsWith: `${p}/` } }],
            ),
          },
        },
      },
    });

    steps.push({
      key: step.key,
      label: step.label,
      labelAr: step.labelAr,
      visits,
      dropOffRate:
        previous && previous > 0
          ? Math.round(((previous - visits) / previous) * 1000) / 10
          : 0,
    });
    previous = visits;
  }

  return steps;
}

// --- trend and breakdowns --------------------------------------------------

export interface DailyPoint {
  day: string;
  visits: number;
  conversions: number;
  /** Change in visits vs the day before, as a percentage. Null on day one. */
  changePercent: number | null;
  /**
   * True for today, which has not finished yet.
   *
   * Without this the newest bar is always compared as though it were a whole
   * day, so at 9am every morning the dashboard reports a collapse in traffic
   * that is really just a day in progress.
   */
  partial: boolean;
}

export async function getDailyTrend(range: DateRange): Promise<DailyPoint[]> {
  // The whole day series is built IN SQL, including the empty days.
  //
  // The previous version grouped in Postgres and filled gaps in JavaScript,
  // matching the two on a date string. That silently lost almost every day:
  // Postgres truncated in UTC while JS took local midnight, and local midnight
  // in Riyadh (UTC+3) is the PREVIOUS calendar day in UTC — so the keys never
  // met and the bars summed to far less than the headline figure. Generating
  // the series alongside the counts removes the alignment problem entirely.
  //
  // Days are Riyadh days: the owner reads this page in Riyadh, and "how did
  // Tuesday do" means the Tuesday he lived, not a UTC window. `startedAt` is
  // `timestamp without time zone` holding UTC, hence the double conversion.
  const rows = await prisma.$queryRaw<
    { day: Date; visits: bigint; conversions: bigint }[]
  >(Prisma.sql`
    WITH days AS (
      SELECT generate_series(
        (${range.from} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Riyadh')::date,
        (${range.to}   AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Riyadh')::date,
        interval '1 day'
      )::date AS day
    ),
    counted AS (
      SELECT
        (("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Riyadh')::date) AS day,
        COUNT(*)                                          AS visits,
        COUNT(*) FILTER (WHERE "convertedAt" IS NOT NULL) AS conversions
      FROM "VisitorSession"
      WHERE "startedAt" >= ${range.from} AND "startedAt" <= ${range.to}
      GROUP BY 1
    )
    SELECT d.day,
           COALESCE(c.visits, 0)      AS visits,
           COALESCE(c.conversions, 0) AS conversions
    FROM days d
    LEFT JOIN counted c ON c.day = d.day
    ORDER BY d.day ASC
  `);

  // Today in Riyadh, so the final bar can be flagged as still filling up.
  const todayRiyadh = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Riyadh",
  });

  const out: DailyPoint[] = [];
  for (const r of rows) {
    const visits = Number(r.visits);
    const prev = out.length > 0 ? out[out.length - 1].visits : null;
    const iso = r.day.toISOString().slice(0, 10);
    out.push({
      partial: iso === todayRiyadh,
      // dd/mm — Western digits, per the platform-wide numeral rule. Read in
      // UTC because ::date comes back as a midnight-UTC timestamp.
      day: `${String(r.day.getUTCDate()).padStart(2, "0")}/${String(
        r.day.getUTCMonth() + 1
      ).padStart(2, "0")}`,
      visits,
      conversions: Number(r.conversions),
      changePercent:
        prev === null || prev === 0
          ? null
          : Math.round(((visits - prev) / prev) * 100),
    });
  }
  return out;
}

export interface Breakdown {
  label: string;
  visits: number;
  share: number;
}

async function breakdownBy(
  field: "deviceType" | "country" | "browser",
  range: DateRange,
): Promise<Breakdown[]> {
  const rows = await prisma.visitorSession.groupBy({
    by: [field],
    where: { startedAt: { gte: range.from, lte: range.to } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 12,
  });

  const total = rows.reduce((sum, r) => sum + r._count.id, 0);

  return rows.map((r) => ({
    label: (r[field] as string | null) ?? "unknown",
    visits: r._count.id,
    share: total ? Math.round((r._count.id / total) * 1000) / 10 : 0,
  }));
}

export const getDeviceBreakdown = (r: DateRange) => breakdownBy("deviceType", r);
export const getCountryBreakdown = (r: DateRange) => breakdownBy("country", r);

/** Where visits ended, worst first — the pages losing people. */
export async function getTopExitPages(range: DateRange, limit = 10): Promise<PageStat[]> {
  const pages = await getPageStats(range, 200);
  return pages
    // Ignore pages with almost no traffic: one visit that exited is a 100% exit
    // rate and would otherwise top the list ahead of a real problem page.
    .filter((p) => p.views >= 5)
    .sort((a, b) => b.exits - a.exits)
    .slice(0, limit);
}

/** The landing page is where ad money lands — worth its own view. */
export async function getLandingPages(range: DateRange, limit = 10): Promise<Breakdown[]> {
  const rows = await prisma.visitorSession.groupBy({
    by: ["landingPath"],
    where: { startedAt: { gte: range.from, lte: range.to } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const total = rows.reduce((sum, r) => sum + r._count.id, 0);
  return rows.map((r) => ({
    label: r.landingPath,
    visits: r._count.id,
    share: total ? Math.round((r._count.id / total) * 1000) / 10 : 0,
  }));
}
