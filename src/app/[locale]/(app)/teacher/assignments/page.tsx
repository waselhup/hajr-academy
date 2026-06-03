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
  let classStudents: Record<string, { id: string; name: string }[]> = {};
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
          _count: { select: { submissions: true, attachmentList: true, targets: true } },
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
        select: {
          id: true,
          name: true,
          nameAr: true,
          cohortCode: true,
          // Active roster for the "specific students" picker. Only ACTIVE
          // enrollments — the same set the server validates a target against.
          enrollments: {
            where: { status: "ACTIVE" },
            select: {
              student: {
                select: { id: true, user: { select: { name: true, nameAr: true } } },
              },
            },
          },
        },
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
      // Audience chip: ALL_CLASS → "All class"; SELECTED → "N students".
      audience: a.audience,
      targetCount: a._count.targets,
      createdAt: a.createdAt.toISOString(),
    }));

    teacherClasses = classes.map((c) => ({
      id: c.id,
      label: `${locale === "ar" ? c.nameAr ?? c.name : c.name} · ${c.cohortCode}`,
    }));

    // Per-class active roster for the picker, localized name with fallback.
    classStudents = Object.fromEntries(
      classes.map((c) => [
        c.id,
        c.enrollments
          .map((e) => ({
            id: e.student.id,
            name:
              (locale === "ar"
                ? e.student.user.nameAr ?? e.student.user.name
                : e.student.user.name) || e.student.user.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en")),
      ])
    );

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
        classStudents={classStudents}
        blackboardActive={blackboardActive}
        blackboardArchived={blackboardArchived}
        myExercises={myExercises}
        libraryExercises={libraryExercises}
      />
    </div>
  );
}
