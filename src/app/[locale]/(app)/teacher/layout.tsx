/**
 * Owner batch 5, item #5 — Teacher onboarding gate (server component).
 *
 * Wraps every server page under /teacher. If the teacher has not finished
 * the one-time onboarding questionnaire (TeacherProfile.onboardingCompletedAt
 * is null), it best-effort redirects them to /teacher/onboarding.
 *
 * LOOP-SAFETY (read before changing the gate):
 *   We try to read the current path from request headers so we can avoid
 *   redirecting the onboarding page onto itself. BUT a path header is NOT
 *   guaranteed here — the next-intl middleware does not set one, and the
 *   matcher excludes /api anyway. So this redirect is purely best-effort and
 *   correctness must NOT depend on the header being present.
 *
 *   The REAL loop-breaker is the onboarding page itself (teacher/onboarding/
 *   page.tsx): it renders the form when NOT onboarded and only redirect()s to
 *   /teacher when ALREADY onboarded. Therefore, even if `path` is "" (headers
 *   unavailable) and this layout redirects a not-yet-onboarded teacher to
 *   /teacher/onboarding, that page then simply RENDERS the form (it does not
 *   redirect back), so there is no infinite redirect loop.
 *
 * SCOPE:
 *   This layout only wraps server pages under /teacher; it never runs for
 *   /api routes, and next-auth sign-out is unaffected (logout is a next-auth
 *   action, not a /teacher page), so there is no risk of trapping a teacher.
 */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("TEACHER");
  const locale = await getLocale();

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompletedAt: true },
  });

  // Determine the current path WITHOUT relying on middleware-set headers.
  // Any of these may be absent; that is fine (see LOOP-SAFETY above).
  const h = await headers();
  const path =
    h.get("x-pathname") ??
    h.get("x-invoke-path") ??
    h.get("referer") ??
    "";

  // Gate: not onboarded AND not already on the onboarding page → send there.
  // If `path` is empty (no header), we still redirect; the onboarding page is
  // self-sufficient and will render the form rather than bounce, so it is safe.
  if (
    tp &&
    tp.onboardingCompletedAt == null &&
    !path.includes("/teacher/onboarding")
  ) {
    redirect(`/${locale}/teacher/onboarding`);
  }

  return <>{children}</>;
}
