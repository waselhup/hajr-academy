import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { join } from "path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell } from "lucide-react";
import { getNotificationCoverage } from "@/lib/qa/notification-coverage";

export const dynamic = "force-dynamic";

export default async function QaNotificationsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Qa");
  const rows = getNotificationCoverage(join(process.cwd(), "src"));
  const used = rows.filter((r) => r.used > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-brand-navy">{t("notificationCoverage")}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">
            {used} / {rows.length} {t("typesInUse")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("type")}</TableHead>
                <TableHead className="text-end">{t("callSites")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.type}>
                  <TableCell className="font-mono text-xs">{r.type}</TableCell>
                  <TableCell className="text-end">{r.used}</TableCell>
                  <TableCell>
                    {r.used > 0 ? (
                      <span className="text-green-600 text-xs">✓ {t("inUse")}</span>
                    ) : (
                      <span className="text-amber-600 text-xs">⚠ {t("unused")}</span>
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
