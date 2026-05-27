"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RefreshCcw, BookOpen, GraduationCap, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

type VocabItem = { term: string; translationAr: string; example: string };
type GrammarItem = { point: string; example: string };

export type LessonSummaryData = {
  id: string;
  sessionId: string;
  summaryEn: string;
  summaryAr: string;
  keyVocab: VocabItem[] | null;
  grammarPoints: GrammarItem[] | null;
  homework: string | null;
  homeworkAr: string | null;
  teacherActions: string | null;
  teacherActionsAr: string | null;
  confidence: number | null;
  generatedAt: string;
};

interface Props {
  sessionId: string;
  className: string;
  summary: LessonSummaryData | null;
  editable: boolean;
  canRegenerate: boolean;
}

export function LessonSummaryView({
  sessionId,
  className,
  summary: initial,
  editable,
  canRegenerate,
}: Props) {
  const t = useTranslations("LessonAi");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [summary, setSummary] = useState<LessonSummaryData | null>(initial);
  const [busy, setBusy] = useState(false);
  const [homework, setHomework] = useState({
    en: initial?.homework ?? "",
    ar: initial?.homeworkAr ?? "",
  });
  const [actions, setActions] = useState({
    en: initial?.teacherActions ?? "",
    ar: initial?.teacherActionsAr ?? "",
  });
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  async function regenerate() {
    setBusy(true);
    try {
      const r = await fetch(`/api/sessions/${sessionId}/summary`, {
        method: "POST",
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "failed");
      const g = await fetch(`/api/sessions/${sessionId}/summary`);
      const j = await g.json();
      setSummary(j.summary);
      setHomework({
        en: j.summary?.homework ?? "",
        ar: j.summary?.homeworkAr ?? "",
      });
      setActions({
        en: j.summary?.teacherActions ?? "",
        ar: j.summary?.teacherActionsAr ?? "",
      });
      toast.success(t("regenerated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdits() {
    setBusy(true);
    try {
      const r = await fetch(`/api/sessions/${sessionId}/summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homework: homework.en,
          homeworkAr: homework.ar,
          teacherActions: actions.en,
          teacherActionsAr: actions.ar,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "failed");
      toast.success(t("saved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (!summary) {
    return (
      <Card className="border-brand-mint">
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <Sparkles className="h-10 w-10 text-brand-rose" />
          <p className="text-sm text-muted-foreground">{t("noSummaryYet")}</p>
          {canRegenerate && (
            <Button onClick={regenerate} disabled={busy} className="bg-brand-navy text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 me-2" />}
              {t("generateNow")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const confidencePct = Math.round((summary.confidence ?? 0) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-brand-navy">
            <Sparkles className="h-5 w-5 text-brand-rose" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{className}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t("confidence")}:</span>
            <span className="font-semibold text-brand-navy">{confidencePct}%</span>
          </div>
          {canRegenerate && (
            <Button onClick={regenerate} disabled={busy} variant="outline" className="border-brand-navy">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 me-2" />}
              {t("regenerate")}
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-brand-ivory border-brand-mint">
        <CardHeader>
          <CardTitle className="text-brand-navy text-lg">{t("summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">
            {isAr ? summary.summaryAr : summary.summaryEn}
          </p>
        </CardContent>
      </Card>

      {summary.keyVocab && summary.keyVocab.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-navy text-lg">
              <BookOpen className="h-4 w-4 text-brand-rose" />
              {t("keyVocab")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.keyVocab.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setFlipped((s) => ({ ...s, [i]: !s[i] }))}
                  className="text-start rounded-lg border-2 border-brand-mint bg-white p-4 transition hover:border-brand-rose min-h-[88px]"
                >
                  {!flipped[i] ? (
                    <>
                      <div className="font-semibold text-brand-navy">{v.term}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t("tapToFlip")}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-brand-rose" dir="rtl">
                        {v.translationAr}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        {v.example}
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {summary.grammarPoints && summary.grammarPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-navy text-lg">
              <GraduationCap className="h-4 w-4 text-brand-rose" />
              {t("grammarPoints")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.grammarPoints.map((g, i) => (
                <li key={i} className="border-s-4 border-brand-mint ps-3">
                  <div className="font-medium text-brand-navy">{g.point}</div>
                  <div className="text-sm italic text-muted-foreground">{g.example}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brand-navy text-lg">
            <ClipboardList className="h-4 w-4 text-brand-rose" />
            {t("homework")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {editable ? (
            <>
              <Textarea
                value={isAr ? homework.ar : homework.en}
                onChange={(e) =>
                  setHomework((s) =>
                    isAr ? { ...s, ar: e.target.value } : { ...s, en: e.target.value }
                  )
                }
                placeholder={t("homeworkPlaceholder")}
                rows={3}
              />
            </>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {isAr ? summary.homeworkAr : summary.homework}
            </p>
          )}
        </CardContent>
      </Card>

      {editable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-brand-navy text-lg">
              {t("teacherActions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={isAr ? actions.ar : actions.en}
              onChange={(e) =>
                setActions((s) =>
                  isAr ? { ...s, ar: e.target.value } : { ...s, en: e.target.value }
                )
              }
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <Button onClick={saveEdits} disabled={busy} className="bg-brand-rose text-white">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        {t("generatedAt")}: {new Date(summary.generatedAt).toLocaleString(isAr ? "ar" : "en")}
      </div>
    </div>
  );
}
