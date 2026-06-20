"use client";

/**
 * Mounts in the student/parent app shell. Fetches /api/ratings/pending ONCE on
 * mount and shows AT MOST ONE prompt:
 *   - STUDENT: an after-class rating (once per class) OR a monthly subscription
 *     feedback (once per month) — class takes priority.
 *   - PARENT: one monthly feedback per month.
 * Skip/submit is recorded server-side, so the prompt never re-nags (the previous
 * version polled on every route change and only de-duped in sessionStorage).
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Pending = {
  postSession: { sessionId: string; teacherId: string; teacherName: string; className: string } | null;
  monthly: { teacherId: string; teacherName: string; monthKey: string } | null;
  parent?: { studentId: string; studentName: string; teacherId: string; teacherName: string; monthKey: string } | null;
};

const EMOJI = ["😡", "😞", "😐", "🙂", "😍"];
const J = { "Content-Type": "application/json" };

export function RatingPrompts({ role }: { role: "STUDENT" | "PARENT" }) {
  const t = useTranslations("Ratings");
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(0);
  const [improved, setImproved] = useState("");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  // Fetch ONCE per page-load. Never interrupt a live class.
  useEffect(() => {
    if (pathname?.includes("/classroom/")) return;
    let cancelled = false;
    fetch("/api/ratings/pending", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.ok) return;
        const due = role === "STUDENT" ? j.postSession || j.monthly : j.parent;
        if (due) { setPending(j as Pending); setOpen(true); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pending) return null;

  const ps = role === "STUDENT" ? pending.postSession : null;
  const monthly = role === "STUDENT" ? pending.monthly : null;
  const parent = role === "PARENT" ? pending.parent ?? null : null;
  const mode: "post" | "monthly" | "parent" | null = ps ? "post" : monthly ? "monthly" : parent ? "parent" : null;
  if (!mode) return null;

  const monthKey = monthly?.monthKey ?? parent?.monthKey ?? "";

  const close = () => { setOpen(false); setPending(null); };

  async function skip() {
    try {
      if (mode === "post" && ps) {
        await fetch("/api/ratings/dismiss", { method: "POST", headers: J, body: JSON.stringify({ kind: "CLASS", refKey: ps.sessionId }) });
      } else if (monthKey) {
        await fetch("/api/ratings/dismiss", { method: "POST", headers: J, body: JSON.stringify({ kind: "MONTHLY", refKey: monthKey }) });
      }
    } catch {}
    close();
  }

  async function submit() {
    if (stars < 1) return;
    setBusy(true);
    try {
      let res: Response;
      if (mode === "post" && ps) {
        res = await fetch("/api/ratings/post-session", { method: "POST", headers: J, body: JSON.stringify({ sessionId: ps.sessionId, rating: stars, studentNoteForParent: note || null }) });
      } else if (mode === "monthly" && monthly) {
        res = await fetch("/api/ratings/monthly-student", { method: "POST", headers: J, body: JSON.stringify({ teacherId: monthly.teacherId, rating: stars, improved: improved || null, comment: comment || null }) });
      } else if (mode === "parent" && parent) {
        res = await fetch("/api/ratings/monthly-parent", { method: "POST", headers: J, body: JSON.stringify({ teacherId: parent.teacherId, studentId: parent.studentId, rating: stars, improved: improved || null, comment: comment || null }) });
      } else return;
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "failed");
      // Also record a resolved log so it never reappears even if the rating row is edited.
      const ref = mode === "post" ? { kind: "CLASS", refKey: ps!.sessionId } : { kind: "MONTHLY", refKey: monthKey };
      fetch("/api/ratings/dismiss", { method: "POST", headers: J, body: JSON.stringify(ref) }).catch(() => {});
      toast.success(t("thanks"));
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "post" ? t("postSessionTitle") : mode === "parent" ? t("monthlyParentTitle") : t("monthlyStudentTitle");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-hajr-deep-navy">{title}</DialogTitle>
        <DialogDescription>
          {mode === "post" && ps && (<>{t("postSessionBody")} <b>{ps.teacherName}</b> · {ps.className}</>)}
          {mode === "monthly" && monthly && (<>{t("monthlyStudentBody")} <b>{monthly.teacherName}</b></>)}
          {mode === "parent" && parent && (<>{t("monthlyParentBody")} <b>{parent.teacherName}</b> · {parent.studentName}</>)}
        </DialogDescription>

        {mode === "post" ? (
          <div className="my-4 flex justify-center gap-2">
            {EMOJI.map((e, i) => (
              <button key={i} type="button" onClick={() => setStars(i + 1)} aria-label={`Rating ${i + 1}`}
                className={`text-3xl transition ${stars === i + 1 ? "scale-125" : "opacity-60 hover:opacity-100"}`}>{e}</button>
            ))}
          </div>
        ) : (
          <div className="my-4 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} star`}
                className={`text-3xl ${n <= stars ? "text-yellow-400" : "text-gray-300"}`}>★</button>
            ))}
          </div>
        )}

        {(mode === "monthly" || mode === "parent") && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("didYouImprove")}</div>
            <div className="flex gap-2">
              {["YES", "NO", "UNSURE"].map((v) => (
                <Button key={v} type="button" variant={improved === v ? "default" : "outline"} onClick={() => setImproved(v)}>
                  {t(`improved_${v}`)}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Textarea
          className="mt-3"
          placeholder={mode === "post" ? t("noteForParent") : t("anythingElse")}
          value={mode === "post" ? note : comment}
          onChange={(e) => (mode === "post" ? setNote(e.target.value) : setComment(e.target.value))}
          rows={2}
          maxLength={500}
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={skip} disabled={busy}>{t("skip")}</Button>
          <Button onClick={submit} disabled={busy || stars < 1} className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
            {t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
