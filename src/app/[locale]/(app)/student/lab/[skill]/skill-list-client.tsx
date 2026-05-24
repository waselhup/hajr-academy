"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface Exercise {
  id: string;
  type: string;
  level: string;
  title: string;
  titleAr: string;
  description: string | null;
  descriptionAr: string | null;
  estimatedMinutes: number;
  pointsValue: number;
  attempt: { status: string; score: number | null } | null;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const STATUSES = ["not_started", "in_progress", "completed"];

export function SkillExerciseList({ exercises }: { exercises: Exercise[] }) {
  const t = useTranslations("Lab");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filtered = exercises.filter((e) => {
    if (levelFilter && e.level !== levelFilter) return false;
    if (statusFilter) {
      const status = e.attempt?.status
        ? e.attempt.status === "COMPLETED"
          ? "completed"
          : "in_progress"
        : "not_started";
      if (status !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setLevelFilter("")}
          className={`rounded-full px-3 py-1 text-xs ${
            !levelFilter ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {t("allLevels")}
        </button>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => setLevelFilter(lv === levelFilter ? "" : lv)}
            className={`rounded-full px-3 py-1 text-xs num ${
              levelFilter === lv
                ? "bg-brand-navy text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {lv}
          </button>
        ))}
        <span className="mx-1 w-px bg-gray-200" />
        {STATUSES.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st === statusFilter ? "" : st)}
            className={`rounded-full px-3 py-1 text-xs ${
              statusFilter === st
                ? "bg-hajr-deep-navy text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {st === "not_started"
              ? t("notStarted")
              : st === "in_progress"
              ? t("inProgress")
              : t("completed")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("noExercises")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const status = e.attempt?.status;
            const cta =
              status === "COMPLETED"
                ? t("reviewExercise")
                : status === "IN_PROGRESS"
                ? t("continueExercise")
                : t("startExercise");
            return (
              <Card key={e.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between">
                    <Badge variant="info" className="num">{e.level}</Badge>
                    {status === "COMPLETED" && e.attempt?.score != null && (
                      <Badge
                        variant={e.attempt.score >= 60 ? "success" : "warning"}
                        className="num"
                      >
                        {Math.round(e.attempt.score)}%
                      </Badge>
                    )}
                    {status === "IN_PROGRESS" && (
                      <Badge variant="warning">{t("inProgress")}</Badge>
                    )}
                  </div>
                  <div className="mt-3 font-semibold">
                    {isAr ? e.titleAr : e.title}
                  </div>
                  {(isAr ? e.descriptionAr : e.description) && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {isAr ? e.descriptionAr : e.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="num">{e.estimatedMinutes}</span> {t("minutes")}
                    </span>
                    <span className="num">+{e.pointsValue} {t("points")}</span>
                  </div>
                  <div className="mt-4">
                    <Button asChild size="sm" className="w-full bg-hajr-deep-navy text-white">
                      <Link href={`/${locale}/student/lab/exercise/${e.id}`}>
                        {cta}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
