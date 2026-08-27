/**
 * Attribution correctness.
 *
 * These functions decide which campaign gets credit for a sale, which is the
 * number an ad budget is moved on. A quiet bug here does not crash anything —
 * it just sends money to the wrong campaign for months.
 */
import { describe, expect, it } from "vitest";
import {
  browserName,
  deviceType,
  funnelStepFor,
  isBot,
  normalizePath,
  parseAttribution,
  referrerHost,
  trafficChannel,
  trafficSource,
} from "./traffic";

describe("normalizePath", () => {
  it("strips the locale prefix so ar and en count as one page", () => {
    expect(normalizePath("/ar/checkout")).toBe("/checkout");
    expect(normalizePath("/en/checkout")).toBe("/checkout");
  });

  it("keeps the root as /", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/ar")).toBe("/");
    expect(normalizePath("/en/")).toBe("/");
  });

  it("drops query and hash so utm params don't fragment the page report", () => {
    expect(normalizePath("/ar/?utm_source=instagram&utm_campaign=eid")).toBe("/");
    expect(normalizePath("/ar/teachers#top")).toBe("/teachers");
  });

  it("collapses ids, so one checkout page is not a thousand pages", () => {
    expect(normalizePath("/ar/checkout/pay/3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toBe(
      "/checkout/pay/:id",
    );
    expect(normalizePath("/en/checkout/pay/123456789")).toBe("/checkout/pay/:id");
    expect(normalizePath("/ar/placement-test/results/ckl9x2h4n0000qwertyuiop12")).toBe(
      "/placement-test/results/:id",
    );
  });

  it("does not mistake real page names for ids", () => {
    // The regression that matters: if "early-registration" collapsed to :id,
    // the campaign landing page would vanish from the report.
    expect(normalizePath("/ar/early-registration")).toBe("/early-registration");
    expect(normalizePath("/ar/policies/privacy")).toBe("/policies/privacy");
    expect(normalizePath("/en/conversation-partner")).toBe("/conversation-partner");
    expect(normalizePath("/en/placement-test")).toBe("/placement-test");
  });

  it("normalises trailing slashes", () => {
    expect(normalizePath("/ar/teachers/")).toBe("/teachers");
  });
});

describe("parseAttribution", () => {
  it("reads all five utm parameters", () => {
    const a = parseAttribution(
      "/?utm_source=instagram&utm_medium=cpc&utm_campaign=eid2026&utm_term=english&utm_content=video1",
    );
    expect(a.utmSource).toBe("instagram");
    expect(a.utmMedium).toBe("cpc");
    expect(a.utmCampaign).toBe("eid2026");
    expect(a.utmTerm).toBe("english");
    expect(a.utmContent).toBe("video1");
  });

  it("recognises a paid click even when the ad dropped its UTMs", () => {
    // Meta and Google both strip UTMs when an ad is edited in their UI. Without
    // the click id these visits look organic and the campaign gets no credit.
    const a = parseAttribution("/?fbclid=IwAR0abcdefgh");
    expect(a.clickId).toBe("IwAR0abcdefgh");
    expect(a.clickIdSource).toBe("facebook");
    expect(a.utmSource).toBeNull();
  });

  it("recognises Google's newer click ids", () => {
    expect(parseAttribution("/?gclid=abc123").clickIdSource).toBe("google");
    expect(parseAttribution("/?wbraid=abc123").clickIdSource).toBe("google");
    expect(parseAttribution("/?gbraid=abc123").clickIdSource).toBe("google");
  });

  it("returns empty attribution for a plain visit", () => {
    const a = parseAttribution("/ar/teachers");
    expect(a.utmSource).toBeNull();
    expect(a.clickId).toBeNull();
  });

  it("survives a malformed url instead of throwing", () => {
    expect(() => parseAttribution("::::")).not.toThrow();
  });
});

describe("referrerHost", () => {
  it("strips www and returns the host", () => {
    expect(referrerHost("https://www.instagram.com/p/abc")).toBe("instagram.com");
  });

  it("ignores our own site, which is navigation and not a source", () => {
    // Otherwise HAJR becomes its own biggest referrer and buries the real ones.
    expect(referrerHost("https://hajracademy.com/ar", "hajracademy.com")).toBeNull();
    expect(referrerHost("https://www.hajracademy.com/ar", "hajracademy.com")).toBeNull();
  });

  it("returns null for missing or unparseable referrers", () => {
    expect(referrerHost(null)).toBeNull();
    expect(referrerHost("not a url")).toBeNull();
  });
});

describe("trafficSource precedence", () => {
  const noAttribution = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    clickId: null,
    clickIdSource: null,
  };

  it("prefers the utm the marketer set", () => {
    expect(
      trafficSource({ ...noAttribution, utmSource: "Instagram" }, "google.com"),
    ).toBe("instagram");
  });

  it("falls back to the click id when utms were lost", () => {
    expect(
      trafficSource({ ...noAttribution, clickId: "x", clickIdSource: "facebook" }, null),
    ).toBe("facebook");
  });

  it("falls back to the referrer host", () => {
    expect(trafficSource(noAttribution, "instagram.com")).toBe("instagram.com");
  });

  it("only says direct when there is genuinely nothing", () => {
    // "direct" must mean unknown origin, never "we failed to read the URL" —
    // otherwise it silently becomes the biggest bucket.
    expect(trafficSource(noAttribution, null)).toBe("direct");
  });
});

describe("trafficChannel", () => {
  const base = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    clickId: null,
    clickIdSource: null,
  };

  it("counts a click id as paid", () => {
    expect(trafficChannel({ ...base, clickId: "x", clickIdSource: "google" }, null)).toBe("paid");
  });

  it("counts cpc and ppc mediums as paid", () => {
    expect(trafficChannel({ ...base, utmMedium: "cpc" }, null)).toBe("paid");
    expect(trafficChannel({ ...base, utmMedium: "PPC" }, null)).toBe("paid");
  });

  it("classifies social and search", () => {
    expect(trafficChannel(base, "instagram.com")).toBe("social");
    expect(trafficChannel(base, "google.com")).toBe("organic search");
  });

  it("classifies an unknown referrer as referral, not direct", () => {
    expect(trafficChannel(base, "somesite.sa")).toBe("referral");
  });

  it("is direct only with no signal at all", () => {
    expect(trafficChannel(base, null)).toBe("direct");
  });
});

describe("isBot", () => {
  it("catches common crawlers and preview fetchers", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
  });

  it("treats a missing user agent as a bot", () => {
    expect(isBot(null)).toBe(true);
  });

  it("does NOT flag real phone browsers", () => {
    // Over-eager patterns silently delete paying visitors from the report,
    // which is far worse than letting a few crawlers through.
    expect(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(
      isBot(
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
  });
});

describe("deviceType and browserName", () => {
  it("separates phone, tablet and desktop", () => {
    expect(deviceType("iPhone; CPU iPhone OS 17_2")).toBe("mobile");
    expect(deviceType("iPad; CPU OS 17_2")).toBe("tablet");
    expect(deviceType("Macintosh; Intel Mac OS X 10_15_7")).toBe("desktop");
  });

  it("resolves browsers that impersonate each other", () => {
    // Edge and Opera both claim Chrome; Chrome claims Safari. Order matters.
    expect(browserName("Chrome/120 Safari/537.36 Edg/120")).toBe("Edge");
    expect(browserName("Chrome/120 Safari/537.36 OPR/106")).toBe("Opera");
    expect(browserName("Chrome/120 Safari/537.36")).toBe("Chrome");
    expect(browserName("Version/17.2 Safari/604.1")).toBe("Safari");
  });
});

describe("funnelStepFor", () => {
  it("maps landing pages", () => {
    expect(funnelStepFor("/")).toBe("landing");
    expect(funnelStepFor("/early-registration")).toBe("landing");
  });

  it("maps intent and payment", () => {
    expect(funnelStepFor("/trial")).toBe("intent");
    expect(funnelStepFor("/checkout")).toBe("intent");
    expect(funnelStepFor("/checkout/pay/:id")).toBe("pay");
  });

  it("gives the completed page to done, not intent", () => {
    // /checkout/success also starts with /checkout, so the longest match has to
    // win or every sale is counted as an abandoned checkout.
    expect(funnelStepFor("/checkout/success")).toBe("done");
  });

  it("returns null for pages outside the funnel", () => {
    expect(funnelStepFor("/policies/privacy")).toBeNull();
  });
});
