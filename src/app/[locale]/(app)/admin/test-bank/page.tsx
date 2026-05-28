import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { TestBankClient } from "./test-bank-client";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["STEP", "IELTS_PRACTICE", "TOEFL_PRACTICE"] as const;
type ValidType = (typeof VALID_TYPES)[number];

/**
 * /admin/test-bank — unified question-bank management for STEP / IELTS /
 * TOEFL. `?type=` pre-filters the bank to one test type; absent → all.
 *
 * /admin/step-bank was retired (Phase-6 stub) and now 308-redirects here
 * with `?type=STEP` so old bookmarks land on the right filter.
 */
export default async function AdminTestBankPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Exam");

  const raw = (searchParams?.type ?? "").toUpperCase();
  const initialType: ValidType | "" = (VALID_TYPES as readonly string[]).includes(
    raw
  )
    ? (raw as ValidType)
    : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("questionBank")}</h1>
      <TestBankClient initialType={initialType} />
    </div>
  );
}
