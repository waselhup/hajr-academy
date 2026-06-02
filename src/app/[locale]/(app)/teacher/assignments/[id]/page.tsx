import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { AttachmentList } from "@/components/assignments/attachment-view";
import { AssignmentGradingClient } from "./grading-client";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations("Assignments");
  const ar = locale === "ar";

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) notFound();

  // Ownership-scoped fetch: only the teacher's own assignment resolves.
  const assignment = await prisma.assignment.findFirst({
    where: { id, class: { teacherId: teacher.id } },
    include: {
      class: { select: { name: true, nameAr: true, cohortCode: true } },
      attachmentList: { orderBy: { createdAt: "asc" } },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: {
          student: { select: { user: { select: { name: true } } } },
          attachmentList: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!assignment) notFound();

  const material = assignment.attachmentList.map((a) => ({
    id: a.id,
    kind: a.kind as any,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    durationSec: a.durationSec,
  }));

  const submissions = assignment.submissions.map((s) => ({
    id: s.id,
    studentName: s.student.user.name ?? (ar ? "طالب" : "Student"),
    content: s.content,
    grade: s.grade,
    feedback: s.feedback,
    submittedAt: s.submittedAt.toISOString(),
    gradedAt: s.gradedAt?.toISOString() ?? null,
    attachments: s.attachmentList.map((a) => ({
      id: a.id,
      kind: a.kind as any,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      durationSec: a.durationSec,
    })),
  }));

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/teacher/assignments`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToList")}
      </Link>

      {/* Assignment material */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <h1 className="text-xl font-bold">{ar ? assignment.titleAr ?? assignment.title : assignment.title}</h1>
            <p className="text-xs text-muted-foreground">
              {ar ? assignment.class.nameAr ?? assignment.class.name : assignment.class.name} ·{" "}
              <span className="num">{assignment.class.cohortCode}</span>
              {assignment.dueDate && (
                <>
                  {" · "}
                  {t("due")}{" "}
                  <span className="num">
                    {new Date(assignment.dueDate).toLocaleDateString(ar ? "ar-SA" : "en-US")}
                  </span>
                </>
              )}
            </p>
          </div>
          {assignment.description && <p className="text-sm">{assignment.description}</p>}
          {material.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("materialLabel")}</p>
              <AttachmentList attachments={material} source="assignment" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions + grading */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">
          {t("submissionsHeading")} (<span className="num">{submissions.length}</span>)
        </h2>
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t("noSubmissionsYet")}
            </CardContent>
          </Card>
        ) : (
          <AssignmentGradingClient locale={locale} submissions={submissions} />
        )}
      </div>
    </div>
  );
}
