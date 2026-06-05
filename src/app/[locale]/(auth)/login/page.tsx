import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { Link } from "@/i18n/routing";

export default async function LoginPage() {
  const t = await getTranslations("Auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <div className="mt-5 flex flex-col gap-2 text-center text-sm">
          <Link href="/forgot-password" className="text-hajr-rose transition-colors hover:underline">
            {t("forgotPassword")}
          </Link>
          <p className="text-hajr-gray-500">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-hajr-rose transition-colors hover:underline">
              {t("registerNow")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
