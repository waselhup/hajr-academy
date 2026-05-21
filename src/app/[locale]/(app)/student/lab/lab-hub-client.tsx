"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mic, Headphones, PenLine, BookOpen, SpellCheck, Type, Sparkles, Clock, Trophy,
} from "lucide-react";

interface SkillLevel {
  skill: string;
  level: string;
  confidence: number;
  totalAttempts: number;
  totalPoints: number;
}
interface Rec {
  id: string;
  title: string;
  titleAr: string;
  type: string;
  level: string;
  estimatedMinutes: number;
  reason: string;
  reasonAr: string;
}
interface Activity {
  id: string;
  exerciseId: string;
  title: string;
  type: string;
  score: number | null;
  completedAt: string | null;
}

const SKILL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  SPEAKING: Mic,
  LISTENING: Headphones,
  WRITING: PenLine,
  READING: BookOpen,
  GRAMMAR: SpellCheck,
  VOCABULARY: Type,
};

const SKILL_ACCENT: Record<string, string> = {
  SPEAKING: "bg-brand-rose/15 text-brand-rose",
  LISTENING: "bg-brand-lavender/40 text-brand-navy",
  WRITING: "bg-brand-mint/40 text-brand-navy",
  READING: "bg-brand-lavender/40 text-brand-navy",
  GRAMMAR: "bg-brand-mint/40 text-brand-navy",
  VOCABULARY: "bg-brand-rose/15 text-brand-rose",
};

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Position within the current CEFR band, for the progress bar (0-100). */
function bandProgress(level: string, confidence: number): number {
  const idx = CEFR_ORDER.indexOf(level);
  // Each band is ~16.6% of the journey; confidence fills the current band.
  return Math.min(100, (idx / 5) * 100 + (confidence / 100) * (100 / 6));
}

export function LabHubClient({
  skillLevels,
  recommendations,
  dailyChallenge,
  recentActivity,
  weekStats,
}: {
  skillLevels: SkillLevel[];
  recommendations: Rec[];
  dailyChallenge: Rec | null;
  recentActivity: Activity[];
  weekStats: { minutes: number; completed: number };
}) {
  const t = useTranslations("Lab");
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="space-y-6">
      {/* Weekly stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-lavender/40">
              <Clock className="h-5 w-5 text-brand-navy" />
            </div>
            <div>
              <div className="text-2xl font-bold num">{weekStats.minutes}</div>
              <div className="text-xs text-muted-foreground">{t("timeStudied")}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-mint/40">
              <Trophy className="h-5 w-5 text-brand-navy" />
            </div>
            <div>
              <div className="text-2xl font-bold num">{weekStats.completed}</div>
              <div className="text-xs text-muted-foreground">{t("exercisesDone")}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-rose/15">
              <Sparkles className="h-5 w-5 text-brand-rose" />
            </div>
            <div>
              <div className="text-2xl font-bold num">
                {skillLevels.reduce((s, l) => s + l.totalPoints, 0)}
              </div>
              <div className="text-xs text-muted-foreground">{t("points")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily challenge */}
      {dailyChallenge && (
        <Link href={`/${locale}/student/lab/exercise/${dailyChallenge.id}`} className="block">
          <Card className="border-brand-rose/30 bg-brand-rose/5 transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-rose text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-brand-rose">{t("dailyChallenge")}</div>
                  <div className="font-semibold">
                    {isAr ? dailyChallenge.titleAr : dailyChallenge.title}
                  </div>
                </div>
              </div>
              <Badge variant="rose">+{t("points")}</Badge>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Skill cards */}
      <div>
        <h2 className="mb-3 text-lg font-bold">{t("skills")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skillLevels.map((s) => {
            const Icon = SKILL_ICON[s.skill] ?? BookOpen;
            const skillKey = ("skill" +
              s.skill.charAt(0) +
              s.skill.slice(1).toLowerCase()) as
              | "skillSpeaking" | "skillListening" | "skillWriting"
              | "skillReading" | "skillGrammar" | "skillVocabulary";
            return (
              <Link
                key={s.skill}
                href={`/${locale}/student/lab/${s.skill.toLowerCase()}`}
                className="block"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${SKILL_ACCENT[s.skill]}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="info">{s.level}</Badge>
                    </div>
                    <div className="mt-3 font-semibold">{t(skillKey)}</div>
                    <div className="mt-2">
                      <Progress value={bandProgress(s.level, s.confidence)} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground num">
                      {s.totalAttempts} {t("attempts")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recommendations */}
        <div>
          <h2 className="mb-3 text-lg font-bold">{t("recommended")}</h2>
          <div className="space-y-2">
            {recommendations.length === 0 && (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  {t("noExercises")}
                </CardContent>
              </Card>
            )}
            {recommendations.map((r) => (
              <Link
                key={r.id}
                href={`/${locale}/student/lab/exercise/${r.id}`}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div className="font-medium">{isAr ? r.titleAr : r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {isAr ? r.reasonAr : r.reason}
                      </div>
                    </div>
                    <Badge variant="outline">{r.level}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-3 text-lg font-bold">{t("recentActivity")}</h2>
          <Card>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">
                  {t("noExercises")}
                </div>
              ) : (
                <ul className="divide-y">
                  {recentActivity.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/${locale}/student/lab/exercise/${a.exerciseId}`}
                        className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-gray-50"
                      >
                        <span className="truncate">{a.title}</span>
                        {a.score != null && (
                          <Badge
                            variant={a.score >= 60 ? "success" : "warning"}
                            className="num shrink-0"
                          >
                            {Math.round(a.score)}%
                          </Badge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
