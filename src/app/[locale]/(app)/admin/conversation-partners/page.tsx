import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ConversationPartnersClient, type CpApplication, type ActivePartner } from "./partners-client";

export const dynamic = "force-dynamic";

export default async function AdminConversationPartnersPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  let applications: CpApplication[] = [];
  let partners: ActivePartner[] = [];

  try {
    const rows = await prisma.conversationPartnerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    applications = rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      telegram: r.telegram,
      country: r.country,
      gender: r.gender,
      age: r.age,
      englishLevel: r.englishLevel,
      availabilityWindows: r.availabilityWindows,
      about: r.about,
      status: r.status,
      setupUrl: r.setupUrl,
      // An approved application with no userId never got an account created —
      // it predates that step, or account creation failed after approval. The
      // person is then in neither list as a usable partner, so the row has to
      // say so rather than showing a reassuring "Approved" badge.
      hasAccount: r.userId != null,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (e) {
    console.error("[admin-conversation-partners] applications query failed:", e);
  }

  try {
    const rows = await prisma.conversationPartnerProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { sessions: true } },
      },
    });
    partners = rows.map((p) => ({
      id: p.id,
      name: p.user.name,
      email: p.user.email,
      country: p.country,
      nativeLanguage: p.nativeLanguage,
      timezone: p.timezone,
      availability: p.availability,
      isActive: p.isActive,
      sessions: p._count.sessions,
    }));
  } catch (e) {
    console.error("[admin-conversation-partners] partners query failed:", e);
  }

  return (
    <ConversationPartnersClient applications={applications} partners={partners} />
  );
}
