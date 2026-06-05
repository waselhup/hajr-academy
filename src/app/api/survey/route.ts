import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";
import { SURVEY_BUCKET } from "@/lib/survey/media";
import { createSupabaseServiceClient } from "@/lib/supabase";
import type { SurveyRespondentType, SurveyImproved, SurveyMediaKind } from "@prisma/client";

export const dynamic = "force-dynamic";

const RESPONDENT_TYPES: SurveyRespondentType[] = ["STUDENT", "PARENT"];
const IMPROVED_VALUES: SurveyImproved[] = ["YES", "SOME", "NO"];

/** Clamp an optional 1–5 rating; returns null for absent/out-of-range. */
function rating1to5(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

/** Trim + cap a free-text field; null when empty. */
function text(v: unknown, max: number): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.slice(0, max);
}

/**
 * Only accept a media path our own upload route produced: `anon/<uuid>.<ext>`.
 * This blocks a crafted body from persisting an arbitrary string as voiceUrl.
 */
const MEDIA_PATH_RE = /^anon\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/i;

/** Confirm the object actually exists in the private bucket before we keep it. */
async function mediaExists(path: string): Promise<boolean> {
  if (!MEDIA_PATH_RE.test(path)) return false;
  try {
    const supabase = createSupabaseServiceClient();
    // A short-lived signed URL only succeeds for an existing object.
    const { data, error } = await supabase.storage.from(SURVEY_BUCKET).createSignedUrl(path, 60);
    return !error && !!data?.signedUrl;
  } catch {
    return false;
  }
}

/**
 * POST /api/survey — PUBLIC feedback survey submission. NO auth.
 *
 * Required: respondentType (STUDENT|PARENT), teacherName, ratingOverall (1–5).
 * Everything else — extra ratings, written answers, testimonial, recorded
 * voice/video, respondent name/contact — is OPTIONAL so the form stays quick.
 *
 * Anti-abuse: hidden honeypot field (`website`) + light per-IP rate limit.
 * PDPL: only a short IP hash is stored; name/contact are never required.
 * Persists FeedbackSurveyResponse and notifies admins in-app (the bell).
 */
export async function POST(req: NextRequest) {
  const ip = ipFromHeaders(req.headers);
  const ipHash = shortHash(ip);

  // Light per-IP throttle on submissions.
  const rl = rateLimit(`survey-submit:${ipHash ?? "anon"}`, 8, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = await req.json();

    // Honeypot: real users never fill the hidden `website` field. Pretend
    // success so bots don't learn they were filtered.
    if (text(body.website, 200)) {
      return NextResponse.json({ ok: true });
    }

    // ── Required ──
    const respondentType = String(body.respondentType ?? "").toUpperCase() as SurveyRespondentType;
    if (!RESPONDENT_TYPES.includes(respondentType)) {
      return NextResponse.json({ error: "Please choose Student or Parent" }, { status: 400 });
    }
    const teacherName = text(body.teacherName, 120);
    if (!teacherName) {
      return NextResponse.json({ error: "Teacher name is required" }, { status: 400 });
    }
    const ratingOverall = rating1to5(body.ratingOverall);
    if (ratingOverall == null) {
      return NextResponse.json({ error: "Overall rating is required" }, { status: 400 });
    }

    // ── Optional scalars ──
    const improvedRaw = String(body.improved ?? "").toUpperCase();
    const improved: SurveyImproved | null = IMPROVED_VALUES.includes(improvedRaw as SurveyImproved)
      ? (improvedRaw as SurveyImproved)
      : null;
    const locale = body.locale === "en" ? "en" : "ar";

    // ── Optional media (validated path must exist in our bucket) ──
    const voicePathRaw = text(body.voiceUrl, 200);
    const videoPathRaw = text(body.videoUrl, 200);
    const voiceUrl = voicePathRaw && (await mediaExists(voicePathRaw)) ? voicePathRaw : null;
    const videoUrl = videoPathRaw && (await mediaExists(videoPathRaw)) ? videoPathRaw : null;
    // Video is the richer asset → it wins as the dominant kind for filtering.
    const mediaKind: SurveyMediaKind | null = videoUrl ? "VIDEO" : voiceUrl ? "AUDIO" : null;

    const created = await prisma.feedbackSurveyResponse.create({
      data: {
        respondentType,
        teacherName,
        studentName: text(body.studentName, 120),
        programOrClass: text(body.programOrClass, 160),
        ratingOverall,
        qualityRating: rating1to5(body.qualityRating),
        commsRating: rating1to5(body.commsRating),
        improved,
        recommendRating: rating1to5(body.recommendRating),
        likedMost: text(body.likedMost, 2000),
        improveSuggestion: text(body.improveSuggestion, 2000),
        textTestimonial: text(body.textTestimonial, 2000),
        voiceUrl,
        videoUrl,
        mediaKind,
        respondentName: text(body.respondentName, 120),
        respondentContact: text(body.respondentContact, 160),
        consentTestimonial: body.consentTestimonial === true,
        consentContact: body.consentContact === true,
        locale,
        ipHash,
      },
    });

    // Notify admins in the bell (the "admin notification bar"). Best-effort —
    // a notify failure must never lose the respondent's feedback.
    try {
      const stars = "★".repeat(ratingOverall);
      const who = respondentType === "PARENT" ? "Parent" : "Student";
      const whoAr = respondentType === "PARENT" ? "ولي أمر" : "طالب";
      const media = mediaKind === "VIDEO" ? " 🎥" : mediaKind === "AUDIO" ? " 🎤" : "";
      await notifyAdmins({
        type: "SYSTEM_ANNOUNCEMENT",
        channels: ["inApp"],
        title: `New feedback (${stars}) about ${teacherName}${media}`,
        titleAr: `تقييم جديد (${stars}) عن ${teacherName}${media}`,
        body: `${who} feedback — overall ${ratingOverall}/5.${created.consentTestimonial ? " Consent granted." : ""}`,
        bodyAr: `تقييم من ${whoAr} — ${ratingOverall}/5.${created.consentTestimonial ? " تم منح الموافقة." : ""}`,
        actionUrl: "/admin/feedback",
        actionLabel: "View feedback",
        actionLabelAr: "عرض التقييم",
        priority: "NORMAL",
        refType: "FeedbackSurveyResponse",
        refId: created.id,
      });
    } catch (e) {
      console.error("[api/survey] notify failed:", e);
    }

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[api/survey] failed:", e);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }
}
