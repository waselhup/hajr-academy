import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";

const BlackboardClient = dynamic(
  () => import("@/components/blackboard/BlackboardClient").then((m) => m.BlackboardClient),
  { ssr: false }
);

export default async function StudentBlackboardRoomPage({
  params,
}: {
  params: { roomId: string; locale: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/ar/login");

  if (session.user.role !== "STUDENT") redirect("/ar/login");

  let student: any;
  let room: any;

  try {
    student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!student) redirect(`/${params.locale}/student`);

    room = await prisma.blackboardRoom.findUnique({
      where: { id: params.roomId },
      include: {
        teacher: { include: { user: { select: { name: true } } } },
        session: {
          include: {
            class: {
              include: {
                enrollments: { where: { studentId: student.id, status: "ACTIVE" } },
              },
            },
          },
        },
        permissions: { where: { studentId: student.id, revokedAt: null } },
      },
    });

    if (!room) redirect(`/${params.locale}/student`);

    const isEnrolled = (room.session?.class?.enrollments.length ?? 0) > 0;
    if (!isEnrolled) redirect(`/${params.locale}/student`);
  } catch (e) {
    console.error("[student-blackboard-room] DB query failed:", e);
    redirect(`/${params.locale}/student`);
  }

  const isArchived = !!room.archivedAt;
  const hasPermission = room.permissions.length > 0;
  const canEdit = isArchived ? false : (room.allowStudentEdit || hasPermission);

  return (
    <BlackboardClient
      roomId={room.id}
      roomName={room.name}
      className={room.session?.class?.name ?? null}
      userId={session.user.id}
      userName={session.user.name ?? "Student"}
      isHost={false}
      canEdit={canEdit}
      isArchived={isArchived}
      allowStudentEdit={room.allowStudentEdit}
      grantedStudentIds={[]}
      enrolledStudents={[]}
    />
  );
}
