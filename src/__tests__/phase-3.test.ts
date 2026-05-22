import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { deriveAttendanceStatus } from "@/lib/attendance";
import { verifyZoomWebhook, buildUrlValidationResponse } from "@/lib/video/zoom-webhook";
import { isWithinStartWindow, isWithinJoinWindow } from "@/lib/classroom";
import { rateLimit } from "@/lib/rate-limit";

describe("attendance: deriveAttendanceStatus", () => {
  const start = new Date("2026-05-20T15:00:00Z");
  const end = new Date("2026-05-20T16:00:00Z"); // 60 min

  it("never joined → ABSENT", () => {
    expect(
      deriveAttendanceStatus({ joinedAt: null, leftAt: null, sessionStart: start, sessionEnd: end })
    ).toBe("ABSENT");
  });

  it("joined on time, stayed full → PRESENT", () => {
    expect(
      deriveAttendanceStatus({
        joinedAt: new Date("2026-05-20T15:02:00Z"),
        leftAt: new Date("2026-05-20T16:00:00Z"),
        sessionStart: start,
        sessionEnd: end,
      })
    ).toBe("PRESENT");
  });

  it("joined 20 min late → LATE", () => {
    expect(
      deriveAttendanceStatus({
        joinedAt: new Date("2026-05-20T15:20:00Z"),
        leftAt: new Date("2026-05-20T16:00:00Z"),
        sessionStart: start,
        sessionEnd: end,
      })
    ).toBe("LATE");
  });

  it("joined on time but left after 10 min → ABSENT (under 50%)", () => {
    expect(
      deriveAttendanceStatus({
        joinedAt: new Date("2026-05-20T15:00:00Z"),
        leftAt: new Date("2026-05-20T15:10:00Z"),
        sessionStart: start,
        sessionEnd: end,
      })
    ).toBe("ABSENT");
  });
});

describe("zoom webhook: HMAC verification", () => {
  const secret = "test-secret-token";
  const body = JSON.stringify({ event: "meeting.started", payload: {} });
  const timestamp = "1700000000";

  it("accepts a correctly signed request", () => {
    const hash = crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex");
    expect(verifyZoomWebhook(body, `v0=${hash}`, timestamp, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const hash = crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex");
    expect(verifyZoomWebhook(body + "X", `v0=${hash}`, timestamp, secret)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyZoomWebhook(body, null, timestamp, secret)).toBe(false);
  });

  it("builds a deterministic url_validation response", () => {
    const r = buildUrlValidationResponse("abc123", secret);
    expect(r.plainToken).toBe("abc123");
    expect(r.encryptedToken).toBe(
      crypto.createHmac("sha256", secret).update("abc123").digest("hex")
    );
  });
});

describe("classroom: join/start windows", () => {
  it("teacher can start a class anytime — even hours early", () => {
    const inThreeHours = new Date(Date.now() + 3 * 3600_000);
    expect(isWithinStartWindow(inThreeHours, 60, "SCHEDULED")).toBe(true);
  });

  it("teacher cannot start an ended/cancelled session", () => {
    const now = new Date();
    expect(isWithinStartWindow(now, 60, "COMPLETED")).toBe(false);
    expect(isWithinStartWindow(now, 60, "CANCELLED")).toBe(false);
  });

  it("student can join 10 min before", () => {
    const inTen = new Date(Date.now() + 10 * 60_000);
    expect(isWithinJoinWindow(inTen, 60, "SCHEDULED")).toBe(true);
  });

  it("student can join a LIVE session that started early", () => {
    // Scheduled an hour out, but the teacher already started it.
    const inOneHour = new Date(Date.now() + 3600_000);
    expect(isWithinJoinWindow(inOneHour, 60, "LIVE")).toBe(true);
  });

  it("nobody can join a COMPLETED session", () => {
    expect(isWithinJoinWindow(new Date(), 60, "COMPLETED")).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).ok).toBe(true);
    }
    expect(rateLimit(key, 5, 60_000).ok).toBe(false);
  });
});
