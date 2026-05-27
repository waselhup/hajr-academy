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
          value={form.descriptionAr}
          onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
          rows={2}
        />
      </div>
      <div>
        <Label>Description (EN)</Label>
        <Textarea
          value={form.descriptionEn}
          onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
          rows={2}
        />
      </div>
      <div>
        <Label>Scheduled at *</Label>
        <Input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Duration (min)</Label>
          <Input
            type="number"
            value={form.durationMin}
            onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Max attendees</Label>
          <Input
            type="number"
            value={form.maxAttendees}
            onChange={(e) => setForm({ ...form, maxAttendees: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label>Min level (CEFR)</Label>
        <Input
          placeholder="A2 / B1 / B2 / C1"
          value={form.minLevel}
          onChange={(e) => setForm({ ...form, minLevel: e.target.value })}
        />
      </div>
      <div>
        <Label>Host teacher</Label>
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
        <Label>Zoom join URL</Label>
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
