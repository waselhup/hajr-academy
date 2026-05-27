import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { join } from "path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { getI18nReport } from "@/lib/qa/i18n-coverage";

export const dynamic = "force-dynamic";

export default async function QaI18nPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Qa");
  const r = getI18nReport(join(process.cwd(), "src"));

  function listCard(title: string, items: string[]) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-brand-navy">
            {title} <span className="text-muted-foreground">({items.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-green-600">✓ {t("noIssues")}</p>
          ) : (
            <ul className="text-xs font-mono space-y-1 max-h-60 overflow-auto">
              {items.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-brand-navy">{t("i18nCheck")}</h1>
      </div>
      <Card className="bg-brand-ivory">
        <CardContent className="p-6 flex gap-6 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground">AR keys</div>
            <div className="text-2xl font-bold text-brand-navy">{r.arKeyCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">EN keys</div>
            <div className="text-2xl font-bold text-brand-navy">{r.enKeyCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("parity")}</div>
            <div
              className={`text-2xl font-bold ${
                r.parityOk ? "text-green-600" : "text-amber-600"
              }`}
            >
              {r.parityOk ? "✓" : "⚠"}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listCard(t("missingInAr"), r.missingInAr)}
        {listCard(t("missingInEn"), r.missingInEn)}
        {listCard(t("untranslatedAr"), r.untranslatedAr)}
        {listCard(t("markupLeaks"), r.markupLeaks)}
      </div>
    </div>
  );
}
