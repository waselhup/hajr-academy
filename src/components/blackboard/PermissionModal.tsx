"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Student {
  id: string;
  userId: string;
  name: string;
}

interface PermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  students: Student[];
  allowStudentEdit: boolean;
  grantedStudentIds: Set<string>;
  onGlobalToggle: (enabled: boolean) => void;
  onBroadcastPermission: (studentId: string, granted: boolean) => void;
}

export function PermissionModal({
  open,
  onOpenChange,
  roomId,
  students,
  allowStudentEdit,
  grantedStudentIds,
  onGlobalToggle,
  onBroadcastPermission,
}: PermissionModalProps) {
  const t = useTranslations("Blackboard");
  const [globalEdit, setGlobalEdit] = useState(allowStudentEdit);
  const [granted, setGranted] = useState<Set<string>>(grantedStudentIds);

  useEffect(() => {
    setGranted(grantedStudentIds);
    setGlobalEdit(allowStudentEdit);
  }, [grantedStudentIds, allowStudentEdit]);

  const handleGlobalToggle = async (checked: boolean) => {
    setGlobalEdit(checked);
    onGlobalToggle(checked);
  };

  const handleStudentToggle = async (studentId: string, userId: string, checked: boolean) => {
    const endpoint = checked ? "grant-edit" : "revoke-edit";
    const res = await fetch(`/api/blackboard/${roomId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });

    if (res.ok) {
      const next = new Set(granted);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      setGranted(next);
      onBroadcastPermission(userId, checked);
      toast.success(checked ? t("permissionGranted") : t("permissionRevoked"));
    } else {
      toast.error(t("permissionError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("permissions")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="global-edit" className="text-sm font-medium">
              {t("allowAllStudents")}
            </Label>
            <Switch
              id="global-edit"
              checked={globalEdit}
              onCheckedChange={handleGlobalToggle}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("individualPermissions")}</p>
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-2">
                <span className="text-sm">{s.name}</span>
                <Switch
                  checked={globalEdit || granted.has(s.id)}
                  disabled={globalEdit}
                  onCheckedChange={(checked) => handleStudentToggle(s.id, s.userId, checked)}
                />
              </div>
            ))}
            {students.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("noEnrolledStudents")}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
