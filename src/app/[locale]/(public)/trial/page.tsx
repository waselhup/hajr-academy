import type { Metadata } from "next";
import { listBookableSlots } from "@/lib/trials/slots";
import { TrialBookingForm } from "./trial-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "احجز حصة تجريبية مجانية — أكاديمية هجر"
      : "Book a free trial lesson — HAJR Academy",
    description: isAr
      ? "اختر الوقت المناسب لك من المواعيد المتاحة واحجز حصتك التجريبية المجانية."
      : "Pick a time that suits you from the available slots and book your free trial lesson.",
  };
}

/**
 * /trial — the single destination for every "book a trial" link.
 *
 * Booking used to jump straight into WhatsApp, which meant the academy had
 * no record of who asked, and the visitor had no idea which times existed.
 * Here they pick from times the admin actually published, and the WhatsApp
 * message comes AFTER the booking is recorded, not instead of it.
 */
export default async function TrialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const slots = await listBookableSlots(isAr);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <TrialBookingForm locale={locale} slots={slots} />
    </div>
  );
}
