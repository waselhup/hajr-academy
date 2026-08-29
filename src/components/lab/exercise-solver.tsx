"use client";

/**
 * Lab Studio v2 — student solver. Renders an exercise's blocks interactively,
 * autosaves, submits, and shows instant results (objective blocks graded on the
 * server). Speaking/writing go to AI/teacher review. Friendly + gamified.
 */
import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentComposer, type StagedAttachment } from "@/components/assignments/attachment-composer";
import type { Block } from "@/lib/lab/blocks";

type Attempt = { id: string; status: string; submission: any; score: number | null; aiEvaluation: any } | null;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function ExerciseSolver({
  exercise, attempt, backHref,
}: {
  exercise: { id: string; title: string; titleAr: string; instructions?: string | null; blocks: Block[]; pointsValue: number };
  attempt: Attempt;
  backHref: string;
}) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const alreadyDone = attempt?.status === "COMPLETED";
  const [answers, setAnswers] = useState<Record<string, any>>(attempt?.submission ?? {});
  const [attemptId, setAttemptId] = useState<string | null>(attempt && attempt.status !== "COMPLETED" ? attempt.id : null);
  const [result, setResult] = useState<any>(alreadyDone ? attempt?.aiEvaluation : null);
  const [score, setScore] = useState<number | null>(alreadyDone ? attempt?.score ?? null : null);
  const [phase, setPhase] = useState<"solve" | "done">(alreadyDone ? "done" : "solve");

  const setAnswer = useCallback((id: string, val: any) => setAnswers((a) => ({ ...a, [id]: val })), []);

  // Start (or resume) an attempt when solving.
  useEffect(() => {
    if (phase !== "solve" || attemptId) return;
    fetch("/api/lab/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: exercise.id }) })
      .then((r) => r.json()).then((j) => { if (j?.attempt?.id || j?.id) setAttemptId(j.attempt?.id ?? j.id); }).catch(() => {});
  }, [phase, attemptId, exercise.id]);

  // Autosave every 30s.
  useEffect(() => {
    if (phase !== "solve" || !attemptId) return;
    const t = setInterval(() => {
      fetch(`/api/lab/attempts/${attemptId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission: answers }) }).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [phase, attemptId, answers]);

  const perBlock: Record<string, any> = useMemo(() => {
    const pb = result?.perBlock;
    if (!Array.isArray(pb)) return {};
    return Object.fromEntries(pb.map((x: any) => [x.blockId, x]));
  }, [result]);

  const submit = () => {
    if (!attemptId) return toast.error(isAr ? "جارٍ التحضير…" : "Preparing…");
    startTransition(async () => {
      const res = await fetch(`/api/lab/attempts/${attemptId}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission: answers }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j?.error ?? (isAr ? "تعذّر الإرسال" : "Could not submit")); return; }
      setScore(typeof j.score === "number" ? j.score : null);
      setResult(j.attempt?.aiEvaluation ?? null);
      setPhase("done");
      router.refresh();
    });
  };

  if (phase === "done") {
    const pending = score == null || result?.pendingReview;
    return (
      <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <span className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full text-white ${pending ? "bg-hajr-deep-navy" : "bg-hajr-rose"}`}>
              {pending ? <CheckCircle2 className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
            </span>
            <h2 className="text-xl font-bold text-hajr-deep-navy">
              {pending ? (isAr ? "تم الإرسال ✓" : "Submitted ✓") : (isAr ? "أحسنت!" : "Great job!")}
            </h2>
            {score != null && <p className="num text-3xl font-extrabold text-hajr-rose">{score}%</p>}
            {pending && (
              <p className="text-sm text-muted-foreground">
                {isAr ? "إجابتك (تحدّث/كتابة) بانتظار تقييم المعلّم — وستحصل على نقاط المشاركة الآن." : "Your speaking/writing answer is awaiting teacher review — you earned participation points now."}
              </p>
            )}
          </CardContent>
        </Card>
        {/* Per-block review */}
        <div className="space-y-3">
          {exercise.blocks.map((b) => <BlockView key={b.id} block={b} isAr={isAr} answer={answers[b.id]} review={perBlock[b.id]} readOnly />)}
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push(backHref)}><ArrowLeft className="me-2 h-4 w-4 rtl-flip" />{isAr ? "رجوع للمعمل" : "Back to Lab"}</Button>
          <Button variant="ghost" onClick={() => { setPhase("solve"); setResult(null); setScore(null); setAnswers({}); setAttemptId(null); }}>
            <RotateCcw className="me-2 h-4 w-4" />{isAr ? "حاول مجدداً" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }

  const answered = exercise.blocks.filter((b) => answers[b.id] != null && answers[b.id] !== "" && !(Array.isArray(answers[b.id]) && answers[b.id].length === 0)).length;
  const gradable = exercise.blocks.filter((b) => !["PASSAGE", "MEDIA"].includes(b.kind)).length;

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      <Card>
        <CardContent className="p-5">
          <h1 className="text-lg font-bold text-hajr-deep-navy">{isAr ? exercise.titleAr : exercise.title}</h1>
          {exercise.instructions && <p className="mt-1 text-sm text-muted-foreground">{exercise.instructions}</p>}
          <p className="mt-2 text-xs text-muted-foreground"><span className="num">{answered}</span>/<span className="num">{gradable}</span> {isAr ? "مكتمل" : "answered"}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {exercise.blocks.map((b) => <BlockView key={b.id} block={b} isAr={isAr} answer={answers[b.id]} onAnswer={(v) => setAnswer(b.id, v)} />)}
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-hajr-border bg-hajr-ivory/95 py-3 backdrop-blur">
        <Button variant="cta" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isAr ? "إرسال الإجابات" : "Submit answers"}
        </Button>
      </div>
    </div>
  );
}

// ─────────── per-block player / review ───────────
function BlockView({ block, isAr, answer, onAnswer, review, readOnly }: {
  block: Block; isAr: boolean; answer: any; onAnswer?: (v: any) => void; review?: any; readOnly?: boolean;
}) {
  const correct: boolean | null = review?.correct ?? null;
  const ring = correct === true ? "ring-2 ring-hajr-mint" : correct === false ? "ring-2 ring-hajr-rose/60" : "";
  return (
    <Card className={ring}>
      <CardContent className="space-y-3 p-4">
        {correct != null && (
          <div className={`flex items-center gap-1.5 text-sm font-medium ${correct ? "text-hajr-success" : "text-hajr-rose"}`}>
            {correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {correct ? (isAr ? "صحيح" : "Correct") : (isAr ? "راجع" : "Review")}
          </div>
        )}
        {/*
          The exercise content is ENGLISH — it is the thing being taught — so it
          is pinned left-to-right even when the interface around it is Arabic.
          Without this an Arabic student saw "?Where do you live" with the
          question mark on the wrong side, sentence-ordering tokens running
          backwards, and gap-fill text reversed around its blanks.

          Scoped to the block content only: the card, the correct/review banner
          and every other piece of chrome stay RTL for the Arabic UI.
        */}
        <div dir="ltr" className="text-left">
          <BlockPlayer block={block} isAr={isAr} answer={answer} onAnswer={onAnswer} readOnly={readOnly} />
        </div>
      </CardContent>
    </Card>
  );
}

function BlockPlayer({ block, isAr, answer, onAnswer, readOnly }: {
  block: Block; isAr: boolean; answer: any; onAnswer?: (v: any) => void; readOnly?: boolean;
}) {
  const ro = !!readOnly || !onAnswer;
  switch (block.kind) {
    case "PASSAGE":
      // `textAr` was stored by the builder and by every seeded exercise but was
      // never rendered, so an Arabic student read an English passage with no
      // help at all. It is a gloss, not a replacement: the English stays first
      // and stays the thing being read. Its own dir, because the block content
      // around it is pinned LTR.
      return (
        <div className="rounded-card bg-hajr-ivory p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-hajr-deep-navy">{block.text}</p>
          {isAr && block.textAr && (
            <p dir="rtl" className="mt-3 whitespace-pre-wrap border-t border-hajr-border pt-3 text-right text-xs leading-relaxed text-muted-foreground">
              {block.textAr}
            </p>
          )}
        </div>
      );
    case "MEDIA":
      return <MediaPlayer block={block} />;
    case "MCQ":
      return (
        <div className="space-y-2">
          <p className="font-medium text-hajr-deep-navy">{block.prompt}</p>
          <div className="space-y-1.5">
            {block.options.map((o) => {
              const sel = answer === o.id;
              const isRight = ro && o.id === block.correctOptionId;
              return (
                <button key={o.id} type="button" disabled={ro} onClick={() => onAnswer?.(o.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-sm transition-colors ${isRight ? "border-hajr-mint bg-hajr-mint/20" : sel ? "border-hajr-rose bg-hajr-rose/10" : "border-hajr-border hover:bg-hajr-chip"}`}>
                  <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${sel ? "border-hajr-rose bg-hajr-rose" : "border-hajr-border"}`} />
                  {o.text}
                </button>
              );
            })}
          </div>
        </div>
      );
    case "TRUE_FALSE":
      return (
        <div className="space-y-2">
          <p className="font-medium text-hajr-deep-navy">{block.prompt}</p>
          <div className="flex gap-2">
            {[true, false].map((v) => {
              const sel = answer === v;
              const isRight = ro && v === block.answer;
              return (
                <button key={String(v)} type="button" disabled={ro} onClick={() => onAnswer?.(v)}
                  className={`rounded-xl border px-5 py-2 text-sm ${isRight ? "border-hajr-mint bg-hajr-mint/20" : sel ? "border-hajr-rose bg-hajr-rose/10 font-medium text-hajr-rose" : "border-hajr-border hover:bg-hajr-chip"}`}>
                  {v ? (isAr ? "صح" : "True") : (isAr ? "خطأ" : "False")}
                </button>
              );
            })}
          </div>
        </div>
      );
    case "FILL_BLANK":
      return <FillBlankPlayer block={block} isAr={isAr} answer={answer} onAnswer={onAnswer} ro={ro} />;
    case "WORD_ORDER":
      return <WordOrderPlayer block={block} isAr={isAr} answer={answer} onAnswer={onAnswer} ro={ro} />;
    case "MATCHING":
      return <MatchingPlayer block={block} isAr={isAr} answer={answer} onAnswer={onAnswer} ro={ro} />;
    case "SHORT_TEXT":
      return (
        <div className="space-y-2">
          <p className="font-medium text-hajr-deep-navy">{block.prompt}</p>
          <Textarea rows={5} disabled={ro} value={answer ?? ""} onChange={(e) => onAnswer?.(e.target.value)} placeholder={isAr ? "اكتب إجابتك…" : "Write your answer…"} />
        </div>
      );
    case "RECORD":
      return (
        <div className="space-y-2">
          <p className="font-medium text-hajr-deep-navy">{block.prompt}</p>
          {block.targetText && <p className="rounded-card bg-hajr-ivory p-3 text-sm text-hajr-deep-navy">{block.targetText}</p>}
          {ro ? (
            <p className="text-xs text-muted-foreground">{answer?.path ? (isAr ? "تم تسجيل إجابتك ✓" : "Your recording was submitted ✓") : (isAr ? "لا يوجد تسجيل" : "No recording")}</p>
          ) : (
            <AttachmentComposer
              allowedKinds={[block.mediaKind === "VIDEO" ? "VIDEO" : "AUDIO"]}
              value={answer?.path ? [{ kind: block.mediaKind === "VIDEO" ? "VIDEO" : "AUDIO", path: answer.path, fileName: answer.fileName, mimeType: answer.mimeType, sizeBytes: answer.sizeBytes ?? 0, durationSec: answer.durationSec } as StagedAttachment] : []}
              onChange={(att) => onAnswer?.(att[0] ? { path: att[0].path, fileName: att[0].fileName, mimeType: att[0].mimeType, sizeBytes: att[0].sizeBytes, durationSec: att[0].durationSec } : null)}
            />
          )}
        </div>
      );
  }
}

function MediaPlayer({ block }: { block: Extract<Block, { kind: "MEDIA" }> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!block.path) return;
    fetch(`/api/lab/media?path=${encodeURIComponent(block.path)}`).then((r) => r.json()).then((j) => setUrl(j?.url ?? null)).catch(() => {});
  }, [block.path]);
  if (!url) return <div className="rounded-card bg-hajr-ivory p-4 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>;
  return block.mediaKind === "VIDEO"
    ? <video src={url} controls className="w-full rounded-card" />
    : <audio src={url} controls className="w-full" />;
}

function FillBlankPlayer({ block, isAr, answer, onAnswer, ro }: any) {
  const vals: string[] = Array.isArray(answer) ? answer : [];
  const parts = String(block.text).split(/(\{\{\d+\}\})/g);
  let bi = -1;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm leading-8 text-hajr-deep-navy">
      {parts.map((p: string, i: number) => {
        const m = p.match(/\{\{(\d+)\}\}/);
        if (m) {
          bi += 1; const idx = bi;
          return <input key={i} disabled={ro} value={vals[idx] ?? ""} onChange={(e) => { const next = [...vals]; next[idx] = e.target.value; onAnswer?.(next); }}
            className="inline-block w-28 rounded-lg border border-hajr-rose/50 bg-white px-2 py-1 text-sm" placeholder={`${idx + 1}`} />;
        }
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

function WordOrderPlayer({ block, isAr, answer, onAnswer, ro }: any) {
  const scrambled: string[] = useMemo(() => shuffle((block.tokens ?? []).map((t: string, i: number) => `${i}:${t}`)), [block.id]);
  const chosen: string[] = Array.isArray(answer) ? answer : []; // store "idx:token"
  const available = scrambled.filter((s) => !chosen.includes(s));
  const tokenText = (s: string) => s.replace(/^\d+:/, "");
  return (
    <div className="space-y-2">
      {block.prompt && <p className="font-medium text-hajr-deep-navy">{block.prompt}</p>}
      <div className="min-h-[2.5rem] rounded-card border border-hajr-border bg-white p-2">
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((s) => (
            <button key={s} type="button" disabled={ro} onClick={() => onAnswer?.(chosen.filter((x) => x !== s))}
              className="rounded-lg bg-hajr-deep-navy px-3 py-1.5 text-sm text-white">{tokenText(s)}</button>
          ))}
          {chosen.length === 0 && <span className="px-1 text-xs text-muted-foreground">{isAr ? "اضغط الكلمات بالترتيب" : "Tap the words in order"}</span>}
        </div>
      </div>
      {!ro && (
        <div className="flex flex-wrap gap-1.5">
          {available.map((s) => (
            <button key={s} type="button" onClick={() => onAnswer?.([...chosen, s])}
              className="rounded-lg border border-hajr-border bg-hajr-chip px-3 py-1.5 text-sm hover:bg-hajr-border">{tokenText(s)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchingPlayer({ block, isAr, answer, onAnswer, ro }: any) {
  const map: Record<string, string> = answer && typeof answer === "object" ? answer : {};
  const rights: { id: string; text: string }[] = useMemo(() => shuffle((block.pairs ?? []).map((p: any) => ({ id: String(p.id), text: String(p.right) }))), [block.id]);
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const pick = (rid: string) => {
    if (!activeLeft) return;
    onAnswer?.({ ...map, [activeLeft]: rid });
    setActiveLeft(null);
  };
  const rightFor = (leftId: string) => rights.find((r: any) => r.id === map[leftId])?.text;
  return (
    <div className="space-y-2">
      {/* The prompt was stored but never rendered, so a matching block arrived
          as two bare columns with no instruction telling the student what the
          relationship between them was meant to be. */}
      {block.prompt && <p className="font-medium text-hajr-deep-navy">{block.prompt}</p>}
      <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        {block.pairs.map((p: any) => (
          <button key={p.id} type="button" disabled={ro} onClick={() => setActiveLeft(p.id)}
            className={`flex w-full flex-col rounded-xl border px-3 py-2 text-start text-sm ${activeLeft === p.id ? "border-hajr-rose bg-hajr-rose/10" : "border-hajr-border hover:bg-hajr-chip"}`}>
            <span className="font-medium text-hajr-deep-navy">{p.left}</span>
            {map[p.id] && <span className="text-xs text-hajr-rose">↔ {rightFor(p.id)}</span>}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {rights.map((r: any) => {
          const used = Object.values(map).includes(r.id);
          return (
            <button key={r.id} type="button" disabled={ro || !activeLeft} onClick={() => pick(r.id)}
              className={`w-full rounded-xl border px-3 py-2 text-start text-sm ${used ? "border-hajr-border bg-hajr-chip text-muted-foreground" : "border-hajr-border hover:bg-hajr-chip"}`}>{r.text}</button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
