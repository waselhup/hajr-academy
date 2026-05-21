"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Flag, ChevronLeft, ChevronRight } from "lucide-react";

interface Question {
  examQuestionId: string;
  questionId: string;
  orderIndex: number;
  sectionOrder: number;
  section: string;
  type: string;
  questionText: string;
  questionAudio: string | null;
  passage: string | null;
  options: { id: string; text: string }[] | null;
}

/**
 * The fullscreen exam runner.
 *
 * Timer is server-authoritative: the runner reads the absolute `deadline`
 * from /start and counts down to it. When the deadline passes, the exam
 * auto-submits with whatever answers exist. Answers auto-save every 30s.
 */
export function ExamRunner({
  examId,
  locale,
}: {
  examId: string;
  locale: string;
}) {
  const t = useTranslations("Exam");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attemptId, setAttemptId] = useState<string>("");
  const [examTitle, setExamTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [deadline, setDeadline] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  // ─── Load the exam ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/exams/${examId}/start`, { method: "POST" });
        if (!res.ok) throw new Error("start failed");
        const data = await res.json();
        if (cancelled) return;
        setAttemptId(data.attemptId);
        setExamTitle(
          locale === "ar" ? data.exam.titleAr : data.exam.title
        );
        setQuestions(data.questions);
        setAnswers(data.savedAnswers ?? {});
        setDeadline(new Date(data.deadline).getTime());
        startedAtRef.current = new Date(data.startedAt).getTime();
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, locale]);

  // ─── Submit (manual, or auto on timeout) ───────────────────────
  const doSubmit = useCallback(async () => {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const timeSpentSec = Math.round(
        (Date.now() - startedAtRef.current) / 1000
      );
      const res = await fetch(`/api/exams/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpentSec }),
      });
      if (res.ok) {
        router.push(`/${locale}/student/exams/results/${attemptId}`);
      } else {
        setSubmitting(false);
        submittedRef.current = false;
      }
    } catch {
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, [attemptId, answers, locale, router]);

  // ─── Server-authoritative countdown ────────────────────────────
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemainingSec(left);
      if (left === 0) doSubmit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, doSubmit]);

  // ─── Auto-save every 30s ───────────────────────────────────────
  useEffect(() => {
    if (!attemptId) return;
    const id = setInterval(() => {
      const timeSpentSec = Math.round(
        (Date.now() - startedAtRef.current) / 1000
      );
      fetch(`/api/exams/attempts/${attemptId}/save-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpentSec }),
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [attemptId, answers]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-rose" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{t("noExams")}</p>
        <Button onClick={() => router.push(`/${locale}/student/exams`)}>
          {t("title")}
        </Button>
      </div>
    );
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const unanswered = questions.length - answeredCount;
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const lowTime = remainingSec < 300;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="text-sm font-semibold">{examTitle}</div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {q.section} · {current + 1}/{questions.length}
          </span>
          <span
            className={`rounded-md px-3 py-1 text-sm font-bold num ${
              lowTime ? "bg-red-100 text-red-700" : "bg-brand-navy text-white"
            }`}
          >
            {mins}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Question area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {q.passage && (
              <div className="rounded-lg border bg-white p-4 text-sm leading-relaxed whitespace-pre-line">
                {q.passage}
              </div>
            )}
            {q.questionAudio && (
              <div className="rounded-lg border bg-white p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  {t("audioPlaysOnce")}
                </p>
                <audio controls className="w-full" src={q.questionAudio} />
              </div>
            )}
            <div className="rounded-lg border bg-white p-4">
              <div className="mb-3 font-medium">
                <span className="num">{current + 1}.</span> {q.questionText}
              </div>
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => {
                  const selected = answers[q.questionId] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.questionId]: opt.id }))
                      }
                      className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-start text-sm transition-colors ${
                        selected
                          ? "border-brand-rose bg-brand-rose/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                          selected
                            ? "border-brand-rose bg-brand-rose text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {opt.id.toUpperCase()}
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav controls */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={current === 0}
                onClick={() => setCurrent((c) => c - 1)}
              >
                <ChevronLeft className="me-1 h-4 w-4 rtl-flip" />
                {t("previous")}
              </Button>
              <Button
                variant={flagged.has(q.questionId) ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setFlagged((f) => {
                    const n = new Set(f);
                    n.has(q.questionId)
                      ? n.delete(q.questionId)
                      : n.add(q.questionId);
                    return n;
                  })
                }
              >
                <Flag className="me-1 h-4 w-4" />
                {flagged.has(q.questionId) ? t("flagged") : t("flag")}
              </Button>
              <Button
                size="sm"
                disabled={current === questions.length - 1}
                onClick={() => setCurrent((c) => c + 1)}
              >
                {t("next")}
                <ChevronRight className="ms-1 h-4 w-4 rtl-flip" />
              </Button>
            </div>
          </div>
        </main>

        {/* Question grid sidebar */}
        <aside className="hidden w-56 shrink-0 border-s bg-white p-4 lg:block">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {t("questionGrid")}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((qq, i) => {
              const isAnswered = answers[qq.questionId] !== undefined;
              const isFlagged = flagged.has(qq.questionId);
              return (
                <button
                  key={qq.questionId}
                  onClick={() => setCurrent(i)}
                  className={`flex h-8 w-8 items-center justify-center rounded text-xs num ${
                    i === current
                      ? "ring-2 ring-brand-navy"
                      : ""
                  } ${
                    isFlagged
                      ? "bg-amber-200 text-amber-800"
                      : isAnswered
                      ? "bg-brand-mint text-brand-navy"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div>
              {t("answered")}: <span className="num">{answeredCount}</span>
            </div>
            <div>
              {t("unanswered")}: <span className="num">{unanswered}</span>
            </div>
          </div>
          <Button
            className="mt-4 w-full bg-brand-rose text-white"
            onClick={() => setShowSubmitConfirm(true)}
          >
            {t("submitExam")}
          </Button>
        </aside>
      </div>

      {/* Mobile submit bar */}
      <div className="border-t bg-white p-3 lg:hidden">
        <Button
          className="w-full bg-brand-rose text-white"
          onClick={() => setShowSubmitConfirm(true)}
        >
          {t("submitExam")}
        </Button>
      </div>

      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("submitConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered > 0
                ? t("submitConfirmBody", { count: unanswered })
                : t("submitConfirmTitle")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("previous")}</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} onClick={doSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submitExam")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
