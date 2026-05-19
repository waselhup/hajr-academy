import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default async function VerifyEmailPage() {
  const t = await getTranslations("Auth");
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-mint">
          <Mail className="h-6 w-6 text-brand-navy" />
        </div>
        <CardTitle>{t("checkEmail")}</CardTitle>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        {t("verifyEmailMsg")}
      </CardContent>
    </Card>
  );
}
