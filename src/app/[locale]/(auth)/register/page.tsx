import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "./register-form";
import Link from "next/link";

export default async function RegisterPage() {
  const t = await getTranslations("Auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-5 text-center text-sm text-hajr-gray-500">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-hajr-rose transition-colors hover:underline">
            {t("loginNow")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
