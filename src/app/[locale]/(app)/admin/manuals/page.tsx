import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Eye, FileArchive, RefreshCw, UserCog, Users, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

interface ManualCard {
  role: "admin" | "teacher" | "student";
  lang: "ar" | "en";
  icon: any;
  titleKey: string;
  langKey: string;
}

const CARDS: ManualCard[] = [
  { role: "admin", lang: "en", icon: UserCog, titleKey: "adminTitle", langKey: "english" },
  { role: "admin", lang: "ar", icon: UserCog, titleKey: "adminTitle", langKey: "arabic" },
  { role: "teacher", lang: "en", icon: Users, titleKey: "teacherTitle", langKey: "english" },
  { role: "teacher", lang: "ar", icon: Users, titleKey: "teacherTitle", langKey: "arabic" },
  { role: "student", lang: "en", icon: GraduationCap, titleKey: "studentTitle", langKey: "english" },
  { role: "student", lang: "ar", icon: GraduationCap, titleKey: "studentTitle", langKey: "arabic" },
];

export default async function AdminManualsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Manuals");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-brand-navy">{t("pageTitle")}</h1>
      </div>

      <Card className="bg-brand-navy text-white border-brand-navy">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start gap-4">
          <BookOpen className="h-8 w-8 text-brand-mint flex-none" />
          <div className="grow">
            <h2 className="text-xl font-bold">{t("pageSubtitle")}</h2>
            <p className="text-sm text-brand-mint mt-1 opacity-90">
              {t("heroBody")}
            </p>
          </div>
          <a href="/api/admin/manuals/all" download>
            <Button
              variant="outline"
              className="min-h-[44px] bg-brand-mint text-brand-navy hover:bg-brand-mint/90 border-brand-mint"
            >
              <FileArchive className="h-4 w-4 me-2" />
              {t("downloadAllZip")}
            </Button>
          </a>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          const href = `/api/admin/manuals/${c.role}?lang=${c.lang}`;
          return (
            <Card key={`${c.role}-${c.lang}`} className="border-brand-mint">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-brand-navy">
                  <Icon className="h-4 w-4 text-brand-rose" />
                  {t(c.titleKey)}
                </CardTitle>
                <div className="text-xs text-muted-foreground mt-1">{t(c.langKey)}</div>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href={href} download>
                  <Button
                    className="w-full min-h-[44px] bg-brand-rose hover:bg-brand-rose/90 text-white"
                  >
                    <Download className="h-4 w-4 me-2" />
                    {t("downloadPdf")}
                  </Button>
                </a>
                <a href={href} target="_blank" rel="noreferrer">
                  <Button
                    variant="outline"
                    className="w-full min-h-[44px] border-brand-navy text-brand-navy"
                  >
                    <Eye className="h-4 w-4 me-2" />
                    {t("viewHtml")}
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-brand-mint">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <RefreshCw className="h-5 w-5 text-brand-rose flex-none" />
          <div className="grow text-xs text-muted-foreground">
            {t("regenerateNote")}
          </div>
          <code className="text-xs bg-brand-ivory text-brand-navy px-3 py-1 rounded border">
            npx tsx scripts/capture-manual-screenshots.ts
          </code>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          {t("footnote")}
        </CardContent>
      </Card>
    </div>
  );
}
