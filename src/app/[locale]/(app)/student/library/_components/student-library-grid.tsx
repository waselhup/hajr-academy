"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { BookOpen, FileText, Video, Headphones, CheckCircle2 } from "lucide-react";

type Item = {
  id: string;
  title: string;
  titleAr: string;
  description: string | null;
  descriptionAr: string | null;
  type: string;
  skillLevel: string;
  targetAgeTier: string;
  durationMinutes: number;
  thumbnailUrl: string | null;
  progressPct: number;
  status: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ARTICLE: FileText,
  VIDEO: Video,
  EXERCISE: BookOpen,
  AUDIO: Headphones,
  PDF: FileText,
};

function ProgressRing({ pct, completed }: { pct: number; completed: boolean }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      aria-label={`${pct}%`}
      className="shrink-0"
    >
      <circle cx="18" cy="18" r={r} stroke="#E2E8F0" strokeWidth="3" fill="none" />
      <circle
        cx="18"
        cy="18"
        r={r}
        stroke={completed ? "#B5E5D8" : "#B86E7B"}
        strokeWidth="3"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      {completed && (
        <g transform="translate(11.5, 11.5)">
          <path
            d="M2 7 L6 11 L13 4"
            stroke="#0F766E"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

export function StudentLibraryGrid({
  items,
  ageTier,
}: {
  items: Item[];
  ageTier: string;
}) {
  const t = useTranslations("Library");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [type, setType] = useState<string>("ALL");
  const [skill, setSkill] = useState<string>("ALL");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (type !== "ALL" && i.type !== type) return false;
      if (skill !== "ALL" && i.skillLevel !== "ALL" && i.skillLevel !== skill) return false;
      if (q) {
        const ql = q.toLowerCase();
        if (
          !i.title.toLowerCase().includes(ql) &&
          !i.titleAr.toLowerCase().includes(ql)
        )
          return false;
      }
      return true;
    });
  }, [items, type, skill, q]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <Input
            placeholder={t("searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="student-library-search"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder={t("type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allTypes")}</SelectItem>
              <SelectItem value="ARTICLE">{t("typeArticle")}</SelectItem>
              <SelectItem value="VIDEO">{t("typeVideo")}</SelectItem>
              <SelectItem value="EXERCISE">{t("typeExercise")}</SelectItem>
              <SelectItem value="AUDIO">{t("typeAudio")}</SelectItem>
              <SelectItem value="PDF">{t("typePdf")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger>
              <SelectValue placeholder={t("skillLevel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allLevels")}</SelectItem>
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="text-xs text-hajr-gray-500">
        {t("ageTierFilter")} · <Badge variant="info">{ageTier}</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-hajr-gray-500">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-hajr-gray-400" />
            <p className="text-base">{t("emptyStudent")}</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="student-library-list"
        >
          {filtered.map((i) => {
            const Icon = ICONS[i.type] ?? FileText;
            const completed = i.status === "COMPLETED";
            return (
              <Link key={i.id} href={`./library/${i.id}`} className="group">
                <Card className="h-full overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-card-hover">
                  <div className="relative h-32 bg-gradient-to-br from-hajr-rose/10 to-hajr-mint/10">
                    {i.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={i.thumbnailUrl}
                        alt={i.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon className="h-10 w-10 text-hajr-rose/60" />
                      </div>
                    )}
                    <Badge className="absolute top-2 start-2" variant="outline">
                      {i.type}
                    </Badge>
                    {completed && (
                      <div className="absolute top-2 end-2 rounded-full bg-hajr-mint/90 p-1">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="line-clamp-2 font-semibold text-hajr-deep-navy">
                      {isAr ? i.titleAr || i.title : i.title}
                    </div>
                    <div className="line-clamp-2 text-xs text-hajr-gray-500">
                      {isAr ? i.descriptionAr || i.description : i.description}
                    </div>
                    <div className="flex items-center justify-between pt-1 text-xs text-hajr-gray-500">
                      <span>
                        {i.durationMinutes} {t("minutes")} · {i.skillLevel}
                      </span>
                      <ProgressRing pct={i.progressPct} completed={completed} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
