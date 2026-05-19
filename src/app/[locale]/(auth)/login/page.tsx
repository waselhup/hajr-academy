import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import Link from "next/link";

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
        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          <Link href="/forgot-password" className="text-brand-rose hover:underline">
            {t("forgotPassword")}
          </Link>
          <p className="text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-brand-navy hover:underline">
              {t("registerNow")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
