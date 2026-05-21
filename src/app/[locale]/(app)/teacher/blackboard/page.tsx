import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { TeacherBlackboardList } from "./blackboard-list";

export default async function TeacherBlackboardPage() {
  const session = await requireRole("TEACHER");
  const t = await getTranslations("Blackboard");

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!teacher) {
    return <div className="p-8 text-center text-muted-foreground">{t("noTeacherProfile")}</div>;
  }

  const rooms = await prisma.blackboardRoom.findMany({
    where: { teacherId: teacher.id },
    include: {
      session: { include: { class: { select: { name: true, id: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const active = rooms.filter((r) => !r.archivedAt);
  const archived = rooms.filter((r) => !!r.archivedAt);

  return (
    <TeacherBlackboardList active={active as any} archived={archived as any} />
  );
}
