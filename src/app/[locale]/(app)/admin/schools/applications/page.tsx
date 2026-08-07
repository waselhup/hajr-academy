import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PartnerApplicationsClient } from "./applications-client";

export const dynamic = "force-dynamic";

/**
 * /admin/schools/applications — the Success Partner review queue.
 * Approving here creates the partner, mints their discount code and issues
 * the contact's activation link in one step.
 */
export default async function PartnerApplicationsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const rows = await prisma.partnerApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <PartnerApplicationsClient
      applications={rows.map((r) => ({
        id: r.id,
        orgNameAr: r.orgNameAr,
        orgNameEn: r.orgNameEn,
        partnerType: r.partnerType,
        contactName: r.contactName,
        contactEmail: r.contactEmail,
        contactPhone: r.contactPhone,
        city: r.city,
        crNumber: r.crNumber,
        expectedStudents: r.expectedStudents,
        about: r.about,
        status: r.status,
        promoCode: r.promoCode,
        setupUrl: r.setupUrl,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
