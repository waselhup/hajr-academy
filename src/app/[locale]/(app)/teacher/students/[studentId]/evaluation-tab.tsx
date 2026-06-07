"use client";

/**
 * Teacher's "Evaluation" tab for a single student (batch 4C, F3). Submit a new
 * evaluation (CEFR skill, 1–5 participation, improvement trend, optional note)
 * and see past evaluations. The server action re-checks ownership; this UI is
 * only the convenient surface.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createEvaluationAction } from "../../_actions/evaluations";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const IMPROVEMENTS = ["IMPROVED", "SAME", "DECLINED"] as const;

export type EvaluationVM = {
  id: string;
  skillLevel: string;
  participation: number;
  improvement: "IMPROVED" | "SAME" | "DECLINED";
  note: string | null;
  createdAt: string;
  teacherName: string;
  className: string | null;
};

function ImprovementBadge({ v, label }: { v: string; label: string }) {
  const Icon = v === "IMPROVED" ? TrendingUp : v === "DECLINED" ? TrendingDown : Minus;
  const variant = v === "IMPROVED" ? "success" : v === "DECLINED" ? "danger" : "outline";
  return (
    <Badge variant={variant as any} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function EvaluationTab({
  studentId,
  locale,
  classes,
  initialEvaluations,
}: {
  studentId: string;
  locale: string;
  classes: { id: string; name: string }[];
  initialEvaluations: EvaluationVM[];
}) {
  const t = useTranslations("Evaluation");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [evaluations, setEvaluations] = useState<EvaluationVM[]>(initialEvaluations);

  const [skillLevel, setSkillLevel] = useState<string>("B1");
  const [participation, setParticipation] = useState<number>(3);
  const [improvement, setImprovement] = useState<string>("SAME");
  const [classId, setClassId] = useState<string>("");
  const [note, setNote] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await createEvaluationAction({
        studentId,
        classId: classId || null,
        skillLevel: skillLevel as (typeof CEFR)[number],
        participation,
        improvement: improvement as (typeof IMPROVEMENTS)[number],
        note: note.trim() || null,
      });
      if (res.ok) {
        toast.success(t("savedOk"));
        setNote("");
        router.refresh();
      } else {
        toast.error(t("saveFail"));
      }
    });
  }

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* New evaluation */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-brand-navy">{t("newTitle")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("skillLevel")}</Label>
            <Select value={skillLevel} onValueChange={setSkillLevel} disabled={pending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CEFR.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("participation")}</Label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={pending}
                  onClick={() => setParticipation(n)}
                  className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${
                    participation === n
                      ? "border-hajr-rose bg-hajr-rose text-white"
                      : "border-hajr-border bg-white text-hajr-text hover:bg-hajr-ivory"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("improvement")}</Label>
            <Select value={improvement} onValueChange={setImprovement} disabled={pending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMPROVEMENTS.map((i) => (
                  <SelectItem key={i} value={i}>{t(`imp_${i}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("selectClass")}</Label>
            <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? "" : v)} disabled={pending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noClass")}</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("note")}</Label>
            <Textarea
              value={note}
              disabled={pending}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              rows={3}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      {/* Past evaluations */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-brand-navy">{t("past")}</h3>
        {evaluations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <ul className="space-y-2">
            {evaluations.map((e) => (
              <li key={e.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{e.skillLevel}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t("participation")}: <span className="num font-medium">{e.participation}/5</span>
                  </span>
                  <ImprovementBadge v={e.improvement} label={t(`imp_${e.improvement}`)} />
                  <span className="ms-auto num text-xs text-muted-foreground">{dateFmt(e.createdAt)}</span>
                </div>
                {e.note && <p className="mt-2 text-sm text-hajr-text">{e.note}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t("by")} {e.teacherName}
                  {e.className ? ` · ${e.className}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
