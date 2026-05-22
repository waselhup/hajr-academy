import { redirect } from "next/navigation";

/** /student/finance — superseded by the Phase 8 billing page. */
export default function StudentFinancePage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/student/billing`);
}
