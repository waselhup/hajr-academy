/**
 * Messaging permission rules.
 *
 *  - STUDENT  → may message: their teachers, any admin
 *  - TEACHER  → may message: parents of their students, any admin
 *  - PARENT   → may message: their children's teachers, any admin
 *  - ADMIN / SUPER_ADMIN → may message: anyone
 *
 * `getAllowedRecipients` returns the set of users the given user may
 * start a conversation with. `canMessage` checks a single target.
 */
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export interface RecipientOption {
  userId: string;
  name: string;
  role: Role;
  email: string;
}

/** Resolve every user `userId` (role `role`) is allowed to message. */
export async function getAllowedRecipients(
  userId: string,
  role: Role
): Promise<RecipientOption[]> {
  const map = new Map<string, RecipientOption>();
  const add = (u: {
    id: string;
    name: string;
    role: Role;
    email: string;
  }) => {
    if (u.id !== userId) map.set(u.id, { userId: u.id, name: u.name, role: u.role, email: u.email });
  };

  // Everyone can reach admins.
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true, name: true, role: true, email: true },
    });
    admins.forEach(add);
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    // Admins can message anyone active.
    const all = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, email: true },
      take: 500,
    });
    all.forEach(add);
  } else if (role === "STUDENT") {
    // Student → teachers of the classes they're enrolled in.
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (student) {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id, status: "ACTIVE" },
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: { select: { id: true, name: true, role: true, email: true } },
                },
              },
            },
          },
        },
      });
      enrollments.forEach((e) => add(e.class.teacher.user));
    }
  } else if (role === "TEACHER") {
    // Teacher → parents of students in the teacher's classes.
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (teacher) {
      const enrollments = await prisma.enrollment.findMany({
        where: { class: { teacherId: teacher.id }, status: "ACTIVE" },
        include: {
          student: {
            include: {
              parentLinks: {
                include: {
                  parent: {
                    include: {
                      user: {
                        select: { id: true, name: true, role: true, email: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      for (const e of enrollments) {
        for (const link of e.student.parentLinks) add(link.parent.user);
      }
    }
  } else if (role === "PARENT") {
    // Parent → teachers of their children's classes.
    const parent = await prisma.parentProfile.findUnique({
      where: { userId },
      include: { childLinks: { select: { studentId: true } } },
    });
    if (parent) {
      const childIds = parent.childLinks.map((l) => l.studentId);
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: { in: childIds }, status: "ACTIVE" },
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: { select: { id: true, name: true, role: true, email: true } },
                },
              },
            },
          },
        },
      });
      enrollments.forEach((e) => add(e.class.teacher.user));
    }
  }

  return [...map.values()];
}

/** Whether `userId` (role `role`) may message `targetUserId`. */
export async function canMessage(
  userId: string,
  role: Role,
  targetUserId: string
): Promise<boolean> {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  const allowed = await getAllowedRecipients(userId, role);
  return allowed.some((r) => r.userId === targetUserId);
}
