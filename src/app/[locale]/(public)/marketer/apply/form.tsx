"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

/** The six allowed target-audience values (must mirror the server enum). */
const AUDIENCES = [
  "PARENTS",
  "SCHOOL_STUDENTS",
  "UNIVERSITY_STUDENTS",
  "JOB_SEEKERS",
  "EMPLOYEES",
  "OTHER",
] as const;
type Audience = (typeof AUDIENCES)[number];

/** The four allowed monthly-capacity ranges (must mirror the server enum). */
const CAPACITIES = ["RANGE_1_5", "RANGE_6_10", "RANGE_11_20", "RANGE_20_PLUS"] as const;
type Capacity = (typeof CAPACITIES)[number];

const WORD_LIMIT = 100;

/** Count words the same way the server does: split the trimmed value on whitespace. */
function wordCount(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

const inputCls =
  "h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none";
const areaCls =
  "w-full rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none";

export function MarketerApplyForm() {
  const t = useTranslations("Marketer");

  // Account fields (still needed to create the account).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [social, setSocial] = useState(""); // optional, not one of the 7

  // The 7 structured answers.
  const [introduceYourself, setIntroduceYourself] = useState("");
  const [experience, setExperience] = useState("");
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audiencesOther, setAudiencesOther] = useState("");
  const [channels, setChannels] = useState("");
  const [convince, setConvince] = useState("");
  const [monthlyCapacity, setMonthlyCapacity] = useState<Capacity | "">("");
  const [whySuccessful, setWhySuccessful] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Field-level errors keyed by field name; populated only after a submit attempt.
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const convinceWords = useMemo(() => wordCount(convince), [convince]);
  const whyWords = useMemo(() => wordCount(whySuccessful), [whySuccessful]);
  const otherChosen = audiences.includes("OTHER");

  function toggleAudience(a: Audience) {
    setAudiences((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  /** Mirror the server validation so the user gets inline feedback before POST. */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t("errRequired");
    if (!email.trim()) e.email = t("errRequired");
    if (!phone.trim()) e.phone = t("errRequired");
    if (!introduceYourself.trim()) e.introduceYourself = t("errRequired");
    if (!experience.trim()) e.experience = t("errRequired");
    if (audiences.length === 0) e.audiences = t("errAudiencesRequired");
    if (otherChosen && !audiencesOther.trim())
      e.audiencesOther = t("errAudiencesOtherRequired");
    if (!channels.trim()) e.channels = t("errRequired");
    if (!convince.trim()) e.convince = t("errRequired");
    else if (convinceWords > WORD_LIMIT) e.convince = t("errWordLimit");
    if (!monthlyCapacity) e.monthlyCapacity = t("errCapacityRequired");
    if (!whySuccessful.trim()) e.whySuccessful = t("errRequired");
    else if (whyWords > WORD_LIMIT) e.whySuccessful = t("errWordLimit");
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(null);
    const e = validate();
    setFieldErrs(e);
    if (Object.keys(e).length > 0) {
      setErr(t("errFixFields"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/marketers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          social: social.trim(),
          answers: {
            introduceYourself: introduceYourself.trim(),
            experience: experience.trim(),
            audiences,
            audiencesOther: otherChosen ? audiencesOther.trim() : "",
            channels: channels.trim(),
            convince: convince.trim(),
            monthlyCapacity,
            whySuccessful: whySuccessful.trim(),
          },
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Failed");
      }
      setSuccess(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-hajr-mint bg-hajr-mint/10 p-8 text-center">
        <p className="text-lg font-medium text-hajr-deep-navy">{t("applySuccess")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5 rounded-2xl border border-hajr-border bg-white p-6 shadow-card"
    >
      <p className="text-sm text-hajr-muted">{t("applyQuestionsIntro")}</p>

      {/* Account fields */}
      <Field label={t("applyName")} htmlFor="name" error={fieldErrs.name}>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t("applyEmail")} htmlFor="email" error={fieldErrs.email}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("applyPhone")} htmlFor="phone" error={fieldErrs.phone}>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label={t("applySocial")} htmlFor="social">
        <input
          id="social"
          value={social}
          onChange={(e) => setSocial(e.target.value)}
          className={inputCls}
          placeholder="@example"
        />
      </Field>

      <hr className="border-hajr-border/70" />

      {/* Q1 — introduce yourself */}
      <Field
        label={t("qIntroduceYourself")}
        htmlFor="introduceYourself"
        hint={t("qIntroduceYourselfHint")}
        error={fieldErrs.introduceYourself}
      >
        <textarea
          id="introduceYourself"
          rows={4}
          value={introduceYourself}
          onChange={(e) => setIntroduceYourself(e.target.value)}
          className={areaCls}
        />
      </Field>

      {/* Q2 — experience */}
      <Field
        label={t("qExperience")}
        htmlFor="experience"
        hint={t("qExperienceHint")}
        error={fieldErrs.experience}
      >
        <textarea
          id="experience"
          rows={4}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className={areaCls}
        />
      </Field>

      {/* Q3 — audiences (multi-select) */}
      <Field
        label={t("qAudiences")}
        hint={t("qAudiencesHint")}
        error={fieldErrs.audiences}
      >
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => {
            const on = audiences.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAudience(a)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  on
                    ? "border-hajr-rose bg-hajr-rose text-white"
                    : "border-hajr-border bg-white text-hajr-text hover:border-hajr-rose"
                }`}
              >
                {t(`audience_${a}`)}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Q3b — audiencesOther (required iff OTHER chosen) */}
      {otherChosen && (
        <Field
          label={t("qAudiencesOther")}
          htmlFor="audiencesOther"
          hint={t("qAudiencesOtherHint")}
          error={fieldErrs.audiencesOther}
        >
          <input
            id="audiencesOther"
            value={audiencesOther}
            onChange={(e) => setAudiencesOther(e.target.value)}
            className={inputCls}
          />
        </Field>
      )}

      {/* Q4 — channels */}
      <Field
        label={t("qChannels")}
        htmlFor="channels"
        hint={t("qChannelsHint")}
        error={fieldErrs.channels}
      >
        <textarea
          id="channels"
          rows={3}
          value={channels}
          onChange={(e) => setChannels(e.target.value)}
          className={areaCls}
        />
      </Field>

      {/* Q5 — convince (max 100 words, live counter) */}
      <Field
        label={t("qConvince")}
        htmlFor="convince"
        hint={t("qConvinceHint")}
        error={fieldErrs.convince}
        counter={
          <WordCounter t={t} count={convinceWords} over={convinceWords > WORD_LIMIT} />
        }
      >
        <textarea
          id="convince"
          rows={4}
          value={convince}
          onChange={(e) => setConvince(e.target.value)}
          className={`${areaCls} ${
            convinceWords > WORD_LIMIT ? "border-hajr-error focus:border-hajr-error" : ""
          }`}
        />
      </Field>

      {/* Q6 — monthly capacity (select) */}
      <Field
        label={t("qMonthlyCapacity")}
        htmlFor="monthlyCapacity"
        hint={t("qMonthlyCapacityHint")}
        error={fieldErrs.monthlyCapacity}
      >
        <select
          id="monthlyCapacity"
          value={monthlyCapacity}
          onChange={(e) => setMonthlyCapacity(e.target.value as Capacity | "")}
          className={`${inputCls} num`}
        >
          <option value="" disabled>
            {t("capacitySelectPlaceholder")}
          </option>
          {CAPACITIES.map((c) => (
            <option key={c} value={c}>
              {t(`capacity_${c}`)}
            </option>
          ))}
        </select>
      </Field>

      {/* Q7 — why successful (max 100 words, live counter) */}
      <Field
        label={t("qWhySuccessful")}
        htmlFor="whySuccessful"
        hint={t("qWhySuccessfulHint")}
        error={fieldErrs.whySuccessful}
        counter={<WordCounter t={t} count={whyWords} over={whyWords > WORD_LIMIT} />}
      >
        <textarea
          id="whySuccessful"
          rows={4}
          value={whySuccessful}
          onChange={(e) => setWhySuccessful(e.target.value)}
          className={`${areaCls} ${
            whyWords > WORD_LIMIT ? "border-hajr-error focus:border-hajr-error" : ""
          }`}
        />
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-lg bg-hajr-rose px-4 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "…" : t("applySubmit")}
      </button>

      {err && <p className="text-xs text-hajr-error">{err}</p>}
    </form>
  );
}

/** A labelled field wrapper: label (+ optional inline word counter), optional hint,
 *  the control (children), and an optional inline error message. */
function Field({
  label,
  htmlFor,
  hint,
  error,
  counter,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="block text-xs text-hajr-muted">
          {label}
        </label>
        {counter}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-hajr-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-hajr-error">{error}</p>}
    </div>
  );
}

/** Live "words: X/100" counter. Western digits (plain JS numbers, `.num` class). */
function WordCounter({
  t,
  count,
  over,
}: {
  t: ReturnType<typeof useTranslations>;
  count: number;
  over: boolean;
}) {
  return (
    <span className={`num text-xs ${over ? "text-hajr-error" : "text-hajr-muted"}`}>
      {t("wordCounter", { count, max: WORD_LIMIT })}
    </span>
  );
}
