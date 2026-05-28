import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/rbac";
import { getChildrenSummary } from "@/lib/parent/children";
import {
  CalendarDays, BarChart3, CreditCard, MessageSquare, UserPlus, Clock,
} from "lucide-react";
import { MoatCards } from "@/components/shell/moat-cards";

export const dynamic = "force-dynamic";

/**
 * /parent — parent home. One overview card per linked child with
 * attendance, next class, and subscription status, plus quick actions.
 */
export default async function ParentDashboardPage({
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
    console.error("[parent-dashboard] failed:", e);
  }

  function fmtNext(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(isAr ? "ar-SA" : "en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function rateColor(r: number | null): string {
    if (r == null) return "text-muted-foreground";
    if (r >= 85) return "text-hajr-success";
    if (r >= 70) return "text-hajr-warning";
    return "text-hajr-error";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">
          {t("welcome")}، {session.user.name}
        </h1>
        <Badge variant="info">{t("role")}</Badge>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-muted-foreground">{t("noChildren")}</p>
            <Button asChild>
              <Link href={`/${locale}/parent/link`}>
                <UserPlus className="me-2 h-4 w-4" />
                {t("linkChild")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((c) => (
            <Card key={c.studentId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{isAr ? c.nameAr ?? c.name : c.name}</span>
                  {c.subscriptionStatus && (
                    <Badge
                      variant={
                        c.subscriptionStatus === "ACTIVE"
                          ? "success"
                          : "warning"
                      }
                    >
                      {c.subscriptionStatus}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {c.className ?? t("noClass")}
                  {c.gradeLevel ? ` · ${c.gradeLevel}` : ""}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">
                      {t("attendanceRate")}
                    </div>
                    <div
                      className={`text-xl font-bold num ${rateColor(
                        c.attendanceRate
                      )}`}
                    >
                      {c.attendanceRate != null
                        ? `${c.attendanceRate}%`
                        : "—"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {t("nextClass")}
                    </div>
                    <div className="text-sm font-semibold num">
                      {fmtNext(c.nextClassAt)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/${locale}/parent/${c.studentId}`}>
                      <BarChart3 className="me-1.5 h-3.5 w-3.5" />
                      {t("viewDetails")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/${locale}/parent/${c.studentId}?tab=schedule`}>
                      <CalendarDays className="me-1.5 h-3.5 w-3.5" />
                      {t("schedule")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/${locale}/parent/finance`}>
                      <CreditCard className="me-1.5 h-3.5 w-3.5" />
                      {t("invoices")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/${locale}/messages`}>
                      <MessageSquare className="me-1.5 h-3.5 w-3.5" />
                      {t("messageTeacher")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">
            {t("addAnotherChild")}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/parent/link`}>
              <UserPlus className="me-1.5 h-4 w-4" />
              {t("linkChild")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <MoatCards role="parent" locale={locale} />
    </div>
  );
}
