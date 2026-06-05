"use client";

import { Suspense, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

const SUBJECTS = [
  "GENERAL",
  "PROGRAMS",
  "PRICING",
  "SUPPORT",
  "COMPLAINT",
  "PARTNERSHIP",
] as const;

/**
 * Public contact form — posts to /api/contact (no auth). Used both on the
 * landing page #contact section and the /contact page. Wrapped in <Suspense>
 * because the inner form reads
 * URL query params (useSearchParams) to prefill context from the CTA that
 * linked here — without the boundary, Next would bail the whole page out of
 * static rendering. Renders identically with or without params.
 */
export function ContactForm() {
  return (
    <Suspense fallback={<ContactFormInner prefill={{ subject: "GENERAL", message: "" }} />}>
      <ContactFormWithParams />
    </Suspense>
  );
}

function ContactFormWithParams() {
  const isAr = useLocale() === "ar";
  const sp = useSearchParams();

  // Prefill from the CTA that linked here so leads carry context:
  //   /contact?subject=PROGRAMS   → pre-select that subject
  //   /contact?teacher=<slug>     → note which teacher prompted a trial request
  const subjParam = (sp.get("subject") || "").toUpperCase();
  const subject = (SUBJECTS as readonly string[]).includes(subjParam)
    ? (subjParam as (typeof SUBJECTS)[number])
    : "GENERAL";
  const teacherParam = sp.get("teacher")?.trim();
  const message = teacherParam
    ? isAr
      ? `أرغب بحجز حصة تجريبية مجانية مع المعلّم: ${teacherParam}.\n\n`
      : `I'd like to book a free trial class with teacher: ${teacherParam}.\n\n`
    : "";

  return <ContactFormInner prefill={{ subject, message }} />;
}

function ContactFormInner({
  prefill,
}: {
  prefill: { subject: (typeof SUBJECTS)[number]; message: string };
}) {
  const t = useTranslations("Contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>(prefill.subject);
  const [message, setMessage] = useState(prefill.message);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          subject,
          message: message.trim(),
        }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || t("errorGeneric"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </span>
        <h3 className="mt-4 text-lg font-bold text-hajr-navy">{t("successTitle")}</h3>
        <p className="mt-1.5 text-sm text-hajr-muted">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fieldName")} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("fieldNamePlaceholder")}
            required
          />
        </Field>
        <Field label={t("fieldEmail")} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("fieldEmailPlaceholder")}
            required
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fieldPhone")}>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("fieldPhonePlaceholder")}
            dir="ltr"
          />
        </Field>
        <Field label={t("fieldSubject")} required>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
            className="flex h-10 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-navy outline-none transition-colors focus-visible:ring-2 focus-visible:ring-hajr-navy"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {t(`subject${s}` as any)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("fieldMessage")} required>
        <Textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("fieldMessagePlaceholder")}
          className="resize-none"
          required
        />
      </Field>

      {status === "error" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
      )}

      <Button
        type="submit"
        variant="cta"
        className="w-full"
        disabled={status === "sending" || !name.trim() || !email.trim() || !message.trim()}
      >
        {status === "sending" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-hajr-navy">
        {label}
        {required && <span className="text-hajr-rose"> *</span>}
      </span>
      {children}
    </label>
  );
}
