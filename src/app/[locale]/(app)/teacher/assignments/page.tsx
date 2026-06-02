import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { TeacherAssignmentsClient } from "./teacher-assignments-client";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });

  let assignments: any[] = [];
  let teacherClasses: { id: string; label: string }[] = [];
  let blackboardActive: any[] = [];
  let blackboardArchived: any[] = [];
  let myExercises: any[] = [];
  let libraryExercises: any[] = [];

  if (teacher) {
    const [assignmentsRaw, rooms, mine, library, classes] = await Promise.all([
      prisma.assignment.findMany({
        where: { class: { teacherId: teacher.id } },
        include: {
          class: { select: { name: true, nameAr: true, cohortCode: true } },
          _count: { select: { submissions: true, attachmentList: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.blackboardRoom.findMany({
        where: { teacherId: teacher.id },
        include: {
          session: { include: { class: { select: { name: true, id: true } } } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.labExercise.findMany({
        where: { createdBy: session.user.id },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { attempts: true } } },
      }),
      prisma.labExercise.findMany({
        where: { isPublished: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: { _count: { select: { attempts: true } } },
      }),
      prisma.class.findMany({
        where: { teacherId: teacher.id, status: "ACTIVE" },
        select: { id: true, name: true, nameAr: true, cohortCode: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    assignments = assignmentsRaw.map((a) => ({
      id: a.id,
      title: a.title,
      titleAr: a.titleAr,
      className: locale === "ar" ? a.class.nameAr ?? a.class.name : a.class.name,
      cohortCode: a.class.cohortCode,
      dueDate: a.dueDate?.toISOString() ?? null,
      submissionCount: a._count.submissions,
      attachmentCount: a._count.attachmentList,
      createdAt: a.createdAt.toISOString(),
    }));

    teacherClasses = classes.map((c) => ({
      id: c.id,
      label: `${locale === "ar" ? c.nameAr ?? c.name : c.name} · ${c.cohortCode}`,
    }));

    blackboardActive = rooms
      .filter((r) => !r.archivedAt)
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        totalEdits: r.totalEdits,
        isActive: r.isActive,
        archivedAt: r.archivedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        session: r.session ? { class: r.session.class ? { name: r.session.class.name, id: r.session.class.id } : null } : null,
      }));
    blackboardArchived = rooms
      .filter((r) => !!r.archivedAt)
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        totalEdits: r.totalEdits,
        isActive: r.isActive,
        archivedAt: r.archivedAt!.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        session: r.session ? { class: r.session.class ? { name: r.session.class.name, id: r.session.class.id } : null } : null,
      }));

    const shape = (e: any) => ({
      id: e.id,
      type: e.type,
      level: e.level,
      title: e.title,
      titleAr: e.titleAr,
      isPublished: e.isPublished,
      attempts: e._count.attempts,
    });
    myExercises = mine.map(shape);
    libraryExercises = library.map(shape);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("Nav.assignments")}</h1>
      <TeacherAssignmentsClient
        locale={locale}
        assignments={assignments}
        teacherClasses={teacherClasses}
        blackboardActive={blackboardActive}
        blackboardArchived={blackboardArchived}
        myExercises={myExercises}
        libraryExercises={libraryExercises}
      />
    </div>
  );
}
