import jwt from "jsonwebtoken";
import type {
  VideoProvider,
  CreateMeetingOpts,
  MeetingResult,
  SignatureOpts,
  SignatureResult,
  RecordingResult,
} from "./types";

// Default API base. Newer / regional Zoom accounts return their own
// `api_url` in the OAuth token response (e.g. https://api-us.zoom.us);
// when present that value is used instead of this default.
const ZOOM_API_DEFAULT = "https://api.zoom.us";
const ZOOM_OAUTH = "https://zoom.us/oauth/token";

/**
 * Zoom implementation of VideoProvider.
 *
 * Two Zoom apps are used:
 *  - Server-to-Server OAuth ("Backend") → REST API: create/update/delete meetings.
 *  - Meeting SDK ("Web Classroom")      → HMAC signatures for the in-browser embed.
 *
 * The S2S OAuth access token (valid 1h) is cached in module memory and
 * refreshed automatically ~5 min before expiry.
 */
export class ZoomProvider implements VideoProvider {
  // .trim() defends against the #1 cause of OAuth failures: an env var
  // pasted into the dashboard with a trailing space or newline.
  private accountId = (process.env.ZOOM_ACCOUNT_ID ?? "").trim();
  private clientId = (process.env.ZOOM_CLIENT_ID ?? "").trim();
  private clientSecret = (process.env.ZOOM_CLIENT_SECRET ?? "").trim();
  private sdkKey = (process.env.ZOOM_SDK_KEY ?? "").trim();
  private sdkSecret = (process.env.ZOOM_SDK_SECRET ?? "").trim();

  private tokenCache: { token: string; expiresAt: number } | null = null;
  // The API base for this account. Defaults to api.zoom.us but is
  // overwritten with the `api_url` Zoom returns in the token response
  // (regional accounts use api-us.zoom.us, api-eu.zoom.us, etc.).
  private apiBase = ZOOM_API_DEFAULT;

  // ─────────────────────── OAuth token ───────────────────────
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 5 * 60_000) {
      return this.tokenCache.token;
    }
    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new Error("ZOOM_NOT_CONFIGURED");
    }
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await fetch(
      `${ZOOM_OAUTH}?grant_type=account_credentials&account_id=${this.accountId}`,
      { method: "POST", headers: { Authorization: `Basic ${basic}` } }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ZOOM_OAUTH_FAILED: ${res.status} ${body}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      api_url?: string;
    };
    // Zoom tells us the correct regional API host — honour it.
    if (data.api_url) {
      this.apiBase = data.api_url.replace(/\/+$/, "");
    }
    this.tokenCache = {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return data.access_token;
  }

  private async api<T>(
    path: string,
    init: RequestInit & { okStatuses?: number[] } = {}
  ): Promise<T> {
    // getAccessToken() also resolves this.apiBase from Zoom's api_url,
    // so it must run before the request URL is built.
    const token = await this.getAccessToken();
    const res = await fetch(`${this.apiBase}/v2${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const okStatuses = init.okStatuses ?? [200, 201, 204];
    if (!okStatuses.includes(res.status)) {
      const body = await res.text();
      throw new Error(`ZOOM_API_ERROR ${init.method ?? "GET"} ${path}: ${res.status} ${body}`);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // ─────────────────────── Meetings ───────────────────────
  async createMeeting(opts: CreateMeetingOpts): Promise<MeetingResult> {
    const body = {
      topic: opts.topic,
      type: 2, // scheduled meeting
      start_time: opts.scheduledFor.toISOString(),
      duration: opts.durationMinutes,
      timezone: "Asia/Riyadh",
      password: opts.password,
      settings: {
        // Enrolled students must be able to enter without being blocked
        // by host-join timing or a waiting room — access is already
        // gated by our own enrollment check in /api/zoom/signature.
        join_before_host: true,
        waiting_room: false,
        jbh_time: 0, // allow joining any time before the host
        mute_upon_entry: true,
        approval_type: 2, // no registration required
        meeting_authentication: false,
        auto_recording: opts.autoRecording ? "cloud" : "none",
        host_video: true,
        participant_video: false,
      },
    };
    const data = await this.api<{
      id: number;
      join_url: string;
      password: string;
      start_url: string;
    }>(`/users/${encodeURIComponent(opts.hostEmail)}/meetings`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      meetingId: String(data.id),
      joinUrl: data.join_url,
      password: data.password,
      startUrlForHost: data.start_url,
    };
  }

  async updateMeeting(meetingId: string, opts: Partial<CreateMeetingOpts>): Promise<void> {
    const body: Record<string, unknown> = {};
    if (opts.topic) body.topic = opts.topic;
    if (opts.scheduledFor) body.start_time = opts.scheduledFor.toISOString();
    if (opts.durationMinutes) body.duration = opts.durationMinutes;
    await this.api(`/meetings/${meetingId}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  /**
   * Re-apply join settings to an existing meeting so enrolled students
   * are never blocked by host-join timing or a waiting room. Patches
   * only the `settings` object — leaves topic/time untouched.
   */
  async ensureJoinableSettings(meetingId: string): Promise<void> {
    await this.api(`/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        settings: {
          join_before_host: true,
          waiting_room: false,
          jbh_time: 0,
          approval_type: 2,
          meeting_authentication: false,
        },
      }),
      okStatuses: [204, 404],
    });
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    await this.api(`/meetings/${meetingId}`, { method: "DELETE", okStatuses: [204, 404] });
  }

  /**
   * GET /meetings/{id} returns a fresh start_url for the host. The token
   * embedded in that URL is short-lived, so we always fetch live — never
   * cache.
   */
  async getMeetingStartUrl(meetingId: string): Promise<string | null> {
    try {
      const data = await this.api<{ start_url?: string }>(
        `/meetings/${meetingId}`,
        { okStatuses: [200, 404] }
      );
      return data?.start_url ?? null;
    } catch {
      return null;
    }
  }

  async endMeeting(meetingId: string): Promise<void> {
    await this.api(`/meetings/${meetingId}/status`, {
      method: "PUT",
      body: JSON.stringify({ action: "end" }),
      okStatuses: [204, 400, 404],
    });
  }

  // ─────────────────────── SDK signature ───────────────────────
  /**
   * Generate a Zoom Meeting SDK join signature.
   *
   * For @zoom/meetingsdk 6.x the JWT payload must contain EXACTLY these
   * claims — `sdkKey`, `mn`, `role`, `iat`, `exp`, `tokenExp` — signed
   * HS256 with the Meeting SDK app's Client Secret. Any extra claim
   * (e.g. the legacy `appKey`) makes Zoom reject it as "Signature is
   * invalid". `exp` must be 1800–172800s after `iat`, and `tokenExp`
   * must be >= `exp`.
   */
  async generateJoinSignature(opts: SignatureOpts): Promise<SignatureResult> {
    if (!this.sdkKey || !this.sdkSecret) throw new Error("ZOOM_SDK_NOT_CONFIGURED");

    const iat = Math.floor(Date.now() / 1000) - 30;
    // Clamp the lifetime to Zoom's allowed window (30 min – 48 h).
    const requested = opts.expirationSeconds ?? 2 * 60 * 60;
    const lifetime = Math.min(48 * 60 * 60, Math.max(30 * 60, requested));
    const exp = iat + lifetime;
    const roleNum = opts.role === "host" ? 1 : 0;

    // The meeting number must be a clean digit string (no spaces/dashes).
    const mn = String(opts.meetingNumber).replace(/\D/g, "");

    const payload = {
      sdkKey: this.sdkKey,
      mn,
      role: roleNum,
      iat,
      exp,
      tokenExp: exp,
    };

    const signature = jwt.sign(payload, this.sdkSecret, {
      algorithm: "HS256",
      header: { alg: "HS256", typ: "JWT" },
    });
    return { signature, sdkKey: this.sdkKey };
  }

  // ─────────────────────── Recordings ───────────────────────
  async getMeetingRecording(meetingId: string): Promise<RecordingResult | null> {
    try {
      // 400 is tolerated too: if the S2S app lacks the recording-read scope
      // we degrade gracefully (no recording) instead of throwing.
      const data = await this.api<{
        share_url?: string;
        password?: string;
        recording_files?: { play_url?: string; download_url?: string }[];
      }>(`/meetings/${meetingId}/recordings`, { okStatuses: [200, 400, 404] });
      if (!data) return null;
      const file = data.recording_files?.find((f) => f.play_url);
      const url = data.share_url ?? file?.play_url ?? file?.download_url;
      if (!url) return null;
      return { url, passcode: data.password };
    } catch {
      return null;
    }
  }

  // ─────────────────────── Live participants ───────────────────────
  async getLiveParticipantCount(meetingId: string): Promise<number | null> {
    try {
      // 400 tolerated (missing dashboard/metrics scope) → return null.
      const data = await this.api<{ participants?: unknown[] }>(
        `/metrics/meetings/${meetingId}/participants?type=live&page_size=300`,
        { okStatuses: [200, 400, 404] }
      );
      if (!data?.participants) return null;
      return data.participants.length;
    } catch {
      return null;
    }
  }
}
