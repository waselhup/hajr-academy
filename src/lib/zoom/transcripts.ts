/**
 * Best-effort transcript fetching from Zoom Cloud Recordings.
 *
 * Zoom Cloud Recording must be enabled on the account, and the
 * Server-to-Server OAuth app must include the
 *   cloud_recording:read:list_recording_files:admin scope.
 *
 * When the transcript isn't available we return null so the caller
 * can fall back to teacher notes — never throws.
 */
const ZOOM_API_DEFAULT = "https://api.zoom.us";
const ZOOM_OAUTH = "https://zoom.us/oauth/token";

let tokenCache: { token: string; apiBase: string; expiresAt: number } | null = null;

async function getToken(): Promise<{ token: string; apiBase: string } | null> {
  const accountId = (process.env.ZOOM_ACCOUNT_ID ?? "").trim();
  const clientId = (process.env.ZOOM_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.ZOOM_CLIENT_SECRET ?? "").trim();
  if (!accountId || !clientId || !clientSecret) return null;

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60_000) {
    return { token: tokenCache.token, apiBase: tokenCache.apiBase };
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `${ZOOM_OAUTH}?grant_type=account_credentials&account_id=${accountId}`,
    { method: "POST", headers: { Authorization: `Basic ${basic}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    api_url?: string;
  };
  const apiBase = (data.api_url ?? ZOOM_API_DEFAULT).replace(/\/+$/, "");
  tokenCache = {
    token: data.access_token,
    apiBase,
    expiresAt: now + data.expires_in * 1000,
  };
  return { token: data.access_token, apiBase };
}

type RecordingFile = {
  id?: string;
  recording_type?: string;
  file_type?: string;
  download_url?: string;
  play_url?: string;
};

/**
 * Fetch the transcript text for a given Zoom meeting id.
 * Returns null if Zoom isn't configured, transcript wasn't available,
 * or any network/auth error occurred.
 */
export async function fetchZoomTranscript(meetingId: string): Promise<string | null> {
  try {
    const t = await getToken();
    if (!t) return null;

    // 1) Get the recording metadata.
    const listRes = await fetch(
      `${t.apiBase}/v2/meetings/${encodeURIComponent(meetingId)}/recordings`,
      { headers: { Authorization: `Bearer ${t.token}` } }
    );
    if (!listRes.ok) return null;
    const meta = (await listRes.json()) as { recording_files?: RecordingFile[] };
    const files = meta.recording_files ?? [];

    // Prefer TRANSCRIPT file_type, fall back to CC.
    const transcriptFile =
      files.find((f) => f.file_type === "TRANSCRIPT") ??
      files.find((f) => f.recording_type === "audio_transcript") ??
      files.find((f) => f.file_type === "CC");
    if (!transcriptFile?.download_url) return null;

    // 2) Download the transcript (VTT format).
    const dl = await fetch(transcriptFile.download_url, {
      headers: { Authorization: `Bearer ${t.token}` },
    });
    if (!dl.ok) return null;
    const vtt = await dl.text();
    return vttToPlainText(vtt);
  } catch (e) {
    console.error("[zoom/transcripts] fetch failed:", e);
    return null;
  }
}

/**
 * Strip WEBVTT framing and merge into a single readable transcript.
 */
function vttToPlainText(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];
  let prevSpeaker = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "WEBVTT") continue;
    if (/^\d+$/.test(line)) continue;
    if (/-->/.test(line)) continue;
    // "Speaker: text" form — group runs.
    const m = line.match(/^([\w .,'-]+):\s*(.+)$/);
    if (m) {
      if (m[1] !== prevSpeaker) {
        out.push(`\n${m[1]}: ${m[2]}`);
        prevSpeaker = m[1];
      } else {
        out.push(m[2]);
      }
    } else {
      out.push(line);
    }
  }
  return out.join(" ").replace(/\s+/g, " ").trim().slice(0, 50_000);
}
