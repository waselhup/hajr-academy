/**
 * Admin — Program Openings list (apply-to-teach review hub).
 *
 * Additive: shows every ProgramOpening with its applicant counts and lets an
 * admin jump into a per-opening review, or reopen/close an opening. All
 * mutations are delegated to the shared server actions (which audit + notify).
 */
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { OpeningsListClient } from "./_components/openings-list-client";

export const dynamic = "force-dynamic";

export default async function AdminOpeningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Openings");

  try {
    const openings = await prisma.programOpening.findMany({
      include: {
        program: true,
        _count: { select: { applications: true } },
        applications: { select: { status: true } },
      },
      orderBy: { openedAt: "desc" },
    });

    const rows = openings.map((o) => {
      const active = o.applications.filter(
        (a) => a.status === "SUBMITTED" || a.status === "SHORTLISTED"
      ).length;
      return {
        id: o.id,
        status: o.status as "OPEN" | "CLOSED" | "FILLED",
        nameEn: o.program.nameEn,
        nameAr: o.program.nameAr,
        type: o.program.type,
        total: o._count.applications,
        active,
        openedAt: o.openedAt.toISOString(),
      };
    });

    return <OpeningsListClient rows={rows} />;
  } catch (e) {
    console.error("[admin-openings] DB query failed:", e);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("adminTitle")}</h1>
        <Card>
          <CardContent className="p-8 text-center text-sm text-destructive">
            {t("loadError")}
          </CardContent>
        </Card>
      </div>
    );
  }
}
