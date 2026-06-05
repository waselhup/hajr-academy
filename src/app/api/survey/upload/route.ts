import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";
import { SURVEY_BUCKET, validateSurveyMedia } from "@/lib/survey/media";

export const dynamic = "force-dynamic";

/**
 * POST /api/survey/upload — upload ONE optional testimonial recording for the
 * PUBLIC feedback survey. NO auth.
 *
 * multipart/form-data:
 *   file        — the binary (required)
 *   kind        — AUDIO | VIDEO (hint; disambiguates webm/mp4 between the two)
 *   durationSec — recorded length (optional, validated against survey caps)
 *
 * Stored in the PRIVATE `survey-media` bucket under an anonymous namespace.
 * Returns ONLY the storage `path` (+ kind/mime/duration) — never a signed URL.
 * Playback is admin-only and re-signed on demand by the admin route. Magic-byte
 * + size + duration are validated here; the client mime is never trusted.
 *
 * Abuse control: light per-IP rate limit (no external captcha dependency).
 */
export async function POST(req: NextRequest) {
  // Light per-IP throttle — 20 uploads / 10 min keeps a finished form (≤2
  // recordings + re-records) comfortable while blocking bulk abuse.
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(`survey-upload:${shortHash(ip) ?? "anon"}`, 20, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const declaredKindRaw = (formData.get("kind") as string | null) ?? null;
    const durationRaw = (formData.get("durationSec") as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const declaredKind: "AUDIO" | "VIDEO" | null =
      declaredKindRaw === "AUDIO" || declaredKindRaw === "VIDEO" ? declaredKindRaw : null;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const result = validateSurveyMedia(buffer, declaredKind, file.type, file.size, durationRaw);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { detected, durationSec } = result;

    // Anonymous namespace — no user id exists for a public respondent.
    const path = `anon/${crypto.randomUUID()}.${detected.ext}`;
    const supabase = createSupabaseServiceClient();

    const { error: upErr } = await supabase.storage
      .from(SURVEY_BUCKET)
      .upload(path, buffer, { contentType: detected.mime, upsert: false });
    if (upErr) {
      console.error("[api/survey/upload] storage error:", upErr.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Intentionally NO signed URL in the response — the public never gets a
    // playback link; admins re-sign on demand after an access check.
    return NextResponse.json({
      path,
      kind: detected.kind, // "AUDIO" | "VIDEO"
      mimeType: detected.mime,
      durationSec,
    });
  } catch (e) {
    console.error("[api/survey/upload] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
