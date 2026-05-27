"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, ChevronRight } from "lucide-react";

type Question = {
  id: string;
  textEn: string;
  textAr: string;
  options: Array<{ en: string; ar: string }>;
  audioUrl?: string | null;
};

type Section = {
  id: string;
  type: string;
  titleEn: string;
  titleAr: string;
  timeLimitMin: number;
  order: number;
  questions: Question[];
};

type AttemptData = {
  id: string;
  status: string;
  answers: Record<string, Record<string, number>>;
  test: { id: string; variant: string; titleEn: string; titleAr: string; durationMin: number };
  sections: Section[];
};

export function TakeClient({
  attemptId,
  sessionId,
  locale,
}: {
  attemptId: string;
  sessionId: string;
  locale: string;
}) {
  const router = useRouter();
  const t = useTranslations("Placement");
  const isAr = locale === "ar";

  const [data, setData] = useState<AttemptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const lastSyncRef = useRef<string>("");

  // Load attempt.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/placement-tests/attempts/${attemptId}?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || "Failed to load");
        }
        const j = (await res.json()) as { attempt: AttemptData };
        setData(j.attempt);
        setAnswers(j.attempt.answers ?? {});
        setSecondsLeft(j.attempt.sections[0].timeLimitMin * 60);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [attemptId, sessionId]);

  // Section timer.
  useEffect(() => {
    if (!data) return;
    setSecondsLeft(data.sections[sectionIdx].timeLimitMin * 60);
  }, [sectionIdx, data]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Auto-save: debounced POST every 30s, and localStorage every change.
  useEffect(() => {
    if (!data) return;
    const key = `hajr_attempt_${attemptId}_answers`;
    try { localStorage.setItem(key, JSON.stringify(answers)); } catch {}
  }, [answers, attemptId, data]);

  const syncAnswers = useCallback(async () => {
    if (!data) return;
    const snapshot = JSON.stringify(answers);
    if (snapshot === lastSyncRef.current) return;
    lastSyncRef.current = snapshot;
    try {
      await fetch(`/api/placement-tests/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });
    } catch {}
  }, [answers, attemptId, sessionId, data]);

  useEffect(() => {
    const id = setInterval(syncAnswers, 30000);
    return () => clearInterval(id);
  }, [syncAnswers]);

  function setAnswer(sectionId: string, qid: string, optIdx: number) {
    setAnswers((prev) => ({ ...prev, [sectionId]: { ...(prev[sectionId] ?? {}), [qid]: optIdx } }));
  }

  async function nextSection() {
    await syncAnswers();
    if (data && sectionIdx + 1 < data.sections.length) {
      setSectionIdx((i) => i + 1);
    }
  }

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/placement-tests/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Submit failed");
      }
      const j = (await res.json()) as { attemptId: string };
      router.push(`/${locale}/placement-test/results/${j.attemptId}?sid=${encodeURIComponent(sessionId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-hajr-error bg-white p-6 text-center">
          <p className="text-hajr-error">{error}</p>
        </div>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="container py-10">
        <p className="text-center text-sm text-hajr-muted">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      </section>
    );
  }

  const section = data.sections[sectionIdx];
  const isLast = sectionIdx === data.sections.length - 1;
  const answeredInSection = Object.keys(answers[section.id] ?? {}).length;
  const allAnsweredInSection = answeredInSection === section.questions.length;

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <section className="container py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between rounded-2xl bg-hajr-deep-navy p-4 text-white">
          <div>
            <div className="text-xs text-white/60">
              {sectionIdx + 1} / {data.sections.length} · {isAr ? section.titleAr : section.titleEn}
            </div>
            <div className="text-sm font-semibold">{isAr ? data.test.titleAr : data.test.titleEn}</div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-mono">
            <Clock className="h-4 w-4" />
            <span>{mm}:{ss}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-hajr-border">
          <div
            className="h-full bg-hajr-rose transition-all"
            style={{ width: `${((sectionIdx + answeredInSection / Math.max(1, section.questions.length)) / data.sections.length) * 100}%` }}
          />
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {section.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-hajr-border bg-white p-4 shadow-card">
              <div className="mb-3 text-sm font-medium text-hajr-text">
                <span className="me-1 text-hajr-muted">{i + 1}.</span>
                {isAr ? q.textAr : q.textEn}
              </div>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const selected = (answers[section.id] ?? {})[q.id] === optIdx;
                  return (
                    <label
                      key={optIdx}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        selected ? "border-hajr-rose bg-hajr-rose/5" : "border-hajr-border bg-white hover:border-hajr-rose/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={selected}
                        onChange={() => setAnswer(section.id, q.id, optIdx)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-hajr-text">{isAr ? opt.ar : opt.en}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-3 flex items-center justify-between rounded-2xl border border-hajr-border bg-white p-3 shadow-card-hover">
          <div className="text-xs text-hajr-muted">
            {answeredInSection} / {section.questions.length}
          </div>
          {isLast ? (
            <button
              onClick={submit}
              disabled={submitting || !allAnsweredInSection}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-hajr-rose px-4 text-sm font-semibold text-white shadow disabled:opacity-50"
            >
              {submitting ? "…" : t("submitTest")}
            </button>
          ) : (
            <button
              onClick={nextSection}
              disabled={!allAnsweredInSection && secondsLeft > 0}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-hajr-deep-navy px-4 text-sm font-semibold text-white shadow disabled:opacity-50"
            >
              {t("nextSection")}
              <ChevronRight className="h-4 w-4 rtl-flip" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
