"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type {
  LibraryItem,
  LibraryItemTag,
  LibraryItemType,
} from "@prisma/client";
import { BookOpen, Video, FileText, Headphones, Pencil } from "lucide-react";

type ItemRow = LibraryItem & { tags: LibraryItemTag[] };

const TYPE_ICON: Record<LibraryItemType, React.ComponentType<{ className?: string }>> = {
  ARTICLE: FileText,
  VIDEO: Video,
  EXERCISE: BookOpen,
  AUDIO: Headphones,
  PDF: FileText,
};

export function LibraryAdminGrid({
  locale,
  items,
}: {
  locale: string;
  items: ItemRow[];
}) {
  const t = useTranslations("Library");
  const [type, setType] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (type !== "ALL" && i.type !== type) return false;
      if (status === "PUBLISHED" && !i.isPublished) return false;
      if (status === "DRAFT" && i.isPublished) return false;
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
  }, [items, type, status, q]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <Input
            placeholder={t("searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="library-search"
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder={t("status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
              <SelectItem value="PUBLISHED">{t("statusPublished")}</SelectItem>
              <SelectItem value="DRAFT">{t("statusDraft")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-hajr-gray-500">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-hajr-gray-400" />
            <p className="text-base">{t("emptyAdmin")}</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="library-admin-list"
        >
          {filtered.map((i) => {
            const Icon = TYPE_ICON[i.type];
            return (
              <Card key={i.id} className="flex flex-col overflow-hidden">
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
                  <div className="absolute end-2 top-2 flex gap-1">
                    <Badge variant={i.isPublished ? "success" : "draft"}>
                      {i.isPublished ? t("statusPublished") : t("statusDraft")}
                    </Badge>
                  </div>
                </div>
                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                  <div className="text-xs uppercase tracking-wide text-hajr-rose">
                    {i.type} · {i.skillLevel} · {i.targetAgeTier}
                  </div>
                  <div className="line-clamp-2 font-semibold text-hajr-deep-navy">
                    {i.titleAr || i.title}
                  </div>
                  <div className="line-clamp-2 text-xs text-hajr-gray-500">
                    {i.descriptionAr || i.description}
                  </div>
                  <div className="mt-auto flex items-center justify-between text-xs text-hajr-gray-500">
                    <span>
                      {i.durationMinutes} {t("minutes")} · {i.viewCount} {t("views")}
                    </span>
                    <Link
                      href={`/${locale}/admin/library/${i.id}`}
                      className="inline-flex items-center gap-1 text-hajr-rose hover:underline"
                    >
                      <Pencil className="h-3 w-3" /> {t("edit")}
                    </Link>
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
