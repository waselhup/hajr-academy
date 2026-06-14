import { redirect } from "@/i18n/routing";

/** Legacy route — the universal chat lives at /messages. */
export default async function TeacherMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Locale-aware redirect (next-intl) — using next/navigation here dropped the
  // /ar|/en prefix and bounced an English teacher into Arabic.
  redirect({ href: "/messages", locale });
}
