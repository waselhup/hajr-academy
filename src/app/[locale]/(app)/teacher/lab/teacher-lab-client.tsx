"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, ClipboardCheck, FlaskConical } from "lucide-react";

interface Exercise {
  id: string;
  type: string;
  level: string;
  title: string;
  titleAr: string;
  isPublished: boolean;
  attempts: number;
}

export function TeacherLabClient({
  myExercises,
  libraryExercises,
}: {
  myExercises: Exercise[];
  libraryExercises: Exercise[];
}) {
  const t = useTranslations("Lab");
  const isAr = useLocale() === "ar";
  const router = useRouter();

  async function togglePublish(ex: Exercise) {
    await fetch(`/api/teacher/lab/exercises/${ex.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !ex.isPublished }),
    });
    router.refresh();
  }

  const ExerciseRow = ({ ex, owned }: { ex: Exercise; owned: boolean }) => (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="truncate font-medium text-hajr-deep-navy">{isAr ? ex.titleAr : ex.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{ex.type}</Badge>
            <span className="num">{ex.level}</span>
            <span className="num">{ex.attempts} {t("attempts")}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={ex.isPublished ? "success" : "outline"}>
            {ex.isPublished ? t("published") : t("draft")}
          </Badge>
          {owned && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href={`/teacher/lab/${ex.id}/edit`}>
                  <Pencil className="me-1.5 h-3.5 w-3.5" />{isAr ? "تعديل" : "Edit"}
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => togglePublish(ex)}>
                {ex.isPublished ? t("unpublish") : t("publish")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/teacher/lab/review">
            <ClipboardCheck className="me-2 h-4 w-4" />
            {isAr ? "تقييم التسجيلات والكتابة" : "Grade speaking & writing"}
          </Link>
        </Button>
        <Button asChild variant="cta">
          <Link href="/teacher/lab/create">
            <Plus className="me-2 h-4 w-4" />
            {isAr ? "تمرين جديد" : "New exercise"}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">{t("myExercises")}</TabsTrigger>
          <TabsTrigger value="library">{t("publicLibrary")}</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="space-y-2">
          {myExercises.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="icon-chip h-12 w-12"><FlaskConical className="h-6 w-6" /></span>
                <p className="text-sm text-muted-foreground">{t("noExercises")}</p>
                <Button asChild variant="cta" size="sm">
                  <Link href="/teacher/lab/create"><Plus className="me-2 h-4 w-4" />{isAr ? "أنشئ أول تمرين" : "Create your first exercise"}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            myExercises.map((ex) => <ExerciseRow key={ex.id} ex={ex} owned />)
          )}
        </TabsContent>
        <TabsContent value="library" className="space-y-2">
          {libraryExercises.map((ex) => <ExerciseRow key={ex.id} ex={ex} owned={false} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
