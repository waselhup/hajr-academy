/**
 * /admin/traffic — the marketing traffic dashboard.
 *
 * Built for one job: deciding whether money spent on ads is coming back. So the
 * page leads with the funnel and campaign performance, not with a visit count —
 * traffic that never converts is a cost, not an achievement.
 *
 * Access is the `canViewTraffic` flag, not a role (see traffic-access.ts).
 *
 * Labels are inline bilingual rather than i18n keys. This is a single-viewer
 * internal tool, and adding ~40 keys to the shared ar/en JSON files — which
 * carry strict leaf-count parity — would be a large, conflict-prone change for
 * strings only one person reads.
 */
import { requireTrafficAccess } from "@/lib/analytics/traffic-access";
import {
  getCountryBreakdown,
  getDailyTrend,
  getSummaryDeltas,
  getDeviceBreakdown,
  getFunnel,
  getLandingPages,
  getPageStats,
  getSourceStats,
  getSummary,
  getTopExitPages,
  rangeForDays,
} from "@/lib/analytics/traffic-queries";
import { TrafficDashboard } from "./_components/traffic-dashboard";

export const dynamic = "force-dynamic";

const ALLOWED_RANGES = [7, 14, 30, 90] as const;

export default async function TrafficPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  // Above everything else: this throws a redirect, and it must not be catchable
  // by anything below it.
  const viewer = await requireTrafficAccess();

  const { locale } = await params;
  const { days } = await searchParams;

  // Allowlisted rather than clamped, so the query cost stays bounded no matter
  // what someone puts in the URL.
  const parsed = Number(days);
  const selectedDays = (ALLOWED_RANGES as readonly number[]).includes(parsed) ? parsed : 30;
  const range = rangeForDays(selectedDays);

  // Fetched together — they hit the same rows, and running them in sequence
  // would make the page noticeably slow for no benefit.
  const [summary, funnel, sources, pages, exits, trend, devices, countries, landings] =
    await Promise.all([
      getSummary(range),
      getFunnel(range),
      getSourceStats(range),
      getPageStats(range, 40),
      getTopExitPages(range),
      getDailyTrend(range),
      getDeviceBreakdown(range),
      getCountryBreakdown(range),
      getLandingPages(range),
    ]);

  // Runs after the summary because it compares against it. One extra query,
  // and it is the whole point of the page: a number with no baseline cannot
  // tell the owner whether things are getting better or worse.
  const deltas = await getSummaryDeltas(range, summary);

  return (
    <TrafficDashboard
      locale={locale === "ar" ? "ar" : "en"}
      viewerName={viewer.name}
      days={selectedDays}
      ranges={[...ALLOWED_RANGES]}
      summary={summary}
      funnel={funnel}
      sources={sources}
      pages={pages}
      exits={exits}
      trend={trend}
      deltas={deltas}
      devices={devices}
      countries={countries}
      landings={landings}
    />
  );
}
