"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  LibraryItem,
  LibraryItemTag,
} from "@prisma/client";
import { BookOpen, FileText, Video, Headphones, Pencil } from "lucide-react";

type Row = LibraryItem & { tags: LibraryItemTag[] };

const ICONS = {
  ARTICLE: FileText,
  VIDEO: Video,
  EXERCISE: BookOpen,
  AUDIO: Headphones,
  PDF: FileText,
} as const;

export function TeacherLibraryTabs({
  locale,
  mine,
  all,
}: {
  locale: string;
  mine: Row[];
  all: Row[];
}) {
  const t = useTranslations("Library");
  const [tab, setTab] = useState<"mine" | "all">("mine");

  function renderList(rows: Row[], editable: boolean) {
    if (rows.length === 0) {
      return (
        <Card>
          <CardContent className="p-10 text-center text-hajr-gray-500">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-hajr-gray-400" />
            <p>{t("emptyTeacher")}</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((i) => {
          const Icon = ICONS[i.type];
          return (
            <Card key={i.id} className="overflow-hidden">
              <div className="relative h-28 bg-gradient-to-br from-hajr-rose/10 to-hajr-mint/10">
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
                <Badge className="absolute end-2 top-2" variant={i.isPublished ? "success" : "draft"}>
                  {i.isPublished ? t("statusPublished") : t("statusDraft")}
                </Badge>
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="text-xs uppercase text-hajr-rose">
                  {i.type} · {i.skillLevel} · {i.targetAgeTier}
                </div>
                <div className="line-clamp-2 font-semibold">{i.titleAr || i.title}</div>
                <div className="line-clamp-2 text-xs text-hajr-gray-500">
                  {i.descriptionAr || i.description}
                </div>
                {editable && (
                  <Link
                    href={`/${locale}/teacher/library/${i.id}`}
                    className="inline-flex items-center gap-1 text-xs text-hajr-rose hover:underline"
                  >
                    <Pencil className="h-3 w-3" />
                    {t("edit")}
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "all")}>
      <TabsList>
        <TabsTrigger value="mine">{t("tabMine")} ({mine.length})</TabsTrigger>
        <TabsTrigger value="all">{t("tabAll")} ({all.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="mine" className="mt-4">
        {renderList(mine, true)}
      </TabsContent>
      <TabsContent value="all" className="mt-4">
        {renderList(all, false)}
      </TabsContent>
    </Tabs>
  );
}
