import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { AIDashboardClient } from "./_components/ai-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminAIPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();

  return <AIDashboardClient />;
}
