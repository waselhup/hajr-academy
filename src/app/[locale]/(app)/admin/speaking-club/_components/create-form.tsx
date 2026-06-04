"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  teachers: { id: string; name: string }[];
  locale: string;
}

export function EventCreateForm({ teachers, locale }: Props) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    titleAr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionEn: "",
    scheduledAt: "",
    durationMin: 60,
    maxAttendees: 30,
    minLevel: "",
    hostTeacherId: "",
    zoomJoinUrl: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleAr || !form.titleEn || !form.scheduledAt) {
      alert(isAr ? "املأ كل الحقول المطلوبة" : "Fill required fields");
      return;
    }
    startTransition(async () => {
      const r = await fetch("/api/admin/speaking-club", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          hostTeacherId: form.hostTeacherId || undefined,
          minLevel: form.minLevel || undefined,
          zoomJoinUrl: form.zoomJoinUrl || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setForm({
          titleAr: "",
          titleEn: "",
          descriptionAr: "",
          descriptionEn: "",
          scheduledAt: "",
          durationMin: 60,
          maxAttendees: 30,
          minLevel: "",
          hostTeacherId: "",
          zoomJoinUrl: "",
        });
        router.refresh();
      } else {
        alert(d.error || (isAr ? "فشل الإنشاء" : "Create failed"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
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
          value={form.descriptionAr}
          onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
          rows={2}
        />
      </div>
      <div>
        <Label>{isAr ? "الوصف (إنجليزي)" : "Description (EN)"}</Label>
        <Textarea
          value={form.descriptionEn}
          onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
          rows={2}
        />
      </div>
      <div>
        <Label>{isAr ? "موعد الجلسة *" : "Scheduled at *"}</Label>
        <Input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{isAr ? "المدة (دقيقة)" : "Duration (min)"}</Label>
          <Input
            type="number"
            value={form.durationMin}
            onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>{isAr ? "الحد الأقصى للحضور" : "Max attendees"}</Label>
          <Input
            type="number"
            value={form.maxAttendees}
            onChange={(e) => setForm({ ...form, maxAttendees: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label>{isAr ? "الحد الأدنى للمستوى (CEFR)" : "Min level (CEFR)"}</Label>
        <select
          className="w-full border border-hajr-border rounded-md p-2 min-h-[44px] bg-white"
          value={form.minLevel}
          onChange={(e) => setForm({ ...form, minLevel: e.target.value })}
        >
          <option value="">{isAr ? "كل المستويات" : "All levels"}</option>
          <option value="A1">{isAr ? "مبتدئ A1" : "Beginner A1"}</option>
          <option value="A2">{isAr ? "ابتدائي A2" : "Elementary A2"}</option>
          <option value="B1">{isAr ? "متوسط B1" : "Intermediate B1"}</option>
          <option value="B2">{isAr ? "فوق المتوسط B2" : "Upper-Intermediate B2"}</option>
          <option value="C1">{isAr ? "متقدم C1" : "Advanced C1"}</option>
          <option value="C2">{isAr ? "إتقان C2" : "Mastery C2"}</option>
        </select>
        <p className="text-xs text-hajr-muted mt-1">
          {isAr
            ? "يحدد أدنى مستوى يمكنه الانضمام."
            : "Sets the minimum level allowed to join."}
        </p>
      </div>
      <div>
        <Label>{isAr ? "المدرّب المضيف" : "Host teacher"}</Label>
        <select
          className="w-full border border-hajr-border rounded-md p-2 min-h-[44px] bg-white"
          value={form.hostTeacherId}
          onChange={(e) => setForm({ ...form, hostTeacherId: e.target.value })}
        >
          <option value="">{isAr ? "بدون" : "None"}</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label>{isAr ? "رابط Zoom للانضمام" : "Zoom join URL"}</Label>
        <Input
          value={form.zoomJoinUrl}
          onChange={(e) => setForm({ ...form, zoomJoinUrl: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-hajr-rose text-white min-h-[44px] w-full"
        >
          {pending ? "..." : isAr ? "إنشاء" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
