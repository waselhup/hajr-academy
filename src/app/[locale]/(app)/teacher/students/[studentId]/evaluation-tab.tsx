"use client";

/**
 * Teacher's "Evaluation" tab — the WhatsApp rubric: 8 criteria each rated
 * Excellent / Good / Satisfactory / Needs Improvement, plus Strengths, Areas for
 * Improvement and Next Action. CEFR level + optional class + a free note remain.
 * Bilingual (AR/EN). The server re-checks ownership.
 */
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createEvaluationAction } from "../../_actions/evaluations";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const CRITERIA = [
  { key: "attendance", en: "Attendance & Punctuality", ar: "الحضور والالتزام بالوقت" },
  { key: "participation", en: "Participation & Engagement", ar: "المشاركة والتفاعل" },
  { key: "communication", en: "English Communication", ar: "التواصل بالإنجليزية" },
  { key: "comprehension", en: "Understanding & Comprehension", ar: "الفهم والاستيعاب" },
  { key: "homework", en: "Homework & Task Completion", ar: "الواجبات وإنجاز المهام" },
  { key: "behavior", en: "Behavior & Focus", ar: "السلوك والتركيز" },
  { key: "confidence", en: "Confidence", ar: "الثقة بالنفس" },
  { key: "overall", en: "Overall Progress", ar: "التقدّم العام" },
] as const;

const RATINGS = [
  { key: "EXCELLENT", en: "Excellent", ar: "ممتاز" },
  { key: "GOOD", en: "Good", ar: "جيد" },
  { key: "SATISFACTORY", en: "Satisfactory", ar: "مقبول" },
  { key: "NEEDS_IMPROVEMENT", en: "Needs Improvement", ar: "يحتاج تحسين" },
] as const;

const RATING_ACTIVE: Record<string, string> = {
  EXCELLENT: "border-emerald-500 bg-emerald-500 text-white",
  GOOD: "border-hajr-mint bg-hajr-mint text-hajr-deep-navy",
  SATISFACTORY: "border-amber-400 bg-amber-400 text-hajr-deep-navy",
  NEEDS_IMPROVEMENT: "border-hajr-rose bg-hajr-rose text-white",
};
const RATING_DOT: Record<string, string> = {
  EXCELLENT: "bg-emerald-500", GOOD: "bg-hajr-mint", SATISFACTORY: "bg-amber-400", NEEDS_IMPROVEMENT: "bg-hajr-rose",
};

export type EvaluationVM = {
  id: string;
  skillLevel: string;
  criteria: Record<string, string> | null;
  strengths: string | null;
  areasForImprovement: string | null;
  nextAction: string | null;
  note: string | null;
  createdAt: string;
  teacherName: string;
  className: string | null;
};

export function EvaluationTab({
  studentId, locale, classes, initialEvaluations,
}: {
  studentId: string;
  locale: string;
  classes: { id: string; name: string }[];
  initialEvaluations: EvaluationVM[];
}) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [evaluations, setEvaluations] = useState<EvaluationVM[]>(initialEvaluations);
  useEffect(() => setEvaluations(initialEvaluations), [initialEvaluations]);

  const [skillLevel, setSkillLevel] = useState("B1");
  const [criteria, setCriteria] = useState<Record<string, string>>({});
  const [strengths, setStrengths] = useState("");
  const [areas, setAreas] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [classId, setClassId] = useState("");
  const [note, setNote] = useState("");

  const ratingLabel = (k: string) => RATINGS.find((r) => r.key === k)?.[isAr ? "ar" : "en"] ?? k;
  const criterionLabel = (k: string) => CRITERIA.find((c) => c.key === k)?.[isAr ? "ar" : "en"] ?? k;

  function submit() {
    if (Object.keys(criteria).length < CRITERIA.length) {
      toast.error(isAr ? "يرجى تقييم جميع المعايير" : "Please rate all criteria");
      return;
    }
    startTransition(async () => {
      const res = await createEvaluationAction({
        studentId,
        classId: classId || null,
        skillLevel: skillLevel as (typeof CEFR)[number],
        criteria: criteria as any,
        strengths: strengths.trim() || null,
        areasForImprovement: areas.trim() || null,
        nextAction: nextAction.trim() || null,
        note: note.trim() || null,
      });
      if (res.ok) {
        toast.success(isAr ? "تم حفظ التقييم ✓" : "Evaluation saved ✓");
        setCriteria({}); setStrengths(""); setAreas(""); setNextAction(""); setNote("");
        router.refresh();
      } else {
        toast.error(isAr ? "تعذّر الحفظ" : "Could not save");
      }
    });
  }

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="rounded-card border border-hajr-border bg-white p-5 shadow-card">
        <h3 className="mb-4 text-base font-semibold text-hajr-deep-navy">{isAr ? "تقييم الطالب" : "Evaluate student"}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{isAr ? "المستوى (CEFR)" : "Skill level (CEFR)"}</Label>
            <Select value={skillLevel} onValueChange={setSkillLevel} disabled={pending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CEFR.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "الصف (اختياري)" : "Class (optional)"}</Label>
            <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? "" : v)} disabled={pending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isAr ? "بدون صف محدد" : "No specific class"}</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rubric */}
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold text-hajr-deep-navy">{isAr ? "معايير التقييم" : "Evaluation criteria"}</div>
          <div className="space-y-2">
            {CRITERIA.map((c) => (
              <div key={c.key} className="rounded-xl border border-hajr-border bg-hajr-ivory p-2.5 sm:flex sm:items-center sm:justify-between sm:gap-3">
                <div className="mb-1.5 text-sm font-medium text-hajr-deep-navy sm:mb-0">{isAr ? c.ar : c.en}</div>
                <div className="flex flex-wrap gap-1.5">
                  {RATINGS.map((r) => {
                    const active = criteria[c.key] === r.key;
                    return (
                      <button key={r.key} type="button" disabled={pending}
                        onClick={() => setCriteria((prev) => ({ ...prev, [c.key]: r.key }))}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${active ? RATING_ACTIVE[r.key] : "border-hajr-border bg-white text-hajr-text hover:bg-hajr-chip"}`}>
                        {isAr ? r.ar : r.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher feedback */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{isAr ? "نقاط القوة" : "Strengths"}</Label>
            <Textarea rows={3} disabled={pending} value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder={isAr ? "ما الذي أتقنه الطالب…" : "What the student did well…"} />
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "مجالات التحسين" : "Areas for Improvement"}</Label>
            <Textarea rows={3} disabled={pending} value={areas} onChange={(e) => setAreas(e.target.value)} placeholder={isAr ? "ما الذي يحتاج إلى عمل…" : "What needs work…"} />
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "الإجراء التالي / التوصية" : "Next Action / Recommendation"}</Label>
            <Textarea rows={3} disabled={pending} value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder={isAr ? "الخطوة القادمة…" : "The next step…"} />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label>{isAr ? "ملاحظة (اختياري)" : "Note (optional)"}</Label>
          <Textarea rows={2} disabled={pending} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isAr ? "أي شيء يستحق التسجيل…" : "Anything worth recording…"} />
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="cta" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isAr ? "حفظ التقييم" : "Save evaluation"}
          </Button>
        </div>
      </div>

      {/* Past evaluations */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-hajr-deep-navy">{isAr ? "التقييمات السابقة" : "Past evaluations"}</h3>
        {evaluations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isAr ? "لا توجد تقييمات بعد." : "No evaluations yet."}</p>
        ) : (
          <ul className="space-y-3">
            {evaluations.map((e) => (
              <li key={e.id} className="rounded-card border border-hajr-border bg-white p-4 text-sm shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{e.skillLevel}</Badge>
                  <span className="ms-auto num text-xs text-muted-foreground">{dateFmt(e.createdAt)}</span>
                </div>
                {e.criteria && Object.keys(e.criteria).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CRITERIA.filter((c) => e.criteria?.[c.key]).map((c) => (
                      <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-hajr-ivory px-2 py-0.5 text-[11px]">
                        <span className={`h-2 w-2 rounded-full ${RATING_DOT[e.criteria![c.key]] ?? "bg-gray-300"}`} />
                        {criterionLabel(c.key)}: <b>{ratingLabel(e.criteria![c.key])}</b>
                      </span>
                    ))}
                  </div>
                )}
                {(e.strengths || e.areasForImprovement || e.nextAction) && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {e.strengths && <Feedback label={isAr ? "نقاط القوة" : "Strengths"} text={e.strengths} />}
                    {e.areasForImprovement && <Feedback label={isAr ? "مجالات التحسين" : "Areas for Improvement"} text={e.areasForImprovement} />}
                    {e.nextAction && <Feedback label={isAr ? "الإجراء التالي" : "Next Action"} text={e.nextAction} />}
                  </div>
                )}
                {e.note && <p className="mt-2 text-sm text-hajr-text">{e.note}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground">{isAr ? "بواسطة" : "by"} {e.teacherName}{e.className ? ` · ${e.className}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Feedback({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg bg-hajr-ivory p-2">
      <div className="text-[11px] font-semibold text-hajr-muted">{label}</div>
      <p className="mt-0.5 whitespace-pre-wrap text-xs text-hajr-deep-navy">{text}</p>
    </div>
  );
}
