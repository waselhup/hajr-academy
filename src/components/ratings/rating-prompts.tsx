"use client";

/**
 * Mounts in the student/parent app shell. Polls /api/ratings/pending on
 * route change; when something is owed, shows a single modal (with the
 * post-session prompt taking priority over monthly).
 *
 * Skip persists in sessionStorage so the modal doesn't reopen on every
 * route change in the same session.
 */
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Pending = {
  postSession: {
    sessionId: string;
    teacherId: string;
    teacherName: string;
    className: string;
  } | null;
  monthly: Array<{ teacherId: string; teacherName: string }>;
  parent?: Array<{
    studentId: string;
    studentName: string;
    teacherId: string;
    teacherName: string;
  }>;
};

const EMOJI = ["😡", "😞", "😐", "🙂", "😍"];

function StorageKey(kind: "post" | "monthly" | "parent", id: string) {
  return `rate-skip:${kind}:${id}`;
}

export function RatingPrompts({ role }: { role: "STUDENT" | "PARENT" }) {
  const t = useTranslations("Ratings");
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const r = await fetch("/api/ratings/pending", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) return;
      setPending(j as Pending);
    } catch {}
  }, []);

  useEffect(() => {
    // Skip the classroom route — don't pop the rating modal mid-class
    if (pathname?.includes("/classroom/")) return;
    fetchPending();
  }, [pathname, fetchPending]);

  useEffect(() => {
    if (!pending) return;
    if (role === "STUDENT") {
      const ps = pending.postSession;
      if (ps && !sessionStorage.getItem(StorageKey("post", ps.sessionId))) {
        setOpen(true);
        return;
      }
      const unrated = pending.monthly?.find(
        (m) => !sessionStorage.getItem(StorageKey("monthly", m.teacherId))
      );
      if (unrated) setOpen(true);
    }
    if (role === "PARENT") {
      const unrated = pending.parent?.find(
        (p) => !sessionStorage.getItem(StorageKey("parent", p.teacherId))
      );
      if (unrated) setOpen(true);
    }
  }, [pending, role]);

  if (!pending) return null;

  return (
    <RatingDialog
      open={open}
      onOpenChange={setOpen}
      role={role}
      pending={pending}
      busy={busy}
      setBusy={setBusy}
      t={t}
      onDone={() => {
        setOpen(false);
        fetchPending();
      }}
    />
  );
}

function RatingDialog({
  open,
  onOpenChange,
  role,
  pending,
  busy,
  setBusy,
  t,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: "STUDENT" | "PARENT";
  pending: Pending;
  busy: boolean;
  setBusy: (v: boolean) => void;
  t: (key: string) => string;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [improved, setImproved] = useState<string>("");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  // Determine which prompt to show
  const ps = role === "STUDENT" ? pending.postSession : null;
  const monthlyStudent =
    role === "STUDENT"
      ? pending.monthly?.find(
          (m) => !sessionStorage.getItem(StorageKey("monthly", m.teacherId))
        ) ?? null
      : null;
  const monthlyParent =
    role === "PARENT"
      ? pending.parent?.find(
          (p) => !sessionStorage.getItem(StorageKey("parent", p.teacherId))
        ) ?? null
      : null;
  const showPostSession = role === "STUDENT" && ps && !monthlyStudent;
  const showMonthlyStudent = role === "STUDENT" && monthlyStudent && !showPostSession;
  const showMonthlyParent = role === "PARENT" && monthlyParent;

  async function submitPostSession() {
    if (!ps || stars < 1) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ratings/post-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: ps.sessionId,
          rating: stars,
          studentNoteForParent: note || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "rate failed");
      sessionStorage.setItem(StorageKey("post", ps.sessionId), "done");
      toast.success(t("thanks"));
      resetAndDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitMonthlyStudent() {
    if (!monthlyStudent || stars < 1) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ratings/monthly-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: monthlyStudent.teacherId,
          rating: stars,
          improved: improved || null,
          comment: comment || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "rate failed");
      sessionStorage.setItem(StorageKey("monthly", monthlyStudent.teacherId), "done");
      toast.success(t("thanks"));
      resetAndDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitMonthlyParent() {
    if (!monthlyParent || stars < 1) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ratings/monthly-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: monthlyParent.teacherId,
          studentId: monthlyParent.studentId,
          rating: stars,
          improved: improved || null,
          comment: comment || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "rate failed");
      sessionStorage.setItem(StorageKey("parent", monthlyParent.teacherId), "done");
      toast.success(t("thanks"));
      resetAndDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    if (showPostSession && ps) sessionStorage.setItem(StorageKey("post", ps.sessionId), "skip");
    if (showMonthlyStudent && monthlyStudent)
      sessionStorage.setItem(StorageKey("monthly", monthlyStudent.teacherId), "skip");
    if (showMonthlyParent && monthlyParent)
      sessionStorage.setItem(StorageKey("parent", monthlyParent.teacherId), "skip");
    resetAndDone();
  }

  function resetAndDone() {
    setStars(0);
    setImproved("");
    setNote("");
    setComment("");
    onDone();
  }

  if (!showPostSession && !showMonthlyStudent && !showMonthlyParent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {showPostSession && ps && (
          <>
            <DialogTitle className="text-hajr-deep-navy">{t("postSessionTitle")}</DialogTitle>
            <DialogDescription>
              {t("postSessionBody")} <b>{ps.teacherName}</b> · {ps.className}
            </DialogDescription>
            <div className="my-4 flex justify-center gap-2">
              {EMOJI.map((e, i) => (
                <button
                  key={i}
                  className={`text-3xl transition ${stars === i + 1 ? "scale-125" : "opacity-60 hover:opacity-100"}`}
                  onClick={() => setStars(i + 1)}
                  aria-label={`Rating ${i + 1}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <Textarea
              placeholder={t("noteForParent")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
            />
            <DialogFooterActions onSkip={skip} onSubmit={submitPostSession} disabled={busy || stars < 1} t={t} />
          </>
        )}

        {showMonthlyStudent && monthlyStudent && (
          <>
            <DialogTitle className="text-hajr-deep-navy">{t("monthlyStudentTitle")}</DialogTitle>
            <DialogDescription>
              {t("monthlyStudentBody")} <b>{monthlyStudent.teacherName}</b>
            </DialogDescription>
            <Stars stars={stars} setStars={setStars} />
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">{t("didYouImprove")}</div>
              <div className="flex gap-2">
                {["YES", "NO", "UNSURE"].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={improved === v ? "default" : "outline"}
                    onClick={() => setImproved(v)}
                  >
                    {t(`improved_${v}`)}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              className="mt-3"
              placeholder={t("anythingElse")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
            />
            <DialogFooterActions onSkip={skip} onSubmit={submitMonthlyStudent} disabled={busy || stars < 1} t={t} />
          </>
        )}

        {showMonthlyParent && monthlyParent && (
          <>
            <DialogTitle className="text-hajr-deep-navy">{t("monthlyParentTitle")}</DialogTitle>
            <DialogDescription>
              {t("monthlyParentBody")} <b>{monthlyParent.teacherName}</b> · {monthlyParent.studentName}
            </DialogDescription>
            <Stars stars={stars} setStars={setStars} />
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">{t("didYouImprove")}</div>
              <div className="flex gap-2">
                {["YES", "NO", "UNSURE"].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={improved === v ? "default" : "outline"}
                    onClick={() => setImproved(v)}
                  >
                    {t(`improved_${v}`)}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              className="mt-3"
              placeholder={t("anythingElse")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
            />
            <DialogFooterActions onSkip={skip} onSubmit={submitMonthlyParent} disabled={busy || stars < 1} t={t} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stars({ stars, setStars }: { stars: number; setStars: (n: number) => void }) {
  return (
    <div className="my-4 flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => setStars(n)}
          className={`text-3xl ${n <= stars ? "text-yellow-400" : "text-gray-300"}`}
          aria-label={`${n} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function DialogFooterActions({
  onSkip,
  onSubmit,
  disabled,
  t,
}: {
  onSkip: () => void;
  onSubmit: () => void;
  disabled: boolean;
  t: (k: string) => string;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="outline" onClick={onSkip}>{t("skip")}</Button>
      <Button onClick={onSubmit} disabled={disabled} className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
        {t("submit")}
      </Button>
    </div>
  );
}
