"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardCheck, CheckCircle2 } from "lucide-react";

type Item = {
  attemptId: string;
  studentName: string;
  exerciseTitle: string;
  type: string;
  completedAt: string | null;
  aiScore: number | null;
  media: { label: string; url: string | null; kind: string }[];
  texts: { label: string; text: string }[];
};

export function LabReviewClient({ items }: { items: Item[] }) {
  const isAr = useLocale() === "ar";
  const [done, setDone] = useState<Record<string, boolean>>({});
  const pending = items.filter((i) => !done[i.attemptId]);

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{isAr ? "تقييم التحدّث والكتابة" : "Grade speaking & writing"}</h1>
        <p className="text-sm text-muted-foreground">
          {isAr ? "تسجيلات الطلاب وإجاباتهم الكتابية بانتظار درجتك." : "Student recordings and written answers awaiting your grade."}
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="icon-chip h-12 w-12"><CheckCircle2 className="h-6 w-6" /></span>
            <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد شيء بانتظار التقييم. أحسنت!" : "Nothing awaiting review. All caught up!"}</p>
          </CardContent>
        </Card>
      ) : (
        pending.map((it) => <ReviewCard key={it.attemptId} item={it} isAr={isAr} onDone={() => setDone((d) => ({ ...d, [it.attemptId]: true }))} />)
      )}
    </div>
  );
}

function ReviewCard({ item, isAr, onDone }: { item: Item; isAr: boolean; onDone: () => void }) {
  const [score, setScore] = useState<string>(item.aiScore != null ? String(item.aiScore) : "");
  const [feedback, setFeedback] = useState("");
  const [saving, startSaving] = useTransition();

  const submit = () => {
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0 || n > 100) return toast.error(isAr ? "أدخل درجة من 0 إلى 100" : "Enter a score 0–100");
    if (!feedback.trim()) return toast.error(isAr ? "أضف ملاحظة للطالب" : "Add feedback for the student");
    startSaving(async () => {
      const res = await fetch("/api/teacher/lab/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: item.attemptId, teacherScore: n, teacherReview: feedback.trim() }),
      });
      if (res.ok) { toast.success(isAr ? "تم حفظ التقييم ✓" : "Grade saved ✓"); onDone(); }
      else { const j = await res.json().catch(() => ({})); toast.error(j?.error ?? (isAr ? "تعذّر الحفظ" : "Could not save")); }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-hajr-deep-navy">{item.studentName}</div>
            <div className="text-xs text-muted-foreground">{item.exerciseTitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{item.type}</Badge>
            {item.aiScore != null && <Badge variant="info">{isAr ? "اقتراح الذكاء" : "AI"} {item.aiScore}%</Badge>}
          </div>
        </div>

        {item.media.map((m, i) => (
          <div key={i} className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
            {m.url ? (
              m.kind === "VIDEO" ? <video src={m.url} controls className="w-full rounded-card" /> : <audio src={m.url} controls className="w-full" />
            ) : <p className="text-xs text-hajr-rose">{isAr ? "تعذّر تحميل التسجيل" : "Recording unavailable"}</p>}
          </div>
        ))}
        {item.texts.map((tx, i) => (
          <div key={i} className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">{tx.label}</div>
            <p className="whitespace-pre-wrap rounded-card bg-hajr-ivory p-3 text-sm text-hajr-deep-navy">{tx.text}</p>
          </div>
        ))}

        <div className="grid gap-2 sm:grid-cols-[120px_1fr] sm:items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{isAr ? "الدرجة (٠–١٠٠)" : "Score (0–100)"}</label>
            <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} className="num" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{isAr ? "ملاحظات للطالب" : "Feedback to student"}</label>
            <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={isAr ? "أحسنت في…، انتبه إلى…" : "You did well on…, watch out for…"} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="cta" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="me-2 h-4 w-4" />}
            {isAr ? "حفظ الدرجة" : "Save grade"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
