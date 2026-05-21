import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { TestBankClient } from "./test-bank-client";

export const dynamic = "force-dynamic";

/**
 * /admin/test-bank — STEP question-bank management. The table data is
 * fetched client-side from /api/admin/test-bank/questions so filtering
 * and pagination stay snappy.
 */
export default async function AdminTestBankPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Exam");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("questionBank")}</h1>
      <TestBankClient />
    </div>
  );
}
