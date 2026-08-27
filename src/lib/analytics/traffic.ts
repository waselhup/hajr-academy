/**
 * Marketing traffic — parsing and classification for anonymous visits.
 *
 * Everything here answers questions an ad budget depends on: did this visit
 * come from a paid click, which campaign, what did they look at, and where did
 * they stop. It deliberately does not attempt to identify anybody — the
 * strongest signal it keeps about a person is a truncated hash of their IP.
 *
 * Kept free of Prisma so the route stays testable without a database.
 */

/** A visit is the same session until this much silence passes. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Cookie holding the random visitor id. First-party, no personal data. */
export const VISITOR_COOKIE = "hajr_vid";

/** Long enough to recognise a returning visitor across a campaign. */
export const VISITOR_COOKIE_MAX_AGE_SEC = 180 * 24 * 60 * 60;

/**
 * Collapse a URL into the page it represents.
 *
 * Without this, every order gets its own row and the checkout page looks like
 * a thousand pages visited once each. Locale prefix goes, and any segment that
 * is an id becomes a placeholder, so /ar/checkout/pay/abc-123 and
 * /en/checkout/pay/def-456 are counted as the same step of the funnel.
 */
export function normalizePath(rawPath: string): string {
  let path = rawPath.split("?")[0].split("#")[0];
  path = path.replace(/^\/(ar|en)(?=\/|$)/, "");
  if (path === "" || path === "/") return "/";

  const normalized = path
    .split("/")
    .map((segment) => (looksLikeId(segment) ? ":id" : segment))
    .join("/")
    .replace(/\/+$/, "");

  return normalized === "" ? "/" : normalized.slice(0, 200);
}

/**
 * Ids are recognised by shape rather than by a route table, so a new page with
 * a dynamic segment does not silently start fragmenting the report.
 */
function looksLikeId(segment: string): boolean {
  if (segment.length < 6) return false;
  // uuid
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  // cuid / long opaque token
  if (/^c[a-z0-9]{20,}$/i.test(segment)) return true;
  // all digits
  if (/^\d{6,}$/.test(segment)) return true;
  // mixed-case-and-digit slug of id length — catches nanoid-style keys
  if (segment.length >= 16 && /\d/.test(segment) && /[a-z]/i.test(segment) && !segment.includes("-")) {
    return true;
  }
  return false;
}

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  clickId: string | null;
  clickIdSource: string | null;
}

/**
 * Ad platforms append their own click id, and several of them drop UTM
 * parameters when the ad is edited in their UI. When that happens the click id
 * is the only evidence the visit was paid at all, so it is treated as an
 * attribution source in its own right — a visit with `gclid` and no UTM is
 * still a Google Ads visit, and reporting it as "direct" would understate the
 * campaign and overstate organic traffic.
 */
const CLICK_IDS: { param: string; source: string }[] = [
  { param: "gclid", source: "google" },
  { param: "wbraid", source: "google" },
  { param: "gbraid", source: "google" },
  { param: "fbclid", source: "facebook" },
  { param: "ttclid", source: "tiktok" },
  { param: "msclkid", source: "bing" },
  { param: "twclid", source: "twitter" },
  { param: "li_fat_id", source: "linkedin" },
  { param: "igshid", source: "instagram" },
  { param: "snapclid", source: "snapchat" },
];

export function parseAttribution(url: string): Attribution {
  let params: URLSearchParams;
  try {
    params = new URL(url, "https://hajracademy.com").searchParams;
  } catch {
    return emptyAttribution();
  }

  const pick = (name: string): string | null => {
    const value = params.get(name)?.trim();
    return value ? value.slice(0, 120) : null;
  };

  let clickId: string | null = null;
  let clickIdSource: string | null = null;
  for (const candidate of CLICK_IDS) {
    const value = pick(candidate.param);
    if (value) {
      clickId = value;
      clickIdSource = candidate.source;
      break;
    }
  }

  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmTerm: pick("utm_term"),
    utmContent: pick("utm_content"),
    clickId,
    clickIdSource,
  };
}

function emptyAttribution(): Attribution {
  return {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    clickId: null,
    clickIdSource: null,
  };
}

/** Host of the referrer, or null when it is missing or same-site. */
export function referrerHost(referrer: string | null, selfHost?: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    // Internal navigation is not a traffic source; counting it would make the
    // site its own biggest referrer.
    if (selfHost && host === selfHost.replace(/^www\./, "")) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * The single label the dashboard groups traffic by.
 *
 * Precedence matters: UTM first because it is what the marketer deliberately
 * set, then the click id (a paid visit whose UTMs were lost), then the
 * referrer, and only then "direct". "Direct" should mean "we genuinely do not
 * know", not "we failed to read the URL" — otherwise it quietly becomes the
 * biggest bucket and the report stops being usable.
 */
export function trafficSource(a: Attribution, host: string | null): string {
  if (a.utmSource) return a.utmSource.toLowerCase();
  if (a.clickIdSource) return a.clickIdSource;
  if (host) return host;
  return "direct";
}

/** Paid, organic search, social, referral, or direct. */
export function trafficChannel(a: Attribution, host: string | null): string {
  const medium = a.utmMedium?.toLowerCase() ?? "";
  if (a.clickId || /cpc|ppc|paid|display|cpm/.test(medium)) return "paid";
  if (/email|newsletter/.test(medium)) return "email";
  if (medium === "affiliate" || medium === "referral") return "referral";

  const source = (a.utmSource ?? host ?? "").toLowerCase();
  if (!source) return "direct";
  if (/google|bing|yahoo|duckduckgo/.test(source)) return "organic search";
  if (/instagram|facebook|tiktok|snapchat|twitter|x\.com|linkedin|youtube|whatsapp/.test(source)) {
    return "social";
  }
  return "referral";
}

/**
 * Obvious automated traffic, so ad reports are not inflated by crawlers.
 *
 * Conservative on purpose — an over-eager pattern that catches a real phone
 * browser would silently delete paying visitors from the report, which is far
 * worse than a few crawlers slipping through.
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|monitor|pingdom|uptime|lighthouse|headless|phantom|curl|wget|python-requests|axios|postman|semrush|ahrefs|dataprovider|scrapy/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_PATTERN.test(userAgent);
}

export function deviceType(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone|ipod|phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function browserName(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  // Order matters: Edge and Opera both claim to be Chrome, and Chrome claims
  // to be Safari, so the most specific match has to be tested first.
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\/|opera/i.test(userAgent)) return "Opera";
  if (/samsungbrowser/i.test(userAgent)) return "Samsung Internet";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Other";
}

/**
 * The purchase funnel, in order. Drop-off between consecutive steps is the
 * number that decides whether a campaign is worth its spend.
 *
 * Paths are matched by prefix against the normalised path.
 */
export const FUNNEL_STEPS: { key: string; label: string; labelAr: string; paths: string[] }[] = [
  { key: "landing", label: "Landing", labelAr: "الصفحة الرئيسية", paths: ["/", "/early-registration", "/classic"] },
  { key: "explore", label: "Browsing", labelAr: "تصفّح", paths: ["/teachers", "/placement-test", "/contact", "/brand"] },
  { key: "intent", label: "Trial or checkout", labelAr: "تجريبي أو شراء", paths: ["/trial", "/checkout"] },
  { key: "pay", label: "Payment page", labelAr: "صفحة الدفع", paths: ["/checkout/pay"] },
  { key: "done", label: "Completed", labelAr: "اكتمل", paths: ["/checkout/success"] },
];

export function funnelStepFor(path: string): string | null {
  // Longest match wins, so /checkout/success is "done" rather than "intent".
  let best: { key: string; length: number } | null = null;
  for (const step of FUNNEL_STEPS) {
    for (const candidate of step.paths) {
      const matches =
        candidate === "/" ? path === "/" : path === candidate || path.startsWith(`${candidate}/`);
      if (matches && (!best || candidate.length > best.length)) {
        best = { key: step.key, length: candidate.length };
      }
    }
  }
  return best?.key ?? null;
}
