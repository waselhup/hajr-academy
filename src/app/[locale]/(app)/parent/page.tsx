import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function ParentDashboardPage() {
  const session = await requireRole("PARENT");
  const t = await getTranslations();

  const profile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: { childLinks: { include: { student: { include: { user: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t("Dashboard.welcome")}، {session.user.name}</h1>
        <Badge variant="info">{t("Roles.PARENT")}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Nav.children")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {profile && profile.childLinks.length > 0 ? (
            profile.childLinks.map((link) => (
              <div key={link.id} className="rounded-md border p-3">
                <div className="font-medium">{link.student.user.name}</div>
                <div className="text-sm text-muted-foreground">{link.student.gradeLevel ?? "—"}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>
          )}
          <div className="mt-2 rounded-md bg-brand-lavender/30 p-3 text-sm text-brand-navy">
            {t("Nav.children")} — invite code: <code className="num font-mono">{profile?.inviteCode}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
