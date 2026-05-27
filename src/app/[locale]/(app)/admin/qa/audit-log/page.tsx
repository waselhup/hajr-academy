import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { join } from "path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck } from "lucide-react";
import { getAuditCoverage } from "@/lib/qa/audit-coverage";

export const dynamic = "force-dynamic";

export default async function QaAuditPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Qa");
  const rows = getAuditCoverage(join(process.cwd(), "src", "app", "api"));
  const mutationRoutes = rows.filter((r) => r.hasMutation);
  const missing = mutationRoutes.filter((r) => !r.hasAudit);
  const coverage =
    mutationRoutes.length > 0
      ? Math.round(((mutationRoutes.length - missing.length) / mutationRoutes.length) * 100)
      : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-brand-navy">{t("auditCoverage")}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">
            {coverage}% — {mutationRoutes.length - missing.length} / {mutationRoutes.length} {t("mutationRoutesCovered")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("file")}</TableHead>
                <TableHead>{t("hasMutation")}</TableHead>
                <TableHead>{t("hasAudit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mutationRoutes.map((r) => (
                <TableRow key={r.file}>
                  <TableCell className="font-mono text-xs">{r.file}</TableCell>
                  <TableCell>{r.hasMutation ? "✓" : "—"}</TableCell>
                  <TableCell>
                    {r.hasAudit ? (
                      <span className="text-green-600 text-xs">✓ {t("covered")}</span>
                    ) : (
                      <span className="text-amber-600 text-xs">⚠ {t("missing")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
