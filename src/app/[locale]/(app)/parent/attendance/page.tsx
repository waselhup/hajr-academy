import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { getChildrenSummary } from "@/lib/parent/children";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

/** /parent/attendance — attendance rate per child, link to the calendar. */
export default async function ParentAttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations("ParentPortal");
  const isAr = locale === "ar";

  let children: Awaited<ReturnType<typeof getChildrenSummary>> = [];
  try {
    children = await getChildrenSummary(session.user.id);
  } catch (e) {
    console.error("[parent-attendance] failed:", e);
  }

  function rateColor(r: number | null): string {
    if (r == null) return "text-muted-foreground";
    if (r >= 85) return "text-hajr-success";
    if (r >= 70) return "text-hajr-warning";
    return "text-hajr-error";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("attendance")}</h1>

      {children.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("noChildren")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((c) => (
            <Card key={c.studentId}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {isAr ? c.nameAr ?? c.name : c.name}
                  </span>
                  <span
                    className={`text-2xl font-bold num ${rateColor(
                      c.attendanceRate
                    )}`}
                  >
                    {c.attendanceRate != null ? `${c.attendanceRate}%` : "—"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("thisMonthAttendance")}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/${locale}/parent/${c.studentId}?tab=attendance`}>
                    <CalendarDays className="me-1.5 h-4 w-4" />
                    {t("viewCalendar")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
