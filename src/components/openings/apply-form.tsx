"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeField } from "@/components/ui/western-fields";
import { Mic, Square, RotateCcw, Loader2, Info, Clock } from "lucide-react";

export interface ApplyQuestion {
  id: string;
  kind: "long" | "short" | "gmt3";
  label: string;
  hint?: string;
  required: boolean;
}

/** Day order used by the GMT+3 availability picker (mirrors the class form). */
const AVAIL_DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

interface Props {
  openingId: string;
  locale: string;
  questions: ApplyQuestion[];
  maxSeconds: number;
}

/**
 * The teacher apply-to-teach form: "why qualified" + the creative survey
 * (resolved labels passed in) + an OPTIONAL 1-minute voice intro recorded
 * with the browser MediaRecorder API. Voice is genuinely optional: if the
 * mic is denied or unsupported we show an inline note and never block submit.
 */
export function ApplyForm({ openingId, locale, questions, maxSeconds }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const isAr = locale === "ar";
  const [pending, startTransition] = useTransition();

  const [whyQualified, setWhyQualified] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Voice recorder state.
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearTimer();
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, [clearTimer]);

  // Cleanup on unmount: stop any live tracks/timers and revoke object URLs.
  useEffect(() => {
    return () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    setVoiceError(false);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceError(true);
      return;
    }
    try {
      // Drop any previous take.
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      blobRef.current = null;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setElapsed(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxSeconds) {
            stopRecording();
            return maxSeconds;
          }
          return next;
        });
      }, 1000);
    } catch {
      // Mic denied / unavailable — voice is optional, surface a gentle note.
      setVoiceError(true);
      setRecording(false);
    }
  }, [audioUrl, maxSeconds, stopRecording]);

  const reRecord = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setElapsed(0);
  }, [audioUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (whyQualified.trim().length < 10) {
      toast.error(t("Openings.whyTooShort"));
      return;
    }
    // Required survey questions must be filled.
    for (const q of questions) {
      if (q.required && !(answers[q.id] ?? "").trim()) {
        toast.error(t("Openings.requiredMissing"));
        return;
      }
    }

    startTransition(async () => {
      try {
        // 1) Upload the optional voice intro first (if any).
        let voicePath: string | null = null;
        if (blobRef.current) {
          const fd = new FormData();
          fd.append("file", blobRef.current, "voice-intro.webm");
          const up = await fetch("/api/teacher/application-voice", {
            method: "POST",
            body: fd,
          });
          if (up.ok) {
            const data = await up.json().catch(() => ({}));
            voicePath = data.path ?? null;
          } else {
            // Non-fatal: continue without the voice intro.
            toast.error(t("Openings.voiceUploadFailed"));
          }
        }

        // 2) Submit the application.
        const res = await fetch("/api/teacher/applications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            openingId,
            whyQualified: whyQualified.trim(),
            answers,
            voicePath,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
          toast.success(t("Openings.submitSuccess"));
          router.push(`/${locale}/teacher/openings`);
          router.refresh();
          return;
        }

        if (res.status === 409 || data.error === "ALREADY_APPLIED") {
          toast.error(t("Openings.alreadyApplied"));
        } else if (data.error === "OPENING_NOT_OPEN") {
          toast.error(t("Openings.openingNotOpen"));
        } else if (data.error === "WHY_TOO_SHORT") {
          toast.error(t("Openings.whyTooShort"));
        } else {
          toast.error(t("Openings.submitError"));
        }
      } catch {
        toast.error(t("Openings.submitError"));
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      dir={isAr ? "rtl" : "ltr"}
      className="space-y-5"
    >
      {/* Why qualified */}
      <div className="space-y-1.5">
        <Label htmlFor="why-qualified">
          {t("Openings.whyQualified")} <span className="text-hajr-rose">*</span>
        </Label>
        <Textarea
          id="why-qualified"
          rows={5}
          required
          value={whyQualified}
          onChange={(e) => setWhyQualified(e.target.value)}
          placeholder={t("Openings.whyQualifiedHint")}
        />
        <p className="text-xs text-muted-foreground">
          {t("Openings.whyQualifiedHint")}
        </p>
      </div>

      {/* Survey questions */}
      {questions.map((q) => {
        // Structured, timezone-explicit availability picker (own card so the
        // GMT+3 label + day/time controls read clearly). Optional by design.
        if (q.kind === "gmt3") {
          return (
            <GmtAvailabilityField
              key={q.id}
              label={q.label}
              hint={q.hint}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            />
          );
        }
        return (
          <div key={q.id} className="space-y-1.5">
            <Label htmlFor={`q-${q.id}`}>
              {q.label}
              {q.required && <span className="text-hajr-rose"> *</span>}
            </Label>
            {q.kind === "long" ? (
              <Textarea
                id={`q-${q.id}`}
                rows={4}
                required={q.required}
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
                placeholder={q.hint}
              />
            ) : (
              <Input
                id={`q-${q.id}`}
                required={q.required}
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
                placeholder={q.hint}
              />
            )}
            {q.hint && (
              <p className="text-xs text-muted-foreground">{q.hint}</p>
            )}
          </div>
        );
      })}

      {/* Voice intro (optional) */}
      <Card className="border-hajr-rose/30 bg-hajr-rose/5">
        <CardContent className="space-y-3 p-4">
          <div>
            <div className="text-sm font-semibold text-hajr-deep-navy">
              {t("Openings.voiceIntroTitle")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Openings.recordingHint")}
            </p>
          </div>

          {voiceError ? (
            <div className="flex items-start gap-2 rounded-md border border-hajr-border bg-white p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-hajr-rose" />
              <span>{t("Openings.micDenied")} {t("Openings.voiceOptional")}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              {!recording ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startRecording}
                  disabled={pending}
                >
                  <Mic className="me-2 h-4 w-4" />
                  {audioUrl
                    ? t("Openings.reRecord")
                    : t("Openings.startRecording")}
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={stopRecording}
                  >
                    <Square className="me-2 h-4 w-4" />
                    {t("Openings.stopRecording")}
                  </Button>
                  <span className="num text-xs font-medium text-hajr-rose">
                    {t("Openings.recordingSeconds", {
                      elapsed,
                      max: maxSeconds,
                    })}
                  </span>
                </div>
              )}

              {audioUrl && !recording && (
                <div className="w-full space-y-2">
                  <audio controls className="w-full" src={audioUrl}>
                    {t("Openings.playback")}
                  </audio>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={reRecord}
                    disabled={pending}
                  >
                    <RotateCcw className="me-2 h-4 w-4" />
                    {t("Openings.reRecord")}
                  </Button>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t("Openings.voiceOptional")}
          </p>
        </CardContent>
      </Card>

      <Button
        type="submit"
        variant="cta"
        className="w-full min-h-[44px]"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {t("Openings.submitting")}
          </>
        ) : (
          t("Openings.submit")
        )}
      </Button>
    </form>
  );
}

/**
 * Structured GMT+3 availability picker. Teachers tick the days they're free and
 * give a from–to time (24-hour, Western digits via TimeField), plus an optional
 * note. It serialises everything into ONE clean string that flows into the
 * application's answersJson, so the admin review + the teacher's own read-only
 * view render it like any other answer — no schema change, no extra plumbing.
 * Entirely OPTIONAL: an empty picker emits "" and never blocks submit.
 */
function GmtAvailabilityField({
  label,
  hint,
  onChange,
}: {
  label: string;
  hint?: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations();
  const [days, setDays] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");

  // Re-serialise whenever any part changes. Kept human-readable and explicitly
  // timezone-tagged so there is zero ambiguity for the admin reading it later.
  const serialise = useCallback(
    (nextDays: string[], nextFrom: string, nextTo: string, nextNote: string) => {
      const dayNames = AVAIL_DAYS.filter((d) => nextDays.includes(d)).map((d) =>
        t(`Days.${d}` as never)
      );
      const parts: string[] = [];
      if (dayNames.length) parts.push(dayNames.join(", "));
      if (nextFrom && nextTo) parts.push(`${nextFrom}–${nextTo}`);
      else if (nextFrom) parts.push(`${t("Openings.availFrom")} ${nextFrom}`);
      else if (nextTo) parts.push(`${t("Openings.availTo")} ${nextTo}`);
      const trimmedNote = nextNote.trim();
      if (trimmedNote) parts.push(trimmedNote);
      // Only tag with the timezone when the teacher actually entered something.
      if (parts.length === 0) return "";
      return `${parts.join(" · ")} (${t("Openings.gmt3Label")})`;
    },
    [t]
  );

  const update = (
    next: Partial<{ days: string[]; from: string; to: string; note: string }>
  ) => {
    const d = next.days ?? days;
    const f = next.from ?? from;
    const tt = next.to ?? to;
    const n = next.note ?? note;
    if (next.days) setDays(d);
    if (next.from !== undefined) setFrom(f);
    if (next.to !== undefined) setTo(tt);
    if (next.note !== undefined) setNote(n);
    onChange(serialise(d, f, tt, n));
  };

  const toggleDay = (d: string) =>
    update({ days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] });

  return (
    <Card className="border-hajr-rose/30 bg-hajr-rose/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-hajr-deep-navy">{label}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t("Openings.gmt3Label")}
            </span>
          </div>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>

        {/* Days */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground">
            {t("Openings.availDays")}
          </Label>
          <div className="flex flex-wrap gap-3">
            {AVAIL_DAYS.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={days.includes(d)}
                  onCheckedChange={() => toggleDay(d)}
                />
                {t(`Days.${d}` as never)}
              </label>
            ))}
          </div>
        </div>

        {/* From / To time (24-hour, Western digits) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="avail-from" className="text-xs uppercase text-muted-foreground">
              {t("Openings.availFrom")}
            </Label>
            <TimeField
              id="avail-from"
              value={from}
              onChange={(e) => update({ from: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avail-to" className="text-xs uppercase text-muted-foreground">
              {t("Openings.availTo")}
            </Label>
            <TimeField
              id="avail-to"
              value={to}
              onChange={(e) => update({ to: e.target.value })}
            />
          </div>
        </div>

        {/* Optional free note */}
        <div className="space-y-1.5">
          <Label htmlFor="avail-note" className="text-xs uppercase text-muted-foreground">
            {t("Openings.availNote")}
          </Label>
          <Input
            id="avail-note"
            value={note}
            onChange={(e) => update({ note: e.target.value })}
            placeholder={t("Openings.availNoteHint")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
