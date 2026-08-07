import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResetForm } from "./reset-form";

/**
 * Doubles as the first-password page: an account created for someone (by a
 * purchase, a teacher acceptance, a partner approval) links here with
 * `?setup=1`. The mechanism is identical to a reset — only the wording
 * changes, because "reset your password" is confusing to someone who has
 * never had one.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ setup?: string }>;
}) {
  const t = await getTranslations("Auth");
  const locale = await getLocale();
  const isAr = locale === "ar";
  const sp = (await searchParams) ?? {};
  const isSetup = sp.setup === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isSetup
            ? isAr
              ? "فعّل حسابك"
              : "Activate your account"
            : t("resetPassword")}
        </CardTitle>
        <CardDescription>
          {isSetup
            ? isAr
              ? "اختر كلمة مرور لحسابك، وستتمكن من الدخول مباشرة."
              : "Choose a password for your account and you can sign in straight away."
            : t("checkEmail")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetForm />
      </CardContent>
    </Card>
  );
}
