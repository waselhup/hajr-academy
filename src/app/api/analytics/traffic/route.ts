/**
 * POST /api/analytics/traffic — record an anonymous visit to the public site.
 *
 * Public by design: the whole point is measuring people who have no account.
 * That makes it the one analytics endpoint a stranger can call, so it does the
 * minimum possible with what it is given — no field from the body is trusted
 * beyond a length cap, nothing is looked up by a caller-supplied id, and there
 * is no response body worth harvesting.
 *
 * Distinct from /api/analytics/page-visit, which requires a session and tracks
 * how logged-in students use the platform.
 *
 * Never throws. A tracking failure must not cost a real visitor their page.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";
import {
  SESSION_IDLE_MS,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE_SEC,
  browserName,
  deviceType,
  isBot,
  normalizePath,
  parseAttribution,
  referrerHost,
} from "@/lib/analytics/traffic";

export const dynamic = "force-dynamic";

interface TrackBody {
  /** "view" starts a page, "leave" closes the one already open. */
  type?: "view" | "leave";
  /** Full path including query string, so UTMs survive. */
  url?: string;
  referrer?: string | null;
  locale?: string;
  /** "leave" only. */
  durationSec?: number;
  scrollDepth?: number;
}

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? Math.floor(value) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export async function POST(req: NextRequest) {
  // A single shape for every exit path: a caller learns nothing from the
  // response about whether their data was kept, deduplicated, or dropped.
  const ok = NextResponse.json({ ok: true });

  try {
    const body = (await req.json().catch(() => ({}))) as TrackBody;
    const userAgent = req.headers.get("user-agent");

    // Crawlers would otherwise inflate exactly the numbers used to judge ad
    // spend. Cheapest possible check, done before any database work.
    if (isBot(userAgent)) return ok;
    if (!body.url || typeof body.url !== "string") return ok;

    const existingVisitorId = req.cookies.get(VISITOR_COOKIE)?.value;
    const visitorId =
      existingVisitorId && /^[0-9a-f-]{36}$/i.test(existingVisitorId)
        ? existingVisitorId
        : randomUUID();

    const response = ok;
    if (visitorId !== existingVisitorId) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        maxAge: VISITOR_COOKIE_MAX_AGE_SEC,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    if (body.type === "leave") {
      await closeCurrentPageView(visitorId, body);
      return response;
    }

    await recordPageView(req, visitorId, body, userAgent);
    return response;
  } catch (err) {
    // Observability must never take the site down with it.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics/traffic]", (err as Error).message);
    }
    return ok;
  }
}

async function recordPageView(
  req: NextRequest,
  visitorId: string,
  body: TrackBody,
  userAgent: string | null,
): Promise<void> {
  const path = normalizePath(body.url!);
  const rawPath = body.url!.slice(0, 500);
  const attribution = parseAttribution(body.url!);
  const host = referrerHost(body.referrer ?? null, req.nextUrl.hostname);

  const idleCutoff = new Date(Date.now() - SESSION_IDLE_MS);

  let session = await prisma.visitorSession.findFirst({
    where: { visitorId, endedAt: null, lastSeenAt: { gt: idleCutoff } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, pageCount: true, utmSource: true, clickId: true },
  });

  if (!session) {
    session = await prisma.visitorSession.create({
      data: {
        visitorId,
        landingPath: path,
        referrer: body.referrer?.slice(0, 500) ?? null,
        referrerHost: host,
        // Vercel resolves country at the edge; absent locally, which is fine —
        // it is a nice-to-have, not something to derive from the IP ourselves.
        country: req.headers.get("x-vercel-ip-country")?.slice(0, 4) ?? null,
        deviceType: deviceType(userAgent),
        browser: browserName(userAgent),
        locale: typeof body.locale === "string" ? body.locale.slice(0, 8) : null,
        ipHash: shortHash(ipFromHeaders(req.headers)),
        userAgentHash: shortHash(userAgent),
        ...attribution,
      },
      select: { id: true, pageCount: true, utmSource: true, clickId: true },
    });
  } else if (!session.utmSource && !session.clickId && (attribution.utmSource || attribution.clickId)) {
    // First-touch attribution, with one exception: a session that began with no
    // campaign at all and then hits a campaign URL had nothing to overwrite.
    // Without this, a visitor who opens the site directly and then clicks the
    // ad shows up as "direct" and the campaign gets no credit for the sale.
    await prisma.visitorSession.update({
      where: { id: session.id },
      data: attribution,
    });
  }

  const sequence = session.pageCount + 1;

  // Only the newest page view is the exit. Clearing the previous one keeps
  // exactly one exit per session, which is what the drop-off report counts.
  await prisma.$transaction([
    prisma.visitorPageView.updateMany({
      where: { sessionId: session.id, isExit: true },
      data: { isExit: false },
    }),
    prisma.visitorPageView.create({
      data: { sessionId: session.id, path, rawPath, sequence, isExit: true },
    }),
    prisma.visitorSession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(),
        pageCount: sequence,
        // A visit stops being a bounce the moment it reaches a second page.
        isBounce: sequence <= 1,
      },
    }),
  ]);
}

/**
 * Close the open page view with how long it was actually read.
 *
 * Sent by `navigator.sendBeacon` on unload, which is best-effort by nature —
 * a killed tab may send nothing. Durations are therefore a floor, not a
 * measurement, and the dashboard says so rather than implying precision.
 */
async function closeCurrentPageView(visitorId: string, body: TrackBody): Promise<void> {
  const session = await prisma.visitorSession.findFirst({
    where: { visitorId, endedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });
  if (!session) return;

  const current = await prisma.visitorPageView.findFirst({
    where: { sessionId: session.id, leftAt: null },
    orderBy: { sequence: "desc" },
    select: { id: true },
  });
  if (!current) return;

  // Capped at an hour: a tab left open overnight would otherwise report a
  // fourteen-hour "read time" and wreck every average on the page.
  const durationSec = clampInt(body.durationSec, 0, 3600) ?? 0;
  const scrollDepth = clampInt(body.scrollDepth, 0, 100);

  await prisma.$transaction([
    prisma.visitorPageView.update({
      where: { id: current.id },
      data: { leftAt: new Date(), durationSec, scrollDepth },
    }),
    prisma.visitorSession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(),
        durationSec: { increment: durationSec },
      },
    }),
  ]);
}
