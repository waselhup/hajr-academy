"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, RotateCcw, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Exercise {
  id: string;
  type: string;
  level: string;
  title: string;
  titleAr: string;
  description: string | null;
  descriptionAr: string | null;
  content: any;
  pointsValue: number;
}
interface Attempt {
  id: string;
  status: string;
  submission: any;
  score: number | null;
  aiEvaluation: any;
}

/**
 * The unified exercise player. Dispatches to a type-specific UI:
 * - READING/GRAMMAR/VOCABULARY/LISTENING → multiple-choice questions
 * - WRITING → textarea with word counter
 * - SPEAKING → audio recorder (records to webm via MediaRecorder)
 */
export function ExercisePlayer({
  exercise,
  latestAttempt,
}: {
  exercise: Exercise;
  latestAttempt: Attempt | null;
}) {
  const t = useTranslations("Lab");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const alreadyDone = latestAttempt?.status === "COMPLETED";
  const [result, setResult] = useState<any>(
    alreadyDone
      ? { score: latestAttempt!.score, aiEvaluation: latestAttempt!.aiEvaluation }
      : null
  );
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  // MC answers state.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Writing state.
  const [writingText, setWritingText] = useState("");
  // Speaking state.
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const content = exercise.content ?? {};

  // ─── Submission ────────────────────────────────────────────────
  const submit = useCallback(
    async (submission: object) => {
      setSubmitting(true);
      try {
        // Start (or resume) an attempt.
        const startRes = await fetch("/api/lab/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId: exercise.id }),
        });
        if (!startRes.ok) throw new Error("start failed");
        const { attempt } = await startRes.json();

        const timeSpentSec = Math.round(
          (Date.now() - startedAtRef.current) / 1000
        );
        const res = await fetch(`/api/lab/attempts/${attempt.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission, timeSpentSec }),
        });
        if (!res.ok) throw new Error("submit failed");
        const data = await res.json();
        setResult(data);
      } catch {
        setResult({ error: true });
      } finally {
        setSubmitting(false);
      }
    },
    [exercise.id]
  );

  // ─── Speaking: recording ───────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((tr) => tr.stop());
        // Upload immediately.
        const fd = new FormData();
        fd.append("file", blob, "recording.webm");
        try {
          const up = await fetch("/api/lab/upload-audio", {
            method: "POST",
            body: fd,
          });
          if (up.ok) {
            const { path } = await up.json();
            setAudioPath(path);
          }
        } catch {
          /* upload error surfaced on submit */
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert(t("uploadFailed"));
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  // ─── Results panel ─────────────────────────────────────────────
  if (result && !result.error) {
    return (
      <ResultsPanel
        result={result}
        exercise={exercise}
        onTryAgain={() => {
          setResult(null);
          setAnswers({});
          setWritingText("");
          setAudioUrl(null);
          setAudioPath(null);
          startedAtRef.current = Date.now();
        }}
      />
    );
  }

  const heading = isAr ? exercise.titleAr : exercise.title;

  // ─── Type-specific players ─────────────────────────────────────
  const isMc = ["READING", "GRAMMAR", "VOCABULARY", "LISTENING"].includes(
    exercise.type
  );
  const questions: any[] = Array.isArray(content.questions)
    ? content.questions
    : Array.isArray(content.items)
    ? content.items
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{heading}</h1>
          <Badge variant="info" className="num mt-1">{exercise.level}</Badge>
        </div>
        <Badge variant="outline" className="num">
          +{exercise.pointsValue} {t("points")}
        </Badge>
      </div>

      {result?.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            {t("uploadFailed")}
          </CardContent>
        </Card>
      )}

      {/* READING: passage */}
      {exercise.type === "READING" && content.text && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("passage")}</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-line text-sm leading-relaxed">
            {content.text}
          </CardContent>
        </Card>
      )}

      {/* LISTENING: transcript hint */}
      {exercise.type === "LISTENING" && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("listenFirst")}
            {content.audioUrl && (
              <audio controls className="mt-2 w-full" src={content.audioUrl} />
            )}
          </CardContent>
        </Card>
      )}

      {/* WRITING */}
      {exercise.type === "WRITING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{content.prompt ?? heading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={10}
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              placeholder={t("yourText")}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="num">
                {writingText.trim().split(/\s+/).filter(Boolean).length}{" "}
                {t("wordCount")}
              </span>
              {content.minWords && (
                <span className="num">
                  {t("minWords")}: {content.minWords}
                </span>
              )}
            </div>
            <Button
              onClick={() => submit({ text: writingText })}
              disabled={submitting || writingText.trim().length < 5}
              className="w-full bg-hajr-deep-navy text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("evaluating")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SPEAKING */}
      {exercise.type === "SPEAKING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{content.prompt ?? heading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.modelAudio && (
              <audio controls className="w-full" src={content.modelAudio} />
            )}
            <div className="flex flex-col items-center gap-3 py-4">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-hajr-deep-navy text-white transition-transform hover:scale-105"
                  aria-label={t("record")}
                >
                  <Mic className="h-8 w-8" />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-red-600 text-white"
                  aria-label={t("stopRecording")}
                >
                  <Square className="h-7 w-7" />
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {recording ? t("stopRecording") : t("record")}
              </span>
            </div>
            {audioUrl && (
              <div className="space-y-2">
                <audio controls className="w-full" src={audioUrl} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAudioUrl(null);
                      setAudioPath(null);
                    }}
                  >
                    <RotateCcw className="me-2 h-4 w-4" />
                    {t("rerecord")}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-hajr-deep-navy text-white"
                    disabled={submitting || !audioPath}
                    onClick={() =>
                      submit({
                        audioPath,
                        // No client-side transcription; server evaluator
                        // handles the (empty) transcript gracefully.
                        transcript: "",
                      })
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        {t("evaluating")}
                      </>
                    ) : (
                      t("submit")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MULTIPLE-CHOICE (reading / grammar / vocabulary / listening) */}
      {isMc && (
        <>
          {content.instructions && (
            <p className="text-sm text-muted-foreground">{content.instructions}</p>
          )}
          {questions.map((q: any, i: number) => (
            <Card key={q.id ?? i}>
              <CardContent className="space-y-2 p-4">
                <div className="text-sm font-medium">
                  <span className="num">{i + 1}.</span>{" "}
                  {q.question ?? q.text}
                </div>
                <div className="space-y-1.5">
                  {(q.options ?? []).map((opt: any) => {
                    const oid = String(opt.id);
                    const selected = answers[String(q.id ?? i)] === oid;
                    return (
                      <button
                        key={oid}
                        onClick={() =>
                          setAnswers((a) => ({
                            ...a,
                            [String(q.id ?? i)]: oid,
                          }))
                        }
                        className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-start text-sm transition-colors ${
                          selected
                            ? "border-brand-rose bg-hajr-deep-navy/10"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                            selected
                              ? "border-brand-rose bg-hajr-deep-navy text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {oid.toUpperCase()}
                        </span>
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            onClick={() => submit({ answers })}
            disabled={
              submitting || Object.keys(answers).length < questions.length
            }
            className="w-full bg-hajr-deep-navy text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </>
      )}
    </div>
  );
}

/** Post-submission results panel — shows score and AI feedback. */
function ResultsPanel({
  result,
  exercise,
  onTryAgain,
}: {
  result: any;
  exercise: Exercise;
  onTryAgain: () => void;
}) {
  const t = useTranslations("Lab");
  const router = useRouter();
  const locale = useLocale();
  const score = result.score ?? 0;
  const ev = result.aiEvaluation ?? {};
  const passed = score >= 60;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className={passed ? "border-brand-mint" : "border-amber-200"}>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          {passed ? (
            <CheckCircle2 className="h-12 w-12 text-brand-mint" />
          ) : (
            <XCircle className="h-12 w-12 text-amber-500" />
          )}
          <div className="text-4xl font-bold num">{Math.round(score)}%</div>
          <div className="text-sm text-muted-foreground">{t("score")}</div>
          {result.skill?.levelChanged && (
            <Badge variant="success" className="mt-1">
              {t("level")}: {result.skill.level}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* AI feedback (writing / speaking) */}
      {ev.feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("feedback")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{locale === "ar" ? ev.feedback : ev.feedbackEn ?? ev.feedback}</p>
            {ev.needsManualReview && (
              <Badge variant="warning">{t("manualReviewPending")}</Badge>
            )}
            {Array.isArray(ev.suggestions) && ev.suggestions.length > 0 && (
              <div>
                <div className="mb-1 font-medium">{t("suggestions")}</div>
                <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
                  {ev.suggestions.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {ev.correctedText && (
              <div>
                <div className="mb-1 font-medium">{t("correctedText")}</div>
                <p className="rounded-lg bg-brand-mint/20 p-3 whitespace-pre-line">
                  {ev.correctedText}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MC breakdown */}
      {ev.breakdown?.perQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("questions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {ev.breakdown.perQuestion.map((pq: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span className="num">
                  {t("questions")} {i + 1}
                </span>
                {pq.isCorrect ? (
                  <Badge variant="success">{t("correct")}</Badge>
                ) : (
                  <Badge variant="warning">{t("incorrect")}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onTryAgain}>
          <RotateCcw className="me-2 h-4 w-4" />
          {t("tryAgain")}
        </Button>
        <Button
          className="flex-1 bg-brand-navy text-white"
          onClick={() => router.push(`/${locale}/student/lab`)}
        >
          {t("title")}
        </Button>
      </div>
    </div>
  );
}
