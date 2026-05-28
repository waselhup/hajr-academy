import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProfileClient, type ProfileData } from "./profile-client";

export const dynamic = "force-dynamic";

/**
 * /student/profile — view & edit a student's own profile.
 *
 * Editable: display name, phone. Everything else (email, birthDate, gender,
 * package, program) is read-only here; the admin owns those fields.
 * Password is changed through a dialog backed by `changePasswordAction`.
 */
export default async function StudentProfilePage() {
  const session = await requireRole("STUDENT");
  await getTranslations(); // warms request scope for client component

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      preferredLang: true,
      studentProfile: {
        select: {
          birthDate: true,
          gender: true,
          englishLevel: true,
          activePackage: true,
          enrollments: {
            where: { status: "ACTIVE" },
            orderBy: { enrolledAt: "desc" },
            take: 1,
            select: {
              class: {
                select: {
                  name: true,
                  nameAr: true,
                  program: { select: { nameEn: true, nameAr: true, code: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // Defensive: STUDENT role guarantees a studentProfile in practice, but
  // be explicit so TS narrows and the UI doesn't crash on edge data.
  const data: ProfileData = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    avatar: user?.avatar ?? null,
    birthDate: user?.studentProfile?.birthDate?.toISOString() ?? null,
    gender: user?.studentProfile?.gender ?? null,
    englishLevel: user?.studentProfile?.englishLevel ?? null,
    activePackage: user?.studentProfile?.activePackage ?? null,
    activeClass: user?.studentProfile?.enrollments?.[0]?.class
      ? {
          name: user.studentProfile.enrollments[0].class.name,
          nameAr: user.studentProfile.enrollments[0].class.nameAr,
          programNameEn: user.studentProfile.enrollments[0].class.program.nameEn,
          programNameAr: user.studentProfile.enrollments[0].class.program.nameAr,
          programCode: user.studentProfile.enrollments[0].class.program.code,
        }
      : null,
  };

  return <ProfileClient initial={data} />;
}
