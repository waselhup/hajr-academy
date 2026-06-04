"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherBlackboardList } from "../blackboard/blackboard-list";
import { TeacherLabClient } from "../lab/teacher-lab-client";
import { CreateAssignmentDialog } from "./create-assignment-dialog";
import { Paperclip, ChevronRight, Users, UserCheck } from "lucide-react";

type Assignment = {
  id: string;
  title: string;
  titleAr: string | null;
  className: string;
  cohortCode: string;
  dueDate: string | null;
  submissionCount: number;
  attachmentCount: number;
  audience: "ALL_CLASS" | "SELECTED";
  targetCount: number;
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
  teacherClasses,
  classStudents,
  blackboardActive,
  blackboardArchived,
  myExercises,
  libraryExercises,
}: {
  locale: string;
  assignments: Assignment[];
  teacherClasses: { id: string; label: string }[];
  classStudents: Record<string, { id: string; name: string }[]>;
  blackboardActive: Room[];
  blackboardArchived: Room[];
  myExercises: Exercise[];
  libraryExercises: Exercise[];
}) {
  const t = useTranslations();
  const ar = locale === "ar";

  return (
    <Tabs defaultValue="assignments" className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
        <TabsTrigger value="assignments">{t("Assignments.tabAssignments")}</TabsTrigger>
        <TabsTrigger value="blackboard">{t("Assignments.tabBlackboard")}</TabsTrigger>
        <TabsTrigger value="lab">{t("Assignments.tabLab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="assignments" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("Assignments.teacherListHint")}</p>
          <CreateAssignmentDialog locale={locale} classes={teacherClasses} classStudents={classStudents} />
        </div>
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {teacherClasses.length === 0
                ? t("Assignments.noClassesYet")
                : ar
                ? "لا توجد واجبات بعد."
                : "No assignments yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <Link key={a.id} href={`/${locale}/teacher/assignments/${a.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{ar ? a.titleAr ?? a.title : a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.className} · <span className="num">{a.cohortCode}</span>
                        {a.dueDate && (
                          <>
                            {" · "}
                            <span className="num">
                              {new Date(a.dueDate).toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-US")}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.audience === "SELECTED" ? (
                        <Badge variant="outline" className="num gap-1">
                          <UserCheck className="h-3 w-3" />
                          {a.targetCount} {ar ? "طالب" : a.targetCount === 1 ? "student" : "students"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {t("Assignments.audienceAllChip")}
                        </Badge>
                      )}
                      {a.attachmentCount > 0 && (
                        <Badge variant="outline" className="num gap-1">
                          <Paperclip className="h-3 w-3" />
                          {a.attachmentCount}
                        </Badge>
                      )}
                      <Badge variant="default" className="num">
                        {a.submissionCount} {ar ? "تسليم" : "submissions"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
