/**
 * Student scope — resolve the set of classes / teachers / programs that
 * a student is part of, so we can filter Lab exercises, mock exams,
 * activity events, etc. to only the content their actual teachers gave
 * them. Never trust the client; every list query must be funneled
 * through `getStudentScope`.
 */
import { prisma } from "@/lib/prisma";

export interface StudentScope {
  studentId: string;
  userId: string;
  classIds: string[];
  teacherIds: string[];
  /** TeacherProfile.userId — the User row, useful for messaging / display. */
  teacherUserIds: string[];
  programIds: string[];
}

export async function getStudentScope(userId: string): Promise<StudentScope | null> {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          class: {
            select: {
              id: true,
              teacherId: true,
              programId: true,
              teacher: { select: { userId: true } },
            },
          },
        },
      },
    },
  });
  if (!student) return null;

  const classIds = student.enrollments.map((e) => e.class.id);
  const teacherIds = Array.from(
    new Set(student.enrollments.map((e) => e.class.teacherId))
  );
  const teacherUserIds = Array.from(
    new Set(
      student.enrollments
        .map((e) => e.class.teacher?.userId)
        .filter((v): v is string => !!v)
    )
  );
  const programIds = Array.from(
    new Set(
      student.enrollments
        .map((e) => e.class.programId)
        .filter((v): v is string => !!v)
    )
  );

  return {
    studentId: student.id,
    userId,
    classIds,
    teacherIds,
    teacherUserIds,
    programIds,
  };
}
