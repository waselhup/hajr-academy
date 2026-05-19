"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Trash2, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { linkChildAction, unlinkChildAction } from "../../_actions/parents";

export function ParentDetailSheet({
  parent, students, onClose, onDone,
}: {
  parent: any;
  students: { id: string; name: string; nameAr: string | null }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState("");
  const [relation, setRelation] = useState("parent");
  const [isPrimary, setIsPrimary] = useState(false);
  const [canPay, setCanPay] = useState(true);

  const linkedIds = new Set((parent.profile?.childLinks ?? []).map((l: any) => l.studentId));
  const availableStudents = students.filter((s) => !linkedIds.has(s.id));

  function doLink() {
    if (!studentId || !parent.profile) return;
    startTransition(async () => {
      const res = await linkChildAction({
        parentProfileId: parent.profile.id,
        studentProfileId: studentId,
        relation, isPrimary, canPay,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(t("Parents.linkedSuccess"));
      setStudentId("");
      onDone();
    });
  }

  function doUnlink(linkId: string) {
    startTransition(async () => {
      const res = await unlinkChildAction(linkId);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(t("Parents.unlinkedSuccess"));
      onDone();
    });
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{locale === "ar" && parent.nameAr ? parent.nameAr : parent.name}</SheetTitle>
          <SheetDescription>{parent.email} · <span className="font-mono">{parent.profile?.inviteCode}</span></SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("Parents.linkedChildren")}</h3>
            {(parent.profile?.childLinks ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Parents.noChildren")}</p>
            ) : (
              <div className="space-y-2">
                {parent.profile.childLinks.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 rounded border p-2">
                    <div>
                      <div className="font-medium text-sm">{locale === "ar" && l.studentNameAr ? l.studentNameAr : l.studentName}</div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="info">{l.relation}</Badge>
                        {l.isPrimary && <Badge variant="success">{t("Parents.isPrimary")}</Badge>}
                        {l.canPay && <Badge variant="rose">{t("Parents.canPay")}</Badge>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => doUnlink(l.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">{t("Parents.linkChild")}</h3>
            <div>
              <Label>{t("Common.students")}</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder={t("Common.search")} /></SelectTrigger>
                <SelectContent>
                  {availableStudents.length === 0 && <SelectItem value="_none_" disabled>{t("Common.noData")}</SelectItem>}
                  {availableStudents.map((s) => <SelectItem key={s.id} value={s.id}>{locale === "ar" && s.nameAr ? s.nameAr : s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Parents.relation")}</Label>
              <Select value={relation} onValueChange={setRelation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">parent</SelectItem>
                  <SelectItem value="guardian">guardian</SelectItem>
                  <SelectItem value="sibling">sibling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("Parents.isPrimary")}</Label>
              <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("Parents.canPay")}</Label>
              <Switch checked={canPay} onCheckedChange={setCanPay} />
            </div>
            <Button onClick={doLink} disabled={!studentId || isPending} className="w-full">
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              <Plus className="me-2 h-4 w-4" />{t("Parents.linkChild")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
