import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ApplicantSidebar, ApplicantMobileNav } from "@/components/applicant/applicant-shell";
import { requireApplicant } from "@/lib/applicants/guard";
import { ALL_FEATURES } from "@/lib/applicants/service";
import type { ApplicantFeature } from "@prisma/client";

/**
 * Dedicated MINIMAL shell for the applicant portal — deliberately NOT the
 * teacher/admin (app) shell. Role-gated to APPLICANT. The nav renders only the
 * features enabled in ApplicantFeatureAccess; locked pages are also blocked
 * server-side by requireApplicantFeature() inside each page (defence in depth).
 */
export default async function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, applicant } = await requireApplicant();

  const enabled: ApplicantFeature[] = ALL_FEATURES.filter(
    (f) => f === "OVERVIEW" || applicant.featureAccess.some((r) => r.feature === f && r.enabled)
  );

  const name = session.user.name ?? "Applicant";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-brand-ivory">
        <ApplicantSidebar enabled={enabled} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hajr-gray-200 bg-white px-4 shadow-sm sm:px-6">
            <span className="text-sm font-semibold text-hajr-deep-navy">
              {name}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <LanguageToggle />
              <NotificationBell userId={session.user.id} />
              <Avatar className="h-9 w-9 ring-2 ring-hajr-gray-200">
                <AvatarFallback className="bg-hajr-navy text-sm font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</main>
        </div>
      </div>
      <ApplicantMobileNav enabled={enabled} />
    </SessionProvider>
  );
}
