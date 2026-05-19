import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function TeacherMessagesPage() {
  await requireRole("TEACHER");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.messages")} phase={5} description="Supabase Realtime chat." />;
}
