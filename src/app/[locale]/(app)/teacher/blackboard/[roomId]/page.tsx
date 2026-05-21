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

  let room: any;
  let enrolledStudents: any[] = [];
  let grantedStudentIds: string[] = [];

  try {
    room = await prisma.blackboardRoom.findUnique({
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

    enrolledStudents = (room.session?.class?.enrollments ?? []).map((e: any) => ({
      id: e.student.id,
      userId: e.student.user.id,
      name: e.student.user.name,
    }));

    grantedStudentIds = room.permissions.map((p: any) => p.studentId);
  } catch (e) {
    console.error("[teacher-blackboard-room] DB query failed:", e);
    redirect(`/${params.locale}/teacher/blackboard`);
  }

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
