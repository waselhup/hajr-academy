"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ChevronDown } from "lucide-react";

interface ReviewItem {
  orderIndex: number;
  section: string | null;
  questionText: string;
  type: string | null;
  options: { id: string; text: string }[] | null;
  topic: string | null;
  yourAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean | null;
  explanation: string | null;
  explanationAr: string | null;
}

interface ResultsData {
  totalScore: number;
  sectionScores: Record<string, number>;
  percentile: number;
  passed: boolean;
  passingScore: number;
  timeSpentSec: number;
  totalMinutes: number;
  examTitle: string;
  examTitleAr: string;
  writingEval: any;
  review: ReviewItem[];
}

export function ExamResultsClient({ data }: { data: ResultsData }) {
  const t = useTranslations("Exam");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [expanded, setExpanded] = useState<number | null>(null);

  const mins = Math.floor(data.timeSpentSec / 60);
  const sectionEntries = Object.entries(data.sectionScores ?? {});

  // Topics the student did worst on (from incorrect answers).
  const weakTopics = Array.from(
    new Set(
      data.review
        .filter((r) => r.isCorrect === false && r.topic)
        .map((r) => r.topic as string)
    )
  ).slice(0, 4);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isAr ? data.examTitleAr : data.examTitle} — {t("results")}
      </h1>

      {/* Overall score */}
      <Card className={data.passed ? "border-brand-mint" : "border-amber-200"}>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          {data.passed ? (
            <CheckCircle2 className="h-12 w-12 text-brand-mint" />
          ) : (
            <XCircle className="h-12 w-12 text-amber-500" />
          )}
          <div className="text-5xl font-bold num">
            {Math.round(data.totalScore)}%
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={data.passed ? "success" : "warning"}>
              {data.passed ? t("passed") : t("failed")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t("passingScore")}:{" "}
              <span className="num">{data.passingScore}%</span>
            </span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {t("percentile")}:{" "}
            <span className="num font-medium">{data.percentile}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("sectionBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectionEntries.map(([section, score]) => (
              <div key={section}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{section}</span>
                  <span className="num font-medium">{Math.round(score)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-hajr-deep-navy"
                    style={{ width: `${Math.min(100, score)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Time + weak areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("timeAnalysis")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              {t("timeSpent")}:{" "}
              <span className="num font-medium">{mins}</span> {t("minutes")}{" "}
              <span className="text-muted-foreground">
                / <span className="num">{data.totalMinutes}</span>
              </span>
            </div>
            {weakTopics.length > 0 && (
              <div>
                <div className="mb-1 font-medium">{t("weakAreas")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {weakTopics.map((topic) => (
                    <Badge key={topic} variant="warning">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Question-by-question review */}
      <div>
        <h2 className="mb-3 text-lg font-bold">{t("questionReview")}</h2>
        <div className="space-y-2">
          {data.review.map((r, i) => {
            const open = expanded === i;
            const yourId = String(
              (r.yourAnswer as Record<string, unknown>)?.toString?.() ??
                r.yourAnswer ??
                ""
            );
            const correctId = String(r.correctAnswer ?? "").replace(/"/g, "");
            return (
              <Card key={i}>
                <button
                  className="flex w-full items-center justify-between gap-3 p-4 text-start"
                  onClick={() => setExpanded(open ? null : i)}
                >
                  <div className="flex items-center gap-2">
                    {r.isCorrect === true ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-mint" />
                    ) : r.isCorrect === false ? (
                      <XCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                    <span className="text-sm">
                      <span className="num">{i + 1}.</span> {r.questionText}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div className="border-t px-4 py-3 text-sm">
                    {r.options && (
                      <div className="space-y-1">
                        {r.options.map((opt) => {
                          const isCorrect = opt.id === correctId;
                          const isYours = opt.id === yourId;
                          return (
                            <div
                              key={opt.id}
                              className={`rounded-md p-2 ${
                                isCorrect
                                  ? "bg-brand-mint/30"
                                  : isYours
                                  ? "bg-red-50"
                                  : ""
                              }`}
                            >
                              <span className="num font-medium">
                                {opt.id.toUpperCase()}.
                              </span>{" "}
                              {opt.text}
                              {isCorrect && (
                                <Badge variant="success" className="ms-2">
                                  {t("correctAnswer")}
                                </Badge>
                              )}
                              {isYours && !isCorrect && (
                                <Badge variant="warning" className="ms-2">
                                  {t("yourAnswer")}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {(isAr ? r.explanationAr : r.explanation) && (
                      <div className="mt-2 rounded-md bg-hajr-hover/20 p-2">
                        <span className="font-medium">{t("whyCorrect")}: </span>
                        {isAr ? r.explanationAr : r.explanation}
                      </div>
                    )}
                    {r.topic && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t("topic")}: {r.topic}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <Button asChild className="bg-brand-navy text-white">
        <Link href={`/${locale}/student/exams`}>{t("title")}</Link>
      </Button>
    </div>
  );
}
