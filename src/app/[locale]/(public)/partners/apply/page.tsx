import { getLocale } from "next-intl/server";
import { PartnerApplyForm } from "./partner-apply-form";

export const dynamic = "force-dynamic";

/**
 * /partners/apply — the public door for Success Partners.
 *
 * Charities, schools and individuals sponsoring students previously had no
 * way to reach the academy except by phone; a partner record could only be
 * typed in by an admin. This is the missing front door.
 */
export default async function PartnerApplyPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";

  const benefits = isAr
    ? [
        "رمز خصم خاص بجهتك يستفيد منه كل من ترشّحهم",
        "لوحة متابعة لحضور وتقدّم طلابك",
        "تقارير دورية عن مستوى المستفيدين",
        "أسعار خاصة حسب عدد الطلاب",
      ]
    : [
        "A discount code of your own for everyone you refer",
        "A dashboard tracking your students' attendance and progress",
        "Regular reports on your beneficiaries' level",
        "Rates scaled to the number of students",
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <span className="inline-flex items-center rounded-full border border-hajr-border bg-white px-4 py-1.5 text-xs font-medium text-hajr-body">
          {isAr ? "شركاء النجاح" : "Success Partners"}
        </span>
        <h1 className="mt-4 text-3xl font-bold text-hajr-deep-navy sm:text-4xl">
          {isAr ? "كن شريك نجاح" : "Become a Success Partner"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-hajr-muted">
          {isAr
            ? "للجمعيات الخيرية والمدارس والأفراد الراغبين في رعاية طلاب أو ترشيحهم لبرامج أكاديمية هجر."
            : "For charities, schools and individuals who want to sponsor or refer students to HAJR Academy programmes."}
        </p>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {benefits.map((b) => (
          <li
            key={b}
            className="rounded-xl border border-hajr-border bg-white px-4 py-3 text-sm text-hajr-body shadow-card"
          >
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <PartnerApplyForm locale={locale} />
      </div>
    </div>
  );
}
