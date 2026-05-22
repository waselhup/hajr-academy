import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default async function VerifyEmailPage() {
  const t = await getTranslations("Auth");
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-hajr-mint/50">
          <Mail className="h-7 w-7 text-hajr-navy" />
        </div>
        <CardTitle>{t("checkEmail")}</CardTitle>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        {t("verifyEmailMsg")}
      </CardContent>
    </Card>
  );
}
