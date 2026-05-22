/**
 * Shared helper for the parent AI tools: resolve which linked child a
 * parent means, by name — or implicitly when they have only one child.
 */
import { prisma } from "@/lib/prisma";

export async function resolveChildForParent(
  parentId: string,
  childName?: string
): Promise<{ studentId: string; name: string } | { error: string }> {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId },
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
    },
  });
  if (links.length === 0) {
    return { error: "You have no linked children. / لا يوجد أبناء مرتبطون." };
  }
  if (!childName) {
    if (links.length === 1) {
      return {
        studentId: links[0].studentId,
        name: links[0].student.user.name,
      };
    }
    return {
      error:
        "You have multiple children — please specify which one. / لديك أكثر من ابن، يرجى التحديد.",
    };
  }
  const q = childName.trim().toLowerCase();
  const match = links.find(
    (l) =>
      l.student.user.name.toLowerCase().includes(q) ||
      (l.student.user.nameAr ?? "").toLowerCase().includes(q)
  );
  if (!match) {
    return { error: `No linked child matching "${childName}".` };
  }
  return { studentId: match.studentId, name: match.student.user.name };
}
