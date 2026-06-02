"use client";

/**
 * Teacher create-assignment dialog. Title (+ Arabic), class, description, due
 * date, an Attachments section (record video/voice, upload files, all kinds
 * allowed for teacher material) and a checkbox group choosing which response
 * kinds the student may submit (allowedResponseTypes). Text is always allowed
 * for the student as a fallback, so it isn't shown as a toggle.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import {
  AttachmentComposer,
  type StagedAttachment,
  type AttachmentKind,
} from "@/components/assignments/attachment-composer";
import { createAssignmentAction } from "@/lib/assignments/actions";

const RESPONSE_KINDS: AttachmentKind[] = ["VIDEO", "AUDIO", "FILE"];

export function CreateAssignmentDialog({
  locale,
  classes,
}: {
  locale: string;
  classes: { id: string; label: string }[];
}) {
  const t = useTranslations("Assignments");
  const router = useRouter();
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [classId, setClassId] = useState<string>(classes[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [allowed, setAllowed] = useState<AttachmentKind[]>(["FILE"]);
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);

  const toggleAllowed = (k: AttachmentKind) =>
    setAllowed((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const reset = () => {
    setTitle("");
    setTitleAr("");
    setDescription("");
    setDueDate("");
    setAllowed(["FILE"]);
    setAttachments([]);
  };

  const onSubmit = () => {
    if (title.trim().length < 2) {
      toast.error(t("titleRequired"));
      return;
    }
    if (!classId) {
      toast.error(t("classRequired"));
      return;
    }
    startTransition(async () => {
      const res = await createAssignmentAction({
        classId,
        title: title.trim(),
        titleAr: titleAr.trim() || undefined,
        description: description.trim() || undefined,
        dueDate: dueDate || null,
        allowedResponseTypes: allowed,
        attachments: attachments.map(({ kind, path, fileName, mimeType, sizeBytes, durationSec }) => ({
          kind,
          path,
          fileName,
          mimeType,
          sizeBytes,
          durationSec,
        })),
      });
      if (res.ok) {
        toast.success(t("createdOk"));
        reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(t("createError"));
      }
    });
  };

  const kindLabel = (k: AttachmentKind) =>
    k === "VIDEO" ? t("respVideo") : k === "AUDIO" ? t("respVoice") : t("respFile");

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
      <DialogTrigger asChild>
        <Button variant="cta" size="sm" disabled={classes.length === 0}>
          <Plus className="me-2 h-4 w-4" />
          {t("newAssignment")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("newAssignment")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class */}
          <div className="space-y-1.5">
            <Label>{t("classLabel")}</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder={t("classRequired")} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titles */}
          <div className="space-y-1.5">
            <Label htmlFor="a-title">{t("titleLabel")} <span className="text-hajr-rose">*</span></Label>
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-title-ar">{t("titleArLabel")}</Label>
            <Input id="a-title-ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="a-desc">{t("descriptionLabel")}</Label>
            <Textarea id="a-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label htmlFor="a-due">{t("dueDateLabel")}</Label>
            <Input id="a-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>{t("materialLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("materialHint")}</p>
            <AttachmentComposer
              allowedKinds={["VIDEO", "AUDIO", "FILE"]}
              value={attachments}
              onChange={setAttachments}
              disabled={pending}
            />
          </div>

          {/* Allowed response types */}
          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <Label>{t("allowedResponsesLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("allowedResponsesHint")}</p>
            <div className="flex flex-col gap-2">
              {RESPONSE_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={allowed.includes(k)} onCheckedChange={() => toggleAllowed(k)} />
                  {kindLabel(k)}
                </label>
              ))}
              <p className="text-xs text-muted-foreground">{t("textAlwaysAllowed")}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => (setOpen(false), reset())} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button variant="cta" size="sm" onClick={onSubmit} disabled={pending}>
            {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
