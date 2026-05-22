import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getChildSkillLevels } from "@/lib/parent/children";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

const CEFR_COLORS: Record<string, string> = {
  A1: "#E74C3C",
  A2: "#F39C12",
  B1: "#F1C40F",
  B2: "#B5E5D8",
  C1: "#27AE60",
  C2: "#2C3E50",
};

/** /parent/progress — per-child CEFR skill snapshot across all children. */
export default async function ParentProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations("ParentPortal");
  const isAr = locale === "ar";

  let cards: { studentId: string; name: string; skills: Awaited<ReturnType<typeof getChildSkillLevels>> }[] = [];
  try {
    const parent = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        childLinks: {
          include: {
            student: {
              include: { user: { select: { name: true, nameAr: true } } },
            },
          },
        },
      },
    });
    if (parent) {
      cards = await Promise.all(
        parent.childLinks.map(async (l) => ({
          studentId: l.studentId,
          name: isAr
            ? l.student.user.nameAr ?? l.student.user.name
            : l.student.user.name,
          skills: await getChildSkillLevels(l.studentId),
        }))
      );
    }
  } catch (e) {
    console.error("[parent-progress] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("progress")}</h1>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("noChildren")}
          </CardContent>
        </Card>
      ) : (
        cards.map((c) => (
          <Card key={c.studentId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{c.name}</span>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/${locale}/parent/${c.studentId}?tab=progress`}>
                    <BarChart3 className="me-1.5 h-3.5 w-3.5" />
                    {t("viewDetails")}
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {c.skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noData")}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {c.skills.map((s) => (
                    <div
                      key={s.skill}
                      className="rounded-lg border p-3 text-center"
                    >
                      <div className="text-xs text-muted-foreground">
                        {s.skill}
                      </div>
                      <div
                        className="mx-auto mt-1 inline-block rounded-md px-2 py-0.5 text-sm font-bold text-white"
                        style={{
                          background:
                            CEFR_COLORS[s.currentLevel] ?? "#8A8580",
                        }}
                      >
                        {s.currentLevel}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
