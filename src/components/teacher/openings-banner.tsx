import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canSeeOpening, explicitTeacherMemberships } from "@/lib/openings/audience";

/**
 * Surfaces a Rose-Mauve banner on the teacher dashboard when there is at least
 * one OPEN program opening this teacher has NOT yet engaged with (no SUBMITTED/
 * SHORTLISTED/SELECTED/REJECTED/WITHDRAWN application on it). Links to the
 * openings list. Renders nothing otherwise.
 *
 * Self-contained + defensive: any failure returns null so it can never break
 * the dashboard. Not actually dismissible — just a styled, linked Card.
 */
export async function OpeningsBanner({ userId }: { userId: string }) {
  try {
    const tp = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tp) return null;

    // OPEN openings this teacher has no application row for at all — then keep
    // only those whose AUDIENCE includes this teacher (same shared guard as the
    // listing). Prevents nudging a teacher toward openings they can't see.
    const candidates = await prisma.programOpening.findMany({
      where: {
        status: "OPEN",
        applications: { none: { teacherId: tp.id } },
      },
      select: {
        id: true,
        status: true,
        audienceType: true,
        applicantsPhaseOpen: true,
        program: { select: { active: true } },
      },
    });
    if (candidates.length === 0) return null;

    const memberSet = await explicitTeacherMemberships(
      tp.id,
      candidates.map((o) => o.id)
    );
    const viewer = { role: "TEACHER" as const, teacherId: tp.id };
    let hasVisible = false;
    for (const o of candidates) {
      const ok = await canSeeOpening(
        viewer,
        {
          id: o.id,
          status: o.status,
          audienceType: o.audienceType,
          applicantsPhaseOpen: o.applicantsPhaseOpen,
          program: { active: o.program.active },
        },
        { isExplicitMember: memberSet.has(o.id) }
      );
      if (ok) {
        hasVisible = true;
        break;
      }
    }
    if (!hasVisible) return null;

    const locale = await getLocale();
    const t = await getTranslations();

    return (
      <Link
        href={`/${locale}/teacher/openings`}
        className="flex items-start gap-3 rounded-lg border border-hajr-rose/40 bg-hajr-rose/10 p-4 transition-colors hover:bg-hajr-rose/15"
      >
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-hajr-rose" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-hajr-deep-navy">
            {t("Openings.bannerTitle")}
          </div>
          <div className="text-xs text-hajr-gray-600">
            {t("Openings.bannerBody")}
          </div>
        </div>
        <span className="shrink-0 self-center rounded-md bg-hajr-rose px-3 py-1.5 text-sm font-medium text-white">
          {t("Openings.bannerCta")}
        </span>
      </Link>
    );
  } catch (e) {
    console.error("[OpeningsBanner] failed (non-fatal):", e);
    return null;
  }
}
