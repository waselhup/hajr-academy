import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  BookOpenCheck,
  Presentation,
  FileText,
  ClipboardCheck,
  Table2,
  CheckSquare,
  Sparkles,
  Download,
  UserCog,
  Users,
  GraduationCap,
  FileArchive,
} from "lucide-react";
import { loadDeliveryStats } from "@/lib/delivery/stats";

export const dynamic = "force-dynamic";

interface Artifact {
  icon: any;
  titleKey: string;
  descKey: string;
  href: string;
  filename?: string;
  external?: boolean;
}

const ARTIFACTS: Artifact[] = [
  {
    icon: BookOpenCheck,
    titleKey: "brandBook",
    descKey: "brandBookDesc",
    href: "/api/admin/brand-kit/book",
    filename: "hajr-brand-book-v3.html",
  },
  {
    icon: Presentation,
    titleKey: "presentationPptx",
    descKey: "presentationPptxDesc",
    href: "/api/admin/delivery/presentation",
  },
  {
    icon: FileText,
    titleKey: "presentationPdf",
    descKey: "presentationPdfDesc",
    href: "/api/admin/delivery/presentation-pdf",
  },
  {
    icon: ClipboardCheck,
    titleKey: "validationReport",
    descKey: "validationReportDesc",
    href: "/admin/validation",
    external: true,
  },
  {
    icon: FileText,
    titleKey: "runbook",
    descKey: "runbookDesc",
    href: "/api/admin/delivery/runbook",
  },
  {
    icon: Table2,
    titleKey: "featureMatrix",
    descKey: "featureMatrixDesc",
    href: "/api/admin/delivery/feature-matrix",
  },
  {
    icon: CheckSquare,
    titleKey: "handoverChecklist",
    descKey: "handoverChecklistDesc",
    href: "/api/admin/delivery/checklist",
  },
  {
    icon: UserCog,
    titleKey: "adminManualEn",
    descKey: "adminManualEnDesc",
    href: "/api/admin/manuals/admin?lang=en",
  },
  {
    icon: UserCog,
    titleKey: "adminManualAr",
    descKey: "adminManualArDesc",
    href: "/api/admin/manuals/admin?lang=ar",
  },
  {
    icon: Users,
    titleKey: "teacherManualEn",
    descKey: "teacherManualEnDesc",
    href: "/api/admin/manuals/teacher?lang=en",
  },
  {
    icon: Users,
    titleKey: "teacherManualAr",
    descKey: "teacherManualArDesc",
    href: "/api/admin/manuals/teacher?lang=ar",
  },
  {
    icon: GraduationCap,
    titleKey: "studentManualEn",
    descKey: "studentManualEnDesc",
    href: "/api/admin/manuals/student?lang=en",
  },
  {
    icon: GraduationCap,
    titleKey: "studentManualAr",
    descKey: "studentManualArDesc",
    href: "/api/admin/manuals/student?lang=ar",
  },
  {
    icon: FileArchive,
    titleKey: "manualsZip",
    descKey: "manualsZipDesc",
    href: "/api/admin/manuals/all",
  },
];

export default async function AdminDeliveryPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Delivery");
  const stats = await loadDeliveryStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-brand-navy">{t("pageTitle")}</h1>
      </div>

      <Card className="bg-brand-navy text-white border-brand-navy">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start gap-4">
          <Sparkles className="h-8 w-8 text-brand-mint flex-none" />
          <div className="grow">
            <h2 className="text-xl font-bold">{t("heroTitle")}</h2>
            <p className="text-sm text-brand-mint mt-1 opacity-90">
              {t("heroSubtitle")}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-brand-mint">
              <span>
                <strong className="text-white text-base">{stats.students}</strong> {t("students")}
              </span>
              <span>
                <strong className="text-white text-base">{stats.teachers}</strong> {t("teachers")}
              </span>
              <span>
                <strong className="text-white text-base">{stats.sessions}</strong> {t("sessions")}
              </span>
              <span>
                <strong className="text-white text-base">{stats.lessonSummaries}</strong> {t("summaries")}
              </span>
              <span>
                <strong className="text-white text-base">{stats.certificates}</strong> {t("certificates")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ARTIFACTS.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.titleKey} className="border-brand-mint">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-brand-navy">
                  <Icon className="h-4 w-4 text-brand-rose" />
                  {t(a.titleKey)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{t(a.descKey)}</p>
                <a
                  href={a.href}
                  target={a.external ? undefined : "_blank"}
                  download={a.filename ?? !a.external}
                >
                  <Button
                    variant="outline"
                    className="w-full min-h-[44px] border-brand-navy text-brand-navy"
                  >
                    <Download className="h-4 w-4 me-2" />
                    {a.external ? t("open") : t("download")}
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          {t("footnote")}
        </CardContent>
      </Card>
    </div>
  );
}
