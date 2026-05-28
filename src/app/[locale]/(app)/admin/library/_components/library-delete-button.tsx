"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function LibraryDeleteButton({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("Library");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/library/items/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "delete failed");
      toast.success(t("deleted"));
      router.push(`/${locale}/admin/library`);
      router.refresh();
    } catch (e) {
      toast.error(t("deleteFailed"), {
        description: e instanceof Error ? e.message : "",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" disabled={busy} onClick={onDelete}>
      <Trash2 className="me-1 h-4 w-4" />
      {t("delete")}
    </Button>
  );
}
