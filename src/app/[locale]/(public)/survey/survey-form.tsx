"use client";

/**
 * Public feedback-survey form — bilingual (AR/EN follow the [locale] route, so
 * /ar/survey is RTL Arabic and /en/survey is LTR English; the in-header
 * LanguageToggle swaps the whole form). NO auth.
 *
 * Only respondent-type + overall rating are required; everything else —
 * including all media — is optional, so respondents finish quickly. Voice and
 * video reuse the shared <VoiceRecorder> (getUserMedia/MediaRecorder) with a
 * graceful mic/camera-denied fallback (text still works). Recorded blobs and
 * uploaded files post to /api/survey/upload (private bucket) and only the
 * returned storage path travels in the final submit to /api/survey.
 *
 * Western digits everywhere (the `num` utility class + ar-SA-u-nu-latn) even in
 * Arabic, per the platform rule.
 */
import { Suspense, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { VoiceRecorder } from "@/components/shared/voice-recorder";
import {
  Star,
  GraduationCap,
  Users,
  CheckCircle2,
  Loader2,
  Mic,
  Video,
  Upload,
  X,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

type RespondentType = "STUDENT" | "PARENT";
type Improved = "YES" | "SOME" | "NO";
type MediaKind = "AUDIO" | "VIDEO";

interface UploadedMedia {
  path: string;
  kind: MediaKind;
  durationSec: number | null;
}

const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // mirror the server ceiling for a friendly pre-check

export function SurveyForm() {
  return (
    <Suspense fallback={<SurveyFormInner teacherPrefill="" />}>
      <SurveyFormWithParams />
    </Suspense>
  );
}

function SurveyFormWithParams() {
  const sp = useSearchParams();
  // Shareable, targeted teacher links: /survey?teacher=Name pre-fills the name.
  const teacherPrefill = (sp.get("teacher") || "").trim().slice(0, 120);
  return <SurveyFormInner teacherPrefill={teacherPrefill} />;
}

function SurveyFormInner({ teacherPrefill }: { teacherPrefill: string }) {
  const t = useTranslations("Survey");
  const locale = useLocale();
  const isAr = locale === "ar";

  // ── form state ──
  const [respondentType, setRespondentType] = useState<RespondentType | null>(null);
  const [teacherName, setTeacherName] = useState(teacherPrefill);
  const [studentName, setStudentName] = useState("");
  const [programOrClass, setProgramOrClass] = useState("");

  const [ratingOverall, setRatingOverall] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [commsRating, setCommsRating] = useState(0);
  const [recommendRating, setRecommendRating] = useState(0);
  const [improved, setImproved] = useState<Improved | null>(null);

  const [likedMost, setLikedMost] = useState("");
  const [improveSuggestion, setImproveSuggestion] = useState("");
  const [textTestimonial, setTextTestimonial] = useState("");

  const [voice, setVoice] = useState<UploadedMedia | null>(null);
  const [video, setVideo] = useState<UploadedMedia | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [respondentName, setRespondentName] = useState("");
  const [respondentContact, setRespondentContact] = useState("");
  const [consentTestimonial, setConsentTestimonial] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // hidden anti-spam field

  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const hasMedia = !!voice || !!video;
  const canSubmit = !!respondentType && !!teacherName.trim() && ratingOverall > 0;

  // ── media upload (shared by recorder + file picker) ──
  async function uploadBlob(blob: Blob, kind: MediaKind, durationSec: number | null) {
    const setBusy = kind === "AUDIO" ? setUploadingVoice : setUploadingVideo;
    const setMedia = kind === "AUDIO" ? setVoice : setVideo;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, kind === "AUDIO" ? "voice.webm" : "video.webm");
      fd.append("kind", kind);
      if (durationSec != null) fd.append("durationSec", String(durationSec));
      const res = await fetch("/api/survey/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || t("mediaFailed"));
        return;
      }
      setMedia({ path: data.path, kind, durationSec: data.durationSec ?? durationSec });
      toast.success(t("recordedBadge"));
    } catch {
      toast.error(t("mediaFailed"));
    } finally {
      setBusy(false);
    }
  }

  function onFilePick(kind: MediaKind, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error(t("mediaTooLarge"));
      return;
    }
    const okType =
      kind === "AUDIO" ? file.type.startsWith("audio/") : file.type.startsWith("video/");
    if (!okType) {
      toast.error(t("mediaBadType"));
      return;
    }
    void uploadBlob(file, kind, null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondentType,
          teacherName: teacherName.trim(),
          studentName: studentName.trim() || undefined,
          programOrClass: programOrClass.trim() || undefined,
          ratingOverall,
          qualityRating: qualityRating || undefined,
          commsRating: commsRating || undefined,
          recommendRating: recommendRating || undefined,
          improved: improved || undefined,
          likedMost: likedMost.trim() || undefined,
          improveSuggestion: improveSuggestion.trim() || undefined,
          textTestimonial: textTestimonial.trim() || undefined,
          voiceUrl: voice?.path,
          videoUrl: video?.path,
          respondentName: respondentName.trim() || undefined,
          respondentContact: respondentContact.trim() || undefined,
          consentTestimonial,
          consentContact,
          locale: isAr ? "ar" : "en",
          website: honeypot, // honeypot
        }),
      });
      if (res.ok) {
        setStatus("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || t("errorGeneric"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStatus("error");
    }
  }

  function resetAll() {
    setRespondentType(null);
    setTeacherName("");
    setStudentName("");
    setProgramOrClass("");
    setRatingOverall(0);
    setQualityRating(0);
    setCommsRating(0);
    setRecommendRating(0);
    setImproved(null);
    setLikedMost("");
    setImproveSuggestion("");
    setTextTestimonial("");
    setVoice(null);
    setVideo(null);
    setRespondentName("");
    setRespondentContact("");
    setConsentTestimonial(false);
    setConsentContact(false);
    setStatus("idle");
  }

  // ── thank-you ──
  if (status === "done") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-hajr-border bg-white px-6 py-12 text-center shadow-card">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-hajr-mint/40">
          <CheckCircle2 className="h-8 w-8 text-hajr-success" />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold text-hajr-navy">{t("successTitle")}</h2>
        <p className="mt-2 text-hajr-muted">{t("successBody")}</p>
        <Button variant="outline" className="mt-6" onClick={resetAll}>
          {t("successAgain")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      {/* Honeypot — visually hidden, not display:none (some bots skip those). */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0" style={{ left: "-9999px" }}>
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {/* ── Respondent type ── */}
      <Section title={t("whoTitle")} required>
        <div className="grid grid-cols-2 gap-3">
          <ChoiceCard
            active={respondentType === "STUDENT"}
            onClick={() => setRespondentType("STUDENT")}
            icon={GraduationCap}
            label={t("whoStudent")}
          />
          <ChoiceCard
            active={respondentType === "PARENT"}
            onClick={() => setRespondentType("PARENT")}
            icon={Users}
            label={t("whoParent")}
          />
        </div>
      </Section>

      {/* ── About ── */}
      <Section title={t("aboutTitle")}>
        <Field label={t("teacherLabel")} required hint={t("teacherHint")}>
          <Input
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            placeholder={t("teacherPlaceholder")}
            maxLength={120}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("studentLabel")}>
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t("studentPlaceholder")}
              maxLength={120}
            />
          </Field>
          <Field label={t("programLabel")}>
            <Input
              value={programOrClass}
              onChange={(e) => setProgramOrClass(e.target.value)}
              placeholder={t("programPlaceholder")}
              maxLength={160}
            />
          </Field>
        </div>
      </Section>

      {/* ── Ratings ── */}
      <Section title={t("ratingsTitle")}>
        <StarRow label={t("overallLabel")} required value={ratingOverall} onChange={setRatingOverall} hint={t("starsHint")} />
        <StarRow label={t("qualityLabel")} value={qualityRating} onChange={setQualityRating} />
        <StarRow label={t("commsLabel")} value={commsRating} onChange={setCommsRating} />
        <StarRow label={t("recommendLabel")} value={recommendRating} onChange={setRecommendRating} />
        <div className="pt-1">
          <span className="mb-2 block text-sm font-medium text-hajr-navy">{t("improvedLabel")}</span>
          <div className="flex flex-wrap gap-2">
            {(["YES", "SOME", "NO"] as Improved[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setImproved(improved === v ? null : v)}
                className={pill(improved === v)}
              >
                {t(v === "YES" ? "improvedYes" : v === "SOME" ? "improvedSome" : "improvedNo")}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Written ── */}
      <Section title={t("writtenTitle")}>
        <Field label={t("likedMostLabel")}>
          <Textarea
            rows={3}
            value={likedMost}
            onChange={(e) => setLikedMost(e.target.value)}
            placeholder={t("likedMostPlaceholder")}
            maxLength={2000}
            className="resize-none"
          />
        </Field>
        <Field label={t("improveLabel")}>
          <Textarea
            rows={3}
            value={improveSuggestion}
            onChange={(e) => setImproveSuggestion(e.target.value)}
            placeholder={t("improvePlaceholder")}
            maxLength={2000}
            className="resize-none"
          />
        </Field>
      </Section>

      {/* ── Rich feedback (optional) ── */}
      <Section title={t("richTitle")}>
        <p className="text-sm text-hajr-muted">{t("richIntro")}</p>
        <div className="rounded-xl bg-hajr-ivory/70 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-hajr-navy">
            <Lightbulb className="h-3.5 w-3.5 text-hajr-rose" />
            {t("tipsTitle")}
          </div>
          <ul className="space-y-1 text-xs text-hajr-muted">
            <li>• {t("tip1")}</li>
            <li>• {t("tip2")}</li>
            <li>• {t("tip3")}</li>
          </ul>
        </div>

        <Field label={t("testimonialLabel")}>
          <Textarea
            rows={3}
            value={textTestimonial}
            onChange={(e) => setTextTestimonial(e.target.value)}
            placeholder={t("testimonialPlaceholder")}
            maxLength={2000}
            className="resize-none"
          />
        </Field>

        {/* Voice */}
        <MediaBlock
          icon={Mic}
          title={t("voiceTitle")}
          cap={t("voiceCap")}
          captured={!!voice}
          capturedLabel={t("recordedBadge")}
          onRemove={() => setVoice(null)}
          removeLabel={t("removeMedia")}
        >
          {!voice && (
            <>
              <VoiceRecorder
                mode="voice"
                maxSeconds={120}
                busy={uploadingVoice}
                onCaptured={(blob, dur) => uploadBlob(blob, "AUDIO", dur)}
              />
              <UploadAlt
                label={t("uploadAudio")}
                accept="audio/*"
                busy={uploadingVoice}
                orText={t("orUpload")}
                uploadingText={t("uploading")}
                onPick={(e) => onFilePick("AUDIO", e)}
              />
            </>
          )}
        </MediaBlock>

        {/* Video */}
        <MediaBlock
          icon={Video}
          title={t("videoTitle")}
          cap={t("videoCap")}
          captured={!!video}
          capturedLabel={t("recordedBadge")}
          onRemove={() => setVideo(null)}
          removeLabel={t("removeMedia")}
        >
          {!video && (
            <>
              <VoiceRecorder
                mode="video"
                maxSeconds={90}
                busy={uploadingVideo}
                onCaptured={(blob, dur) => uploadBlob(blob, "VIDEO", dur)}
              />
              <UploadAlt
                label={t("uploadVideo")}
                accept="video/*"
                busy={uploadingVideo}
                orText={t("orUpload")}
                uploadingText={t("uploading")}
                onPick={(e) => onFilePick("VIDEO", e)}
              />
            </>
          )}
        </MediaBlock>
      </Section>

      {/* ── Consent ── */}
      <Section title={t("consentTitle")} icon={ShieldCheck}>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hajr-border bg-white p-3.5">
          <Checkbox
            checked={consentTestimonial}
            onCheckedChange={(v) => setConsentTestimonial(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed text-hajr-body">{t("consentTestimonial")}</span>
        </label>
        {hasMedia && !consentTestimonial && (
          <p className="rounded-lg bg-hajr-rose/10 px-3 py-2 text-xs text-hajr-rose">
            {t("consentMediaReminder")}
          </p>
        )}
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={consentContact}
            onCheckedChange={(v) => setConsentContact(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed text-hajr-body">{t("consentContact")}</span>
        </label>
      </Section>

      {/* ── Optional contact ── */}
      <Section title={t("contactTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("nameLabel")}>
            <Input
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={120}
            />
          </Field>
          <Field label={t("contactLabel")}>
            <Input
              value={respondentContact}
              onChange={(e) => setRespondentContact(e.target.value)}
              placeholder={t("contactPlaceholder")}
              maxLength={160}
              dir="ltr"
            />
          </Field>
        </div>
      </Section>

      {status === "error" && (
        <p className="rounded-lg bg-hajr-error/10 px-3 py-2 text-sm text-hajr-error">{errorMsg}</p>
      )}

      <Button type="submit" variant="cta" size="lg" className="w-full" disabled={!canSubmit || status === "sending"}>
        {status === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : t("submit")}
      </Button>
      <p className="pb-4 text-center text-xs text-hajr-light">{t("privacyNote")}</p>
    </form>
  );
}

// ──────────────────────── small building blocks ────────────────────────

function Section({
  title,
  required,
  icon: Icon,
  children,
}: {
  title: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-hajr-navy">
        {Icon && <Icon className="h-4 w-4 text-hajr-rose" />}
        {title}
        {required && <span className="text-hajr-rose">*</span>}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-hajr-navy">
        {label}
        {required && <span className="text-hajr-rose"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-hajr-light">{hint}</span>}
    </label>
  );
}

function ChoiceCard({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[5rem] flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold transition ${
        active
          ? "border-hajr-rose bg-hajr-rose/5 text-hajr-rose"
          : "border-hajr-border bg-white text-hajr-navy hover:border-hajr-rose/50"
      }`}
    >
      <Icon className="h-6 w-6" />
      {label}
    </button>
  );
}

/** Accessible 1–5 star row with big tap targets. */
function StarRow({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-hajr-navy">
          {label}
          {required && <span className="text-hajr-rose"> *</span>}
        </span>
        {hint && value === 0 && <span className="text-xs text-hajr-light">{hint}</span>}
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={`${n}`}
            className="rounded-md p-1 transition hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                n <= value ? "fill-hajr-rose text-hajr-rose" : "fill-transparent text-hajr-border"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function MediaBlock({
  icon: Icon,
  title,
  cap,
  captured,
  capturedLabel,
  onRemove,
  removeLabel,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  cap: string;
  captured: boolean;
  capturedLabel: string;
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hajr-border bg-hajr-surface/50 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-hajr-navy">
          <Icon className="h-4 w-4 text-hajr-rose" />
          {title}
          <span className="text-xs font-normal text-hajr-light">· {cap}</span>
        </span>
        {captured && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 rounded-md bg-hajr-mint/40 px-2 py-1 text-xs font-medium text-hajr-success"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {capturedLabel}
            <X className="h-3 w-3" />
            <span className="sr-only">{removeLabel}</span>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function UploadAlt({
  label,
  accept,
  busy,
  orText,
  uploadingText,
  onPick,
}: {
  label: string;
  accept: string;
  busy: boolean;
  orText: string;
  uploadingText: string;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-hajr-muted">
      <span>{orText}</span>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-hajr-border bg-white px-2.5 py-1.5 font-medium text-hajr-navy transition hover:border-hajr-rose/50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy ? uploadingText : label}
        <input type="file" accept={accept} className="hidden" onChange={onPick} disabled={busy} />
      </label>
    </div>
  );
}

function pill(active: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-medium transition ${
    active
      ? "border-hajr-rose bg-hajr-rose text-white"
      : "border-hajr-border bg-white text-hajr-navy hover:border-hajr-rose/50"
  }`;
}
