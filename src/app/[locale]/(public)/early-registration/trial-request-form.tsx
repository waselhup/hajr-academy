"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/whatsapp";
import s from "./early-registration.module.css";

/**
 * The free-trial request that sits at the top of the landing page.
 *
 * Four fields, no calendar. The dated-slot flow at /trial only works while an
 * admin has published slots, and asking a visitor to pick a time before they
 * have spoken to anybody loses the ones who are still deciding. Here the
 * academy collects what it needs to call the family back, and the time is
 * agreed in the WhatsApp thread that follows.
 *
 * The request is saved BEFORE WhatsApp opens, so a lead is never lost to a
 * visitor who closes the tab instead of pressing send — the academy still has
 * the name and number in /admin/trials either way.
 */
export function TrialRequestForm({ isAr }: { isAr: boolean }) {
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [age, setAge] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  // Three parts, matching what the server enforces — a client that disagrees
  // with the server produces a rejection the visitor cannot understand.
  const nameOk = studentName.trim().split(/\s+/).filter(Boolean).length >= 3;
  const ageNum = Number(age);
  const ageOk = Number.isInteger(ageNum) && ageNum >= 3 && ageNum <= 80;
  const waOk = /^(\+966|05)\d{8,}$/.test(whatsapp.trim());
  const canSubmit = nameOk && grade.trim().length > 0 && ageOk && waOk && status !== "sending";

  const waHref = whatsappLink(
    isAr
      ? [
          "السلام عليكم، أرغب في الحصول على حصة تجريبية.",
          `اسم الطالب: ${studentName.trim()}`,
          `الصف: ${grade.trim()}`,
          `العمر: ${age}`,
          `رقم الطلب: ${reference}`,
        ].join("\n")
      : [
          "Hello, I would like to book a free trial lesson.",
          `Student name: ${studentName.trim()}`,
          `Grade: ${grade.trim()}`,
          `Age: ${age}`,
          `Request number: ${reference}`,
        ].join("\n")
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/trials/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          grade: grade.trim(),
          age: ageNum,
          whatsapp: whatsapp.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setReference(data.reference ?? "");
        setStatus("done");
        return;
      }
      setStatus("error");
      setError(data.error ?? (isAr ? "تعذّر إرسال الطلب. حاول مرة أخرى." : "Could not send the request. Please try again."));
    } catch {
      setStatus("error");
      setError(isAr ? "خطأ في الشبكة." : "Network error.");
    }
  }

  if (status === "done") {
    return (
      <div className={s.trialCard}>
        <div className={s.trialDone}>
          <strong>{isAr ? "تم استلام طلبك ✓" : "We have your request ✓"}</strong>
          {reference && (
            <span className={s.trialRef} dir="ltr">
              {isAr ? "رقم الطلب: " : "Request number: "}
              {reference}
            </span>
          )}
          <p>
            {isAr
              ? "تبقّت خطوة واحدة: أرسل لنا الرسالة على واتساب لنحدّد موعد الحصة — الرسالة مكتوبة لك مسبقاً."
              : "One step left — send us the WhatsApp message so we can agree a time. It is already written for you."}
          </p>
          <a
            className={`${s.btn} ${s.btnPrimary}`}
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {isAr ? "إرسال الرسالة على واتساب" : "Send the WhatsApp message"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className={s.trialCard} onSubmit={submit} noValidate>
      <div className={s.trialHead}>
        <strong>{isAr ? "احجز حصة تجريبية مجانية" : "Book a free trial lesson"}</strong>
        <span>
          {isAr
            ? "املأ البيانات وسنتواصل معك على واتساب لتحديد الموعد."
            : "Fill this in and we will agree a time with you on WhatsApp."}
        </span>
      </div>

      <label className={s.trialField}>
        <span>{isAr ? "اسم الطالب الثلاثي *" : "Student's full name (three parts) *"}</span>
        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder={isAr ? "مثال: محمد عبدالله الأحمد" : "e.g. Mohammed Abdullah Al Ahmed"}
          autoComplete="name"
          required
        />
        {studentName.length > 0 && !nameOk && (
          <em>{isAr ? "الرجاء كتابة الاسم الثلاثي." : "Please enter all three parts of the name."}</em>
        )}
      </label>

      <div className={s.trialRow}>
        <label className={s.trialField}>
          <span>{isAr ? "الصف *" : "Grade *"}</span>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder={isAr ? "مثال: الأول المتوسط" : "e.g. Grade 7"}
            required
          />
        </label>

        <label className={s.trialField}>
          <span>{isAr ? "العمر *" : "Age *"}</span>
          {/* type="text" with a numeric keypad, not type="number": the platform
              rule is Western digits in a plain text field, and a number input
              renders Arabic-Indic digits on an Arabic OS. */}
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            inputMode="numeric"
            dir="ltr"
            placeholder="12"
            required
          />
        </label>
      </div>

      <label className={s.trialField}>
        <span>{isAr ? "رقم الواتساب *" : "WhatsApp number *"}</span>
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          inputMode="tel"
          dir="ltr"
          placeholder="05xxxxxxxx"
          autoComplete="tel"
          required
        />
        {whatsapp.length > 0 && !waOk && (
          <em>{isAr ? "يبدأ بـ 05 أو +966." : "Must start with 05 or +966."}</em>
        )}
      </label>

      {error && <p className={s.trialError}>{error}</p>}

      <button
        type="submit"
        className={`${s.btn} ${s.btnPrimary} ${s.trialSubmit}`}
        disabled={!canSubmit}
      >
        {status === "sending"
          ? isAr
            ? "جارٍ الإرسال…"
            : "Sending…"
          : isAr
            ? "أرسل الطلب"
            : "Send request"}
      </button>
    </form>
  );
}
