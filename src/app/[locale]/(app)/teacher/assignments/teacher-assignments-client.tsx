"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherBlackboardList } from "../blackboard/blackboard-list";
import { TeacherLabClient } from "../lab/teacher-lab-client";

type Assignment = {
  id: string;
  title: string;
  titleAr: string | null;
  className: string;
  cohortCode: string;
  dueDate: string | null;
  submissionCount: number;
  createdAt: string;
};

type Room = {
  id: string;
  name: string;
  description: string | null;
  totalEdits: number;
  isActive: boolean;
  archivedAt: string | null;
  updatedAt: string;
  createdAt: string;
  session: { class: { name: string; id: string } | null } | null;
};

type Exercise = {
  id: string;
  type: string;
  level: string;
  title: string;
  titleAr: string;
  isPublished: boolean;
  attempts: number;
};

export function TeacherAssignmentsClient({
  locale,
  assignments,
  blackboardActive,
  blackboardArchived,
  myExercises,
  libraryExercises,
}: {
  locale: string;
  assignments: Assignment[];
  blackboardActive: Room[];
  blackboardArchived: Room[];
  myExercises: Exercise[];
  libraryExercises: Exercise[];
}) {
  const t = useTranslations();

  return (
    <Tabs defaultValue="assignments" className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
        <TabsTrigger value="assignments">{t("Assignments.tabAssignments")}</TabsTrigger>
        <TabsTrigger value="blackboard">{t("Assignments.tabBlackboard")}</TabsTrigger>
        <TabsTrigger value="lab">{t("Assignments.tabLab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="assignments" className="space-y-3">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {locale === "ar" ? "لا توجد واجبات بعد." : "No assignments yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{locale === "ar" ? a.titleAr ?? a.title : a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.className} · <span className="num">{a.cohortCode}</span>
                      {a.dueDate && (
                        <>
                          {" · "}
                          <span className="num">
                            {new Date(a.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <Badge variant="default" className="num">
                    {a.submissionCount}{" "}
                    {locale === "ar" ? "تسليم" : "submissions"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="blackboard">
        <TeacherBlackboardList active={blackboardActive as any} archived={blackboardArchived as any} />
      </TabsContent>

      <TabsContent value="lab">
        <TeacherLabClient
          myExercises={myExercises as any}
          libraryExercises={libraryExercises as any}
        />
      </TabsContent>
    </Tabs>
  );
}
