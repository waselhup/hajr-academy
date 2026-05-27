"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      alert(isAr ? "املأ كل الحقول المطلوبة" : "Fill required fields");
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
        router.refresh();
      } else {
        alert(d.error || (isAr ? "فشل الإصدار" : "Issue failed"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <div>
        <Label>Student *</Label>
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
        <Label>Type *</Label>
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
        <Label>Title (AR) *</Label>
        <Input
          value={form.titleAr}
          onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Title (EN) *</Label>
        <Input
          value={form.titleEn}
          onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Description (AR)</Label>
        <Textarea
          rows={2}
          value={form.descriptionAr}
          onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
        />
      </div>
      <div>
        <Label>Description (EN)</Label>
        <Textarea
          rows={2}
          value={form.descriptionEn}
          onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
        />
      </div>
      <div>
        <Label>CEFR Level</Label>
        <Input
          placeholder="A1 / A2 / B1 / B2 / C1 / C2"
          value={form.cefrLevel}
          onChange={(e) => setForm({ ...form, cefrLevel: e.target.value })}
        />
      </div>
      <div>
        <Label>Score (0-100)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={form.score}
          onChange={(e) => setForm({ ...form, score: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Label>Expiry date (optional)</Label>
        <Input
          type="date"
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
