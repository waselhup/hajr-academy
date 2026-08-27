/**
 * Attributing an outcome back to the visit that produced it.
 *
 * This is the piece that turns a traffic counter into something you can spend
 * an ad budget against. Visit counts alone cannot tell you that the campaign
 * sending 800 people converts nobody while the one sending 90 fills a class —
 * and without that, more traffic is not obviously good news.
 *
 * Every function here is best-effort and swallows its errors. Checkout must
 * never fail because analytics did.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { VISITOR_COOKIE } from "./traffic";
import type { VisitorConversion } from "@prisma/client";

/**
 * How far down the funnel each outcome sits.
 *
 * A visit is credited with the furthest thing it reached: someone who submits
 * the contact form and then buys should count as a purchase, not a contact.
 * Ranking rather than last-write-wins also means the order of unrelated hooks
 * cannot quietly downgrade a real sale.
 */
const RANK: Record<VisitorConversion, number> = {
  CONTACT_SUBMITTED: 1,
  APPLICATION_SUBMITTED: 1,
  TRIAL_BOOKED: 2,
  ORDER_PLACED: 3,
  ORDER_PAID: 4,
};

/** How far back to look for the visit that led here. */
const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Credit the current visitor's session with an outcome.
 *
 * Safe to call more than once — a repeat of the same or a lesser outcome is
 * ignored, so a retried payment webhook cannot double-count a sale.
 */
export async function markConversion(opts: {
  type: VisitorConversion;
  /** Order value in SAR, for revenue-per-campaign. */
  valueSar?: number | null;
  /** Set when the buyer has an account, so the visit can be joined to them. */
  userId?: string | null;
}): Promise<void> {
  try {
    const visitorId = cookies().get(VISITOR_COOKIE)?.value;
    // No cookie means the visitor blocked it or arrived by a path that was
    // never tracked. The sale still happened; it just cannot be attributed,
    // and inventing an attribution would be worse than admitting the gap.
    if (!visitorId) return;

    const since = new Date(Date.now() - ATTRIBUTION_WINDOW_MS);

    const session = await prisma.visitorSession.findFirst({
      where: { visitorId, startedAt: { gt: since } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, conversionType: true },
    });
    if (!session) return;

    if (session.conversionType && RANK[session.conversionType] >= RANK[opts.type]) {
      return;
    }

    await prisma.visitorSession.update({
      where: { id: session.id },
      data: {
        convertedAt: new Date(),
        conversionType: opts.type,
        ...(opts.valueSar != null ? { conversionValueSar: opts.valueSar } : {}),
        ...(opts.userId ? { userId: opts.userId } : {}),
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics/conversion]", (err as Error).message);
    }
  }
}
