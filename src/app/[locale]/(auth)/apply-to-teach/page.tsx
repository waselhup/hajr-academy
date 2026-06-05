import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ApplyToTeachForm } from "./apply-form";

export const dynamic = "force-dynamic";

/**
 * Public signup for prospective teachers (the APPLICANT account). Lives in the
 * (auth) shell. Loads the active programs so the applicant can optionally pick
 * the one they're interested in; the form posts to /api/applicants/register and
 * then signs them straight in, landing on /applicant.
 */
export default async function ApplyToTeachPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("ApplicantAuth");
  const isAr = locale === "ar";

  let programs: { id: string; name: string }[] = [];
  try {
    const rows = await prisma.program.findMany({
      where: { active: true },
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: "asc" },
    });
    programs = rows.map((p) => ({ id: p.id, name: isAr ? p.nameAr : p.nameEn }));
  } catch (e) {
    console.error("[apply-to-teach] program load failed (non-fatal):", e);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ApplyToTeachForm programs={programs} />
        <p className="mt-5 text-center text-sm text-hajr-gray-500">
          {t("haveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-hajr-rose transition-colors hover:underline"
          >
            {t("loginNow")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
