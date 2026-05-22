"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";

interface StudentOption {
  id: string;
  name: string;
  currentClassId: string | null;
  currentClassName: string | null;
}
interface ClassOption {
  id: string;
  name: string;
  teacherName: string;
  seats: string;
}

export function TransferStudentClient({
  students,
  classes,
}: {
  students: StudentOption[];
  classes: ClassOption[];
}) {
  const t = useTranslations("Assignment");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [studentId, setStudentId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  async function transfer() {
    if (!studentId || !toClassId) {
      toast.error(isAr ? "اختر الطالب والفصل" : "Select a student and class");
      return;
    }
    if (selectedStudent?.currentClassId === toClassId) {
      toast.error(isAr ? "الطالب في هذا الفصل بالفعل" : "Student is already in this class");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromClassId: selectedStudent?.currentClassId ?? null,
          toClassId,
          reason: reason || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(isAr ? "تم نقل الطالب" : "Student transferred");
        setStudentId("");
        setToClassId("");
        setReason("");
        router.refresh();
      } else {
        toast.error(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <Label>{t("student")}</Label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="mt-1 w-full rounded-md border p-2 text-sm"
          >
            <option value="">—</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {selectedStudent && (
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">{t("currentClass")}:</span>
            <Badge variant="outline">
              {selectedStudent.currentClassName ?? t("noClass")}
            </Badge>
            <ArrowRight className="h-4 w-4 text-hajr-rose rtl-flip" />
            <Badge variant="success">
              {classes.find((c) => c.id === toClassId)?.name ?? "?"}
            </Badge>
          </div>
        )}

        <div>
          <Label>{t("targetClass")}</Label>
          <select
            value={toClassId}
            onChange={(e) => setToClassId(e.target.value)}
            className="mt-1 w-full rounded-md border p-2 text-sm"
          >
            <option value="">—</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.teacherName} · {c.seats}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>{t("reason")}</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isAr ? "سبب النقل (اختياري)" : "Reason (optional)"}
          />
        </div>

        <Button onClick={transfer} disabled={busy}>
          {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("confirmTransfer")}
        </Button>
      </CardContent>
    </Card>
  );
}
