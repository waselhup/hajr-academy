import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPlacementTestConfig({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale, id } = await params;
  const isAr = locale === "ar";

  const test = await prisma.placementTest.findUnique({
    where: { id },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div>
        <Link href={`/${locale}/admin/placement-tests`} className="text-xs text-hajr-muted hover:text-hajr-rose">
          ← {isAr ? "العودة" : "Back"}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-hajr-text">{isAr ? test.titleAr : test.titleEn}</h1>
        <div className="text-sm text-hajr-muted">{test.variant} · {test.durationMin} min · {test.passingScore}% pass</div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-hajr-warning/15 px-3 py-1 text-xs text-hajr-warning">
          {isAr ? "محرر الأسئلة قراءة فقط في هذه المرحلة — سيُفعّل لاحقاً" : "Question editor is read-only in this sprint — full editor coming later"}
        </div>
      </div>

      <div className="space-y-3">
        {test.sections.map((s) => {
          const qs = s.questions as Array<{
            id: string;
            textEn: string;
            textAr: string;
            options: { en: string; ar: string }[];
            correct: number;
            points: number;
          }>;
          return (
            <section key={s.id} className="rounded-2xl border border-hajr-border bg-white p-4 shadow-card">
              <header className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-hajr-text">{isAr ? s.titleAr : s.titleEn}</div>
                  <div className="text-xs text-hajr-muted">
                    {s.type} · {s.timeLimitMin} min · {qs.length} {isAr ? "أسئلة" : "questions"} · max {s.maxScore}
                  </div>
                </div>
              </header>
              <ol className="space-y-2 text-sm">
                {qs.slice(0, 5).map((q, i) => (
                  <li key={q.id} className="rounded-lg bg-hajr-ivory p-3">
                    <div className="text-hajr-text">{i + 1}. {isAr ? q.textAr : q.textEn}</div>
                    <div className="mt-1 text-xs text-hajr-muted">
                      ✓ {isAr ? q.options[q.correct].ar : q.options[q.correct].en}
                    </div>
                  </li>
                ))}
                {qs.length > 5 && (
                  <li className="text-xs text-hajr-muted">+ {qs.length - 5} {isAr ? "أسئلة إضافية" : "more questions"}</li>
                )}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
