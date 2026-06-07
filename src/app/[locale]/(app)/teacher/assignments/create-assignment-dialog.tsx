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
import { DateTimeField } from "@/components/ui/western-fields";
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
import { Plus, Loader2, Users, UserCheck, Search } from "lucide-react";
import {
  AttachmentComposer,
  type StagedAttachment,
  type AttachmentKind,
} from "@/components/assignments/attachment-composer";
import { createAssignmentAction } from "@/lib/assignments/actions";

const RESPONSE_KINDS: AttachmentKind[] = ["VIDEO", "AUDIO", "FILE"];

type Audience = "ALL_CLASS" | "SELECTED";

export function CreateAssignmentDialog({
  locale,
  classes,
  classStudents,
}: {
  locale: string;
  classes: { id: string; label: string }[];
  /** ACTIVE roster per class id, for the "specific students" picker. */
  classStudents: Record<string, { id: string; name: string }[]>;
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
  const [audience, setAudience] = useState<Audience>("ALL_CLASS");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [studentQuery, setStudentQuery] = useState("");

  // Roster for the currently-picked class (empty if none / class has no roster).
  const roster = classStudents[classId] ?? [];
  const filteredRoster = studentQuery.trim()
    ? roster.filter((s) => s.name.toLowerCase().includes(studentQuery.trim().toLowerCase()))
    : roster;

  const toggleAllowed = (k: AttachmentKind) =>
    setAllowed((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const toggleStudent = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Switching the class invalidates any prior selection (different roster).
  const onClassChange = (next: string) => {
    setClassId(next);
    setSelectedIds([]);
    setStudentQuery("");
  };

  const reset = () => {
    setTitle("");
    setTitleAr("");
    setDescription("");
    setDueDate("");
    setAllowed(["FILE"]);
    setAttachments([]);
    setAudience("ALL_CLASS");
    setSelectedIds([]);
    setStudentQuery("");
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
    if (audience === "SELECTED" && selectedIds.length === 0) {
      toast.error(t("selectStudentsRequired"));
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
        audience,
        studentIds: audience === "SELECTED" ? selectedIds : undefined,
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
            <Select value={classId} onValueChange={onClassChange}>
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
            <DateTimeField id="a-due" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {/* Audience — who gets this assignment */}
          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <Label>{t("audienceLabel")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAudience("ALL_CLASS")}
                aria-pressed={audience === "ALL_CLASS"}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  audience === "ALL_CLASS"
                    ? "border-hajr-rose bg-hajr-rose/10 font-medium text-hajr-rose"
                    : "border-input hover:bg-muted"
                }`}
              >
                <Users className="h-4 w-4" />
                {t("audienceAll")}
              </button>
              <button
                type="button"
                onClick={() => setAudience("SELECTED")}
                aria-pressed={audience === "SELECTED"}
                disabled={roster.length === 0}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  audience === "SELECTED"
                    ? "border-hajr-rose bg-hajr-rose/10 font-medium text-hajr-rose"
                    : "border-input hover:bg-muted"
                }`}
              >
                <UserCheck className="h-4 w-4" />
                {t("audienceSpecific")}
              </button>
            </div>

            {audience === "ALL_CLASS" ? (
              <p className="text-xs text-muted-foreground">
                {roster.length > 0
                  ? `${t("audienceAllHint")} (${roster.length})`
                  : t("audienceAllHint")}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    <span className="num">{selectedIds.length}</span> / <span className="num">{roster.length}</span>{" "}
                    {ar ? "طالب" : "students"}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSelectedIds(roster.map((s) => s.id))}
                      disabled={selectedIds.length === roster.length}
                    >
                      {t("selectAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSelectedIds([])}
                      disabled={selectedIds.length === 0}
                    >
                      {t("clearSelection")}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-2.5 rtl:right-2.5" />
                  <Input
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder={t("searchStudents")}
                    className="ltr:pl-8 rtl:pr-8"
                  />
                </div>

                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-1">
                  {filteredRoster.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                      {t("noStudentsMatch")}
                    </p>
                  ) : (
                    filteredRoster.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedIds.includes(s.id)}
                          onCheckedChange={() => toggleStudent(s.id)}
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>{t("materialLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("materialHint")}</p>
            <AttachmentComposer
              allowedKinds={["VIDEO", "AUDIO", "FILE", "LINK"]}
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
