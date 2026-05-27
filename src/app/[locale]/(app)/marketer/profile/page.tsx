import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { getMarketerScope } from "@/lib/marketer/scope";
import { ProfileBankForm } from "@/components/marketer/profile-bank-form";

export const dynamic = "force-dynamic";

export default async function MarketerProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("MARKETER");
  const t = await getTranslations("Marketer");
  const isAr = locale === "ar";

  const scope = await getMarketerScope(session.user.id);
  if (!scope) {
    return <div className="p-6 text-hajr-body">{isAr ? "حسابك قيد المراجعة" : "Account under review"}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-hajr-text">{t("marketerProfile")}</h1>

      <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold text-hajr-text">
          {isAr ? "بيانات الحساب" : "Account info"}
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-hajr-muted">{isAr ? "الاسم" : "Name"}</dt>
            <dd className="text-hajr-text">{isAr ? scope.user.nameAr || scope.user.name : scope.user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-hajr-muted">{isAr ? "البريد" : "Email"}</dt>
            <dd className="text-hajr-text">{scope.user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-hajr-muted">{isAr ? "كود الإحالة" : "Referral code"}</dt>
            <dd className="font-mono text-hajr-text">{scope.referralCode}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-hajr-muted">{isAr ? "نسبة العمولة" : "Commission rate"}</dt>
            <dd className="text-hajr-text">{(Number(scope.commissionRate) * 100).toFixed(0)}%</dd>
          </div>
        </dl>
      </section>

      <ProfileBankForm
        initial={{
          bankIban: scope.bankIban ?? "",
          bankName: scope.bankName ?? "",
          bankHolder: scope.bankHolder ?? "",
        }}
      />
    </div>
  );
}
