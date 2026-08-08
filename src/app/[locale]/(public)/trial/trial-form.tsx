"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarDays, CheckCircle2, MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { BookableSlot } from "@/lib/trials/slots";

const WA = BRAND.contact.whatsapp;

export function TrialBookingForm({
  locale,
  slots,
}: {
  locale: string;
  slots: BookableSlot[];
}) {
  const isAr = locale === "ar";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [slotId, setSlotId] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "done">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [bookedSlotLabel, setBookedSlotLabel] = useState("");

  // Group by day so a visitor scans dates first, times second.
  const byDay = useMemo(() => {
    const out: { day: string; items: BookableSlot[] }[] = [];
    for (const s of slots) {
      const g = out.find((x) => x.day === s.dayLabel);
      if (g) g.items.push(s);
      else out.push({ day: s.dayLabel, items: [s] });
    }
    return out;
  }, [slots]);

  const phoneOk = /^(\+966|05)\d{8,}$/.test(phone.trim());
  const emailOk = email.trim() === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSubmit =
    name.trim().length >= 2 && phoneOk && emailOk && !!slotId && status !== "sending";

  /** The message the visitor sends after booking — states plainly that a
   *  trial has already been requested, so the reply picks up from there. */
  const whatsappHref = useMemo(() => {
    const msg = isAr
      ? `السلام عليكم، لقد قمت بطلب حصة تجريبية في أكاديمية هجر.\nالاسم: ${name}\nالموعد المختار: ${bookedSlotLabel}\nرقم الجوال: ${phone}`
      : `Hello, I have requested a free trial lesson at HAJR Academy.\nName: ${name}\nChosen time: ${bookedSlotLabel}\nPhone: ${phone}`;
    return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  }, [isAr, name, phone, bookedSlotLabel]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/trials/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          slotId,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setBookedSlotLabel(isAr ? data.slot?.ar ?? "" : data.slot?.en ?? "");
        setStatus("done");
        return;
      }
      setStatus("error");
      setErrorMsg(
        data.error ??
          (isAr ? "تعذّر إتمام الحجز. حاول مرة أخرى." : "Could not complete the booking. Please try again.")
      );
      // The slot went while they were typing — drop it so they must re-pick.
      if (data.slotGone) setSlotId("");
    } catch {
      setStatus("error");
      setErrorMsg(isAr ? "خطأ في الشبكة." : "Network error.");
    }
  }

  // ── Confirmation ────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <div className="rounded-2xl border border-hajr-border bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-hajr-mint/50">
          <CheckCircle2 className="h-7 w-7 text-hajr-deep-navy" />
        </div>
        <h1 className="text-2xl font-bold text-hajr-navy">
          {isAr ? "تم استلام طلبك ✅" : "Your request is in ✅"}
        </h1>
        <p className="mt-2 text-sm text-hajr-muted">
          {isAr
            ? "سجّلنا حجزك للحصة التجريبية المجانية."
            : "Your free trial lesson is booked with us."}
        </p>

        <div className="mt-5 rounded-xl bg-hajr-cream px-4 py-3 text-start">
          <div className="flex items-center gap-2 text-sm font-semibold text-hajr-navy">
            <CalendarDays className="h-4 w-4" />
            <span className="num">{bookedSlotLabel}</span>
          </div>
          <p className="mt-1 text-xs text-hajr-muted">
            {isAr ? "بتوقيت السعودية" : "KSA time"}
          </p>
        </div>

        <p className="mt-6 text-sm text-hajr-navy">
          {isAr
            ? "الخطوة الأخيرة: أرسل لنا رسالة على واتساب لتأكيد التواصل."
            : "Last step: send us a WhatsApp message so we can confirm."}
        </p>
        <Button variant="cta" size="lg" className="mt-3 w-full" asChild>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="me-2 h-4 w-4" />
            {isAr ? "إرسال الرسالة على واتساب" : "Send the WhatsApp message"}
          </a>
        </Button>
        <p className="mt-3 text-xs text-hajr-muted">
          {isAr
            ? "الرسالة مكتوبة لك مسبقاً — تحتاج الضغط على إرسال فقط."
            : "The message is already written for you — just press send."}
        </p>
      </div>
    );
  }

  // ── Booking form ────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-hajr-border bg-white p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-bold text-hajr-navy">
        {isAr ? "احجز حصة تجريبية مجانية" : "Book a free trial lesson"}
      </h1>
      <p className="mt-1 text-sm text-hajr-muted">
        {isAr
          ? "اترك بياناتك واختر الوقت الذي يناسبك من المواعيد المتاحة."
          : "Leave your details and pick the time that suits you from the available slots."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{isAr ? "الاسم *" : "Name *"}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder={isAr ? "الاسم الكامل" : "Full name"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">{isAr ? "رقم الجوال *" : "Phone *"}</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            dir="ltr"
            placeholder="05XXXXXXXX"
          />
          {phone.length > 0 && !phoneOk && (
            <p className="text-xs text-destructive">
              {isAr ? "يجب أن يبدأ بـ 05 أو +966" : "Must start with 05 or +966"}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            {isAr ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            autoComplete="email"
            placeholder="you@example.com"
          />
          {!emailOk && (
            <p className="text-xs text-destructive">
              {isAr ? "بريد إلكتروني غير صالح" : "Invalid email address"}
            </p>
          )}
        </div>

        {/* Available times */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {isAr ? "الوقت المناسب *" : "Pick a time *"}
          </Label>

          {byDay.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hajr-border bg-hajr-cream/60 px-4 py-6 text-center">
              <p className="text-sm font-medium text-hajr-navy">
                {isAr
                  ? "لا توجد مواعيد متاحة حالياً."
                  : "No times are open right now."}
              </p>
              <p className="mt-1 text-xs text-hajr-muted">
                {isAr
                  ? "راسلنا على واتساب وسنرتّب لك موعداً."
                  : "Message us on WhatsApp and we'll arrange one."}
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a
                  href={`https://wa.me/${WA}?text=${encodeURIComponent(
                    isAr
                      ? "السلام عليكم، أرغب في حجز حصة تجريبية ولم أجد مواعيد متاحة."
                      : "Hello, I'd like a free trial lesson but no times were listed."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="me-2 h-4 w-4" />
                  {isAr ? "راسلنا" : "Message us"}
                </a>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {byDay.map((g) => (
                <div key={g.day}>
                  <div className="num mb-1.5 text-xs font-semibold text-hajr-navy">
                    {g.day}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map((s) => {
                      const active = slotId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSlotId(s.id)}
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-2.5 text-start text-sm transition ${
                            active
                              ? "border-hajr-navy bg-hajr-navy text-white"
                              : "border-hajr-border bg-white text-hajr-navy hover:border-hajr-navy/40"
                          }`}
                        >
                          <span className="num font-semibold">{s.timeLabel}</span>
                          {s.note && (
                            <span
                              className={`mt-0.5 block text-xs ${
                                active ? "text-white/70" : "text-hajr-muted"
                              }`}
                            >
                              {s.note}
                            </span>
                          )}
                          {s.remaining <= 2 && (
                            <span
                              className={`mt-0.5 block text-xs ${
                                active ? "text-white/70" : "text-hajr-rose"
                              }`}
                            >
                              {isAr
                                ? `بقي ${s.remaining} مقعد`
                                : `${s.remaining} seat${s.remaining === 1 ? "" : "s"} left`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-xs text-hajr-muted">
                {isAr ? "جميع المواعيد بتوقيت السعودية." : "All times are KSA time."}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">
            {isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={
              isAr ? "العمر، المستوى، أو أي تفاصيل" : "Age, level, or any details"
            }
          />
        </div>

        {status === "error" && <p className="text-sm text-destructive">{errorMsg}</p>}

        {byDay.length > 0 && (
          <Button type="submit" variant="cta" className="w-full" disabled={!canSubmit}>
            {status === "sending" && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isAr ? "تأكيد الحجز" : "Confirm booking"}
          </Button>
        )}

        <p className="text-center text-xs text-hajr-muted">
          {isAr
            ? "الحصة التجريبية مجانية تماماً ولا تتطلب أي دفع."
            : "The trial lesson is completely free — no payment required."}
        </p>
      </form>
    </div>
  );
}
