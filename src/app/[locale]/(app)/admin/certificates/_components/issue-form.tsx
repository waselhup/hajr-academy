"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/western-fields";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  students: { id: string; name: string }[];
  locale: string;
}

const TYPES = [
  "LEVEL_COMPLETION",
  "COURSE_COMPLETION",
  "PLACEMENT",
  "ATTENDANCE",
  "SPEAKING_CLUB",
] as const;

export function IssueForm({ students, locale }: Props) {
  const router = useRouter();
  const t = useTranslations("Certificates");
  const isAr = locale === "ar";
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    studentId: "",
    type: "LEVEL_COMPLETION" as (typeof TYPES)[number],
    titleAr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionEn: "",
    cefrLevel: "",
    score: "",
    expiryDate: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.titleAr || !form.titleEn) {
      toast.error(t("fillRequired"));
      return;
    }
    startTransition(async () => {
      const r = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          score: form.score ? Number(form.score) : undefined,
          cefrLevel: form.cefrLevel || undefined,
          expiryDate: form.expiryDate || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setForm({
          studentId: "",
          type: "LEVEL_COMPLETION",
          titleAr: "",
          titleEn: "",
          descriptionAr: "",
          descriptionEn: "",
          cefrLevel: "",
          score: "",
          expiryDate: "",
        });
        toast.success(t("issueSuccess"));
        router.refresh();
      } else {
        toast.error(d.error || t("issueFailed"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <div>
        <Label>{isAr ? "الطالب *" : "Student *"}</Label>
        <select
          className="w-full border border-hajr-border rounded-md p-2 min-h-[44px] bg-white"
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          required
        >
          <option value="">{isAr ? "اختر طالب…" : "Select student…"}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>{isAr ? "النوع *" : "Type *"}</Label>
        <select
          className="w-full border border-hajr-border rounded-md p-2 min-h-[44px] bg-white"
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as (typeof TYPES)[number] })
          }
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>{isAr ? "العنوان (عربي) *" : "Title (AR) *"}</Label>
        <Input
          value={form.titleAr}
          onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>{isAr ? "العنوان (إنجليزي) *" : "Title (EN) *"}</Label>
        <Input
          value={form.titleEn}
          onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>{isAr ? "الوصف (عربي)" : "Description (AR)"}</Label>
        <Textarea
          rows={2}
          value={form.descriptionAr}
          onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
        />
      </div>
      <div>
        <Label>{isAr ? "الوصف (إنجليزي)" : "Description (EN)"}</Label>
        <Textarea
          rows={2}
          value={form.descriptionEn}
          onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
        />
      </div>
      <div>
        <Label>{isAr ? "المستوى (CEFR)" : "CEFR Level"}</Label>
        <Input
          placeholder="A1 / A2 / B1 / B2 / C1 / C2"
          value={form.cefrLevel}
          onChange={(e) => setForm({ ...form, cefrLevel: e.target.value })}
        />
      </div>
      <div>
        <Label>{isAr ? "الدرجة (0-100)" : "Score (0-100)"}</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={form.score}
          onChange={(e) => setForm({ ...form, score: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Label>{isAr ? "تاريخ الانتهاء (اختياري)" : "Expiry date (optional)"}</Label>
        <DateField
          value={form.expiryDate}
          onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-hajr-rose text-white min-h-[44px] w-full"
        >
          {pending ? "..." : isAr ? "إصدار الشهادة" : "Issue certificate"}
        </Button>
      </div>
    </form>
  );
}
