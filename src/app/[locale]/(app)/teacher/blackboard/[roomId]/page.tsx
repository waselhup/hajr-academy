import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";

const BlackboardClient = dynamic(
  () => import("@/components/blackboard/BlackboardClient").then((m) => m.BlackboardClient),
  { ssr: false }
);

export default async function TeacherBlackboardRoomPage({
  params,
}: {
  params: { roomId: string; locale: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/ar/login");

  const role = session.user.role;
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    redirect("/ar/login");
  }

  const room = await prisma.blackboardRoom.findUnique({
    where: { id: params.roomId },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      session: {
        include: {
          class: {
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
                include: { student: { include: { user: { select: { name: true, id: true } } } } },
              },
            },
          },
        },
      },
      permissions: { where: { revokedAt: null } },
    },
  });

  if (!room) redirect(`/${params.locale}/teacher/blackboard`);

  if (role === "TEACHER") {
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
    if (!teacher || room.teacherId !== teacher.id) {
      redirect(`/${params.locale}/teacher/blackboard`);
    }
  }

  const enrolledStudents = (room.session?.class?.enrollments ?? []).map((e) => ({
    id: e.student.id,
    userId: e.student.user.id,
    name: e.student.user.name,
  }));

  const grantedStudentIds = room.permissions.map((p) => p.studentId);

  return (
    <BlackboardClient
      roomId={room.id}
      roomName={room.name}
      className={room.session?.class?.name ?? null}
      userId={session.user.id}
      userName={session.user.name ?? "Teacher"}
      isHost={true}
      canEdit={true}
      isArchived={!!room.archivedAt}
      allowStudentEdit={room.allowStudentEdit}
      grantedStudentIds={grantedStudentIds}
      enrolledStudents={enrolledStudents}
    />
  );
}
