/**
 * Sprint 3 — Public teacher profile (Preply-like).
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await prisma.teacherProfile.findUnique({
    where: { publicSlug: slug },
    include: { user: { select: { name: true, nameAr: true } } },
  });
  if (!teacher) return { title: "Teacher" };
  return { title: `${teacher.user.name} — Hajr A° Academy` };
}

function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  // accept https://youtu.be/ID, https://www.youtube.com/watch?v=ID
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  const v = url.match(/vimeo\.com\/(\d+)/);
  if (v) return `https://player.vimeo.com/video/${v[1]}`;
  return url; // best-effort: pass through
}

export default async function PublicTeacherProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("TeacherProfile");
  const isAr = locale === "ar";

  const teacher = await prisma.teacherProfile.findUnique({
    where: { publicSlug: slug },
    include: {
      user: { select: { id: true, name: true, nameAr: true, avatar: true } },
      ratings: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          rater: { select: { name: true, nameAr: true, avatar: true } },
        },
      },
      _count: { select: { ratings: { where: { isApproved: true } } } },
    },
  });

  if (!teacher) notFound();

  const name = isAr ? teacher.user.nameAr ?? teacher.user.name : teacher.user.name;
  const videoEmbed = youtubeEmbed(teacher.introVideoUrl);

  return (
    <div className="min-h-screen bg-hajr-ivory">
      <header className="border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href={`/${locale}`}>
            <HajrLogo size="sm" variant="full" />
          </Link>
          <LanguageToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="bg-hajr-navy py-12 text-white">
        <div className="container grid items-start gap-8 lg:grid-cols-[200px_1fr]">
          <div className="flex h-44 w-44 items-center justify-center rounded-full bg-hajr-rose/30 text-5xl font-semibold">
            {teacher.user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teacher.user.avatar}
                alt={name}
                className="h-44 w-44 rounded-full object-cover"
              />
            ) : (
              name.charAt(0)
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{name}</h1>
              {teacher.isVerified && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300"
                  title={t("verifiedBadge")}
                >
                  ✓ {t("verifiedBadge")}
                </span>
              )}
            </div>

            {teacher.rating && (
              <div className="flex items-center gap-3 text-sm text-hajr-ivory/90">
                <span className="font-semibold text-amber-300">
                  ★ {Number(teacher.rating).toFixed(1)}
                </span>
                <span className="text-hajr-ivory/60">
                  ({teacher._count.ratings} {t("reviewsShort")})
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-hajr-ivory/85">
              {teacher.yearsExp ? (
                <span>📅 {teacher.yearsExp}+ {t("yearsExpFull")}</span>
              ) : null}
              {teacher.languages.length > 0 && (
                <span>🌍 {teacher.languages.join(" · ")}</span>
              )}
            </div>

            {teacher.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {teacher.specializations.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-white/15 px-3 py-1 text-xs text-white"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-2">
              <Link
                href={`/${locale}/contact?teacher=${teacher.publicSlug}`}
                className="inline-flex h-11 items-center rounded-lg bg-hajr-rose px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-hajr-rose/90"
              >
                {t("bookTrial")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {videoEmbed && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-hajr-text">
                  {t("intro")}
                </h2>
                <div className="aspect-video overflow-hidden rounded-xl border border-hajr-border bg-black">
                  <iframe
                    src={videoEmbed}
                    title="Intro"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}

            {teacher.bio && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-hajr-text">
                  {t("aboutMe")}
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-hajr-text">
                  {teacher.bio}
                </p>
              </div>
            )}

            <div>
              <h2 className="mb-3 text-lg font-semibold text-hajr-text">
                {t("reviewsTitle")}
              </h2>
              {teacher.ratings.length === 0 ? (
                <p className="text-sm text-hajr-muted">{t("noReviews")}</p>
              ) : (
                <ul className="space-y-3">
                  {teacher.ratings.map((r) => {
                    const rname = isAr
                      ? r.rater.nameAr ?? r.rater.name
                      : r.rater.name;
                    return (
                      <li
                        key={r.id}
                        className="rounded-xl border border-hajr-border bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-hajr-rose/15 text-xs font-medium text-hajr-rose">
                              {rname.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-hajr-text">
                              {rname}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-amber-500">
                            {"★".repeat(r.rating)}
                            {"☆".repeat(5 - r.rating)}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm text-hajr-muted">
                            {r.comment}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-hajr-text">
                {t("contactCardTitle")}
              </h3>
              <p className="mt-1 text-sm text-hajr-muted">
                {t("contactCardSubtitle")}
              </p>
              <Link
                href={`/${locale}/contact?teacher=${teacher.publicSlug}`}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-hajr-rose text-sm font-semibold text-white shadow-sm transition hover:bg-hajr-rose/90"
              >
                {t("sendMessage")}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
