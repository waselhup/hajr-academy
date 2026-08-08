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
      country: r.country,
      nativeLanguage: r.nativeLanguage,
      otherLanguages: r.otherLanguages,
      timezone: r.timezone,
      availability: r.availability,
      about: r.about,
      linkedin: r.linkedin,
      status: r.status,
      setupUrl: r.setupUrl,
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
