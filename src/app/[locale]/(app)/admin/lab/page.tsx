import { redirect } from "next/navigation";

/** /admin/lab redirects to the exercises management page. */
export default function AdminLabPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/admin/lab/exercises`);
}
