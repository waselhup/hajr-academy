import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { Target } from "lucide-react";
import { ValidationClient } from "./validation-client";
import { VALIDATION_CATEGORIES } from "@/lib/validation/teacher-requests";

export const dynamic = "force-dynamic";

export default async function AdminValidationPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("ValidationMode");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-brand-navy">{t("pageTitle")}</h1>
      </div>
      <ValidationClient categories={VALIDATION_CATEGORIES} />
    </div>
  );
}
