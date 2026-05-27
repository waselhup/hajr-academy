/**
 * Sprint 3 — Public teacher directory.
 */
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherProfile");
  return { title: t("directoryTitle") };
}

export default async function TeachersDirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("TeacherProfile");
  const isAr = locale === "ar";

  const teachers = await prisma.teacherProfile.findMany({
    where: {
      active: true,
      publicSlug: { not: null },
    },
    include: {
      user: { select: { name: true, nameAr: true, avatar: true } },
      _count: { select: { ratings: { where: { isApproved: true } } } },
    },
    orderBy: [{ isVerified: "desc" }, { rating: "desc" }],
    take: 60,
  });

  return (
    <div className="min-h-screen bg-hajr-ivory">
      <header className="border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href={`/${locale}`} aria-label="Hajr Academy">
            <HajrLogo size="sm" variant="full" />
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <section className="bg-hajr-navy py-14 text-white">
        <div className="container">
          <h1 className="text-3xl font-bold sm:text-4xl">{t("directoryTitle")}</h1>
          <p className="mt-2 max-w-2xl text-hajr-ivory/80">
            {t("directorySubtitle")}
          </p>
        </div>
      </section>

      <section className="container py-10">
        {teachers.length === 0 ? (
          <div className="rounded-xl border border-hajr-border bg-white p-10 text-center">
            <p className="text-hajr-muted">{t("noTeachers")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((tp) => {
              const name = isAr ? tp.user.nameAr ?? tp.user.name : tp.user.name;
              return (
                <Link
                  key={tp.id}
                  href={`/${locale}/teachers/${tp.publicSlug}`}
                  className="group rounded-xl border border-hajr-border bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-hajr-rose/15 text-lg font-semibold text-hajr-rose">
                      {tp.user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tp.user.avatar}
                          alt={name}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-semibold text-hajr-text group-hover:text-hajr-rose">
                          {name}
                        </h3>
                        {tp.isVerified && (
                          <span className="text-amber-500" title={t("verifiedBadge")}>
                            ✓
                          </span>
                        )}
                      </div>
                      {tp.rating && (
                        <p className="mt-0.5 text-xs text-hajr-muted">
                          ★ {Number(tp.rating).toFixed(1)} · {tp._count.ratings}{" "}
                          {t("reviewsShort")}
                        </p>
                      )}
                    </div>
                  </div>

                  {tp.specializations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tp.specializations.slice(0, 3).map((sp) => (
                        <span
                          key={sp}
                          className="rounded-full bg-hajr-ivory px-2.5 py-0.5 text-[11px] text-hajr-text"
                        >
                          {sp}
                        </span>
                      ))}
                    </div>
                  )}

                  {tp.bio && (
                    <p className="mt-3 line-clamp-2 text-sm text-hajr-muted">
                      {tp.bio}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-hajr-muted">
                    <span>
                      {tp.yearsExp ? `${tp.yearsExp}+ ${t("yearsShort")}` : t("newTeacher")}
                    </span>
                    <span className="font-medium text-hajr-rose">
                      {t("viewProfile")} →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
