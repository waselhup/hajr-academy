"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Item = {
  id: string;
  type: string;
  contentUrl: string | null;
  contentHtml: string | null;
  exerciseData: unknown;
};

type ExerciseQ = {
  id: string;
  prompt: string;
  promptAr?: string;
  options: string[];
  correctIndex: number;
};

async function postProgress(itemId: string, pct: number, timeDeltaSec: number) {
  try {
    await fetch("/api/library/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryItemId: itemId, progressPct: pct, timeDeltaSec }),
      keepalive: true,
    });
  } catch {}
}

export function LibraryItemViewer({
  item,
  initialProgress,
}: {
  item: Item;
  initialProgress: number;
}) {
  const t = useTranslations("Library");
  const [progress, setProgress] = useState(initialProgress);
  const startedAt = useRef<number>(Date.now());
  const lastTick = useRef<number>(Date.now());
  const lastReportedPct = useRef<number>(initialProgress);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial "opened" beacon
  useEffect(() => {
    postProgress(item.id, Math.max(1, initialProgress), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 30-second time-only beacon
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTick.current) / 1000);
      lastTick.current = now;
      if (delta > 0) postProgress(item.id, lastReportedPct.current, delta);
    }, 30_000);
    return () => clearInterval(id);
  }, [item.id]);

  // beforeunload final flush
  useEffect(() => {
    const onHide = () => {
      const delta = Math.floor((Date.now() - lastTick.current) / 1000);
      if (delta > 0) postProgress(item.id, lastReportedPct.current, delta);
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") onHide();
    });
    return () => window.removeEventListener("beforeunload", onHide);
  }, [item.id]);

  function reportPct(pct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (clamped <= lastReportedPct.current) return;
    lastReportedPct.current = clamped;
    setProgress(clamped);
    const now = Date.now();
    const delta = Math.floor((now - lastTick.current) / 1000);
    lastTick.current = now;
    postProgress(item.id, clamped, delta);
  }

  // ARTICLE — scroll depth tracking
  useEffect(() => {
    if (item.type !== "ARTICLE") return;
    const el = articleRef.current;
    if (!el) return;
    const handler = () => {
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) return reportPct(100);
      const scrolled = window.scrollY - (el.offsetTop - 100);
      const pct = (scrolled / total) * 100;
      if (pct > lastReportedPct.current) reportPct(pct);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [item.type]);

  // VIDEO / AUDIO — timeupdate %
  useEffect(() => {
    const v = item.type === "VIDEO" ? videoRef.current : audioRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.duration > 0) {
        const pct = (v.currentTime / v.duration) * 100;
        if (pct > lastReportedPct.current) reportPct(pct);
      }
    };
    const onEnd = () => reportPct(100);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, [item.type]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between text-xs text-hajr-gray-500">
            <span>{t("readingProgress")}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {item.type === "ARTICLE" && (
        <Card>
          <CardContent className="p-6">
            <div
              ref={articleRef}
              className="prose prose-slate max-w-none rtl:prose-headings:text-end"
              dangerouslySetInnerHTML={{ __html: item.contentHtml || "" }}
            />
            {!item.contentHtml && (
              <p className="text-hajr-gray-500">{t("articleEmpty")}</p>
            )}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => reportPct(100)}
                className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
              >
                {t("markComplete")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {item.type === "VIDEO" && (
        <Card>
          <CardContent className="p-4">
            {item.contentUrl ? (
              <video
                ref={videoRef}
                controls
                className="w-full rounded-md"
                src={item.contentUrl}
              />
            ) : (
              <p className="text-hajr-gray-500">{t("contentMissing")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {item.type === "AUDIO" && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {item.contentUrl ? (
              <audio ref={audioRef} controls className="w-full" src={item.contentUrl} />
            ) : (
              <p className="text-hajr-gray-500">{t("contentMissing")}</p>
            )}
            {item.contentHtml && (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: item.contentHtml }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {item.type === "PDF" && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {item.contentUrl ? (
              <>
                <iframe
                  title="PDF"
                  src={item.contentUrl}
                  className="h-[70vh] w-full rounded-md border border-hajr-gray-200"
                />
                <div className="flex justify-end">
                  <Button asChild variant="outline">
                    <a href={item.contentUrl} download>
                      {t("download")}
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-hajr-gray-500">{t("contentMissing")}</p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => reportPct(100)}
                className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
              >
                {t("markComplete")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {item.type === "EXERCISE" && (
        <ExerciseRunner
          itemId={item.id}
          data={item.exerciseData}
          onPassed={() => reportPct(100)}
        />
      )}
    </div>
  );
}

function ExerciseRunner({
  itemId,
  data,
  onPassed,
}: {
  itemId: string;
  data: unknown;
  onPassed: () => void;
}) {
  const t = useTranslations("Library");
  const questions: ExerciseQ[] = Array.isArray((data as { questions?: ExerciseQ[] })?.questions)
    ? ((data as { questions: ExerciseQ[] }).questions ?? [])
    : [];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-hajr-gray-500">
          {t("exerciseNoQuestions")}
        </CardContent>
      </Card>
    );
  }

  async function submit() {
    setBusy(true);
    try {
      let correct = 0;
      for (const q of questions) {
        if (answers[q.id] === q.correctIndex) correct++;
      }
      const score = Math.round((correct / questions.length) * 100);
      const res = await fetch("/api/library/exercise-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryItemId: itemId, score, answers }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "submit failed");
      setSubmitted({ score, correct, total: questions.length });
      onPassed();
      toast.success(t("exerciseSubmitted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {submitted ? (
          <div className="text-center">
            <div className="text-3xl font-bold text-hajr-rose">{submitted.score}%</div>
            <div className="text-sm text-hajr-gray-600">
              {submitted.correct} / {submitted.total} {t("correct")}
            </div>
          </div>
        ) : (
          <>
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-md border border-hajr-gray-200 p-3">
                <div className="mb-2 font-medium">
                  {i + 1}. {q.prompt}
                </div>
                <div className="space-y-1">
                  {q.options.map((opt, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button
                onClick={submit}
                disabled={busy || Object.keys(answers).length < questions.length}
                className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
              >
                {busy ? t("submitting") : t("submit")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
