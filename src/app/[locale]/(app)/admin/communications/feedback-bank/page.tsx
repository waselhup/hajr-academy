import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { FeedbackBankClient, type Recipient } from "./feedback-bank-client";

export const dynamic = "force-dynamic";

/**
 * /admin/communications/feedback-bank — author a bilingual feedback message
 * and send it to selected students + parents (intended for program end).
 * Admin-gated server-side; the recipient list is fetched here and passed down
 * as a lightweight {id,name,role,email} array (no PII beyond what admins
 * already see across the panel).
 */
export default async function FeedbackBankPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("FeedbackBank");

  let recipients: Recipient[] = [];
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["STUDENT", "PARENT"] } },
      select: { id: true, name: true, nameAr: true, email: true, role: true },
      orderBy: { name: "asc" },
      take: 2000,
    });
    recipients = users.map((u) => ({
      id: u.id,
      name: u.name || u.nameAr || u.email,
      role: u.role as "STUDENT" | "PARENT",
      email: u.email,
    }));
  } catch (e) {
    console.error("[feedback-bank] recipient load failed:", e);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-hajr-navy">{t("title")}</h1>
        <p className="text-sm text-hajr-muted">{t("subtitle")}</p>
      </div>
      <FeedbackBankClient recipients={recipients} />
    </div>
  );
}
