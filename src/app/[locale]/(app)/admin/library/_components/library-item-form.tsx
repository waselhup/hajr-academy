"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type {
  LibraryItem,
  LibraryItemTag,
  LibraryItemType,
} from "@prisma/client";
import { Upload } from "lucide-react";

type FormItem = (Partial<LibraryItem> & { tags?: LibraryItemTag[] }) | null;

export function LibraryItemForm({
  locale,
  mode,
  initial,
  returnTo,
}: {
  locale: string;
  mode: "create" | "edit";
  initial?: FormItem;
  returnTo: string;
}) {
  const t = useTranslations("Library");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    titleAr: initial?.titleAr ?? "",
    description: initial?.description ?? "",
    descriptionAr: initial?.descriptionAr ?? "",
    type: (initial?.type ?? "ARTICLE") as LibraryItemType,
    skillLevel: (initial?.skillLevel ?? "ALL") as string,
    targetAgeTier: (initial?.targetAgeTier ?? "ALL") as string,
    contentUrl: initial?.contentUrl ?? "",
    contentHtml: initial?.contentHtml ?? "",
    durationMinutes: initial?.durationMinutes ?? 5,
    thumbnailUrl: initial?.thumbnailUrl ?? "",
    isPublished: initial?.isPublished ?? false,
    tags: (initial?.tags ?? []).map((t) => t.tag).join(", "),
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleUpload(file: File, kind: "thumb" | "content") {
    const setBusy = kind === "thumb" ? setUploadingThumb : setUploadingContent;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch(`/api/library/upload`, { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "upload failed");
      if (kind === "thumb") setField("thumbnailUrl", j.publicUrl);
      else setField("contentUrl", j.publicUrl);
      toast.success(t("uploaded"));
    } catch (e) {
      toast.error(t("uploadFailed"), {
        description: e instanceof Error ? e.message : "",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        durationMinutes: Number(form.durationMinutes) || 5,
        tags: form.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      };
      const url =
        mode === "create"
          ? `/api/library/items`
          : `/api/library/items/${initial?.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "save failed");
      toast.success(mode === "create" ? t("created") : t("saved"));
      router.push(returnTo);
      router.refresh();
    } catch (e) {
      toast.error(t("saveFailed"), {
        description: e instanceof Error ? e.message : "",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("titleEn")}</Label>
          <Input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            data-testid="library-title-en"
          />
        </div>
        <div className="space-y-2">
          <Label>{t("titleAr")}</Label>
          <Input
            value={form.titleAr}
            onChange={(e) => setField("titleAr", e.target.value)}
            dir="rtl"
            data-testid="library-title-ar"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>{t("descriptionEn")}</Label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>{t("descriptionAr")}</Label>
          <Textarea
            rows={2}
            dir="rtl"
            value={form.descriptionAr}
            onChange={(e) => setField("descriptionAr", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("type")}</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setField("type", v as LibraryItemType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARTICLE">{t("typeArticle")}</SelectItem>
              <SelectItem value="VIDEO">{t("typeVideo")}</SelectItem>
              <SelectItem value="EXERCISE">{t("typeExercise")}</SelectItem>
              <SelectItem value="AUDIO">{t("typeAudio")}</SelectItem>
              <SelectItem value="PDF">{t("typePdf")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("skillLevel")}</Label>
          <Select
            value={form.skillLevel}
            onValueChange={(v) => setField("skillLevel", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["ALL", "A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("ageTier")}</Label>
          <Select
            value={form.targetAgeTier}
            onValueChange={(v) => setField("targetAgeTier", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("ageAll")}</SelectItem>
              <SelectItem value="TIER_1_3">{t("ageTier13")}</SelectItem>
              <SelectItem value="TIER_4_6">{t("ageTier46")}</SelectItem>
              <SelectItem value="MIDDLE">{t("ageMiddle")}</SelectItem>
              <SelectItem value="HIGH">{t("ageHigh")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("durationMinutes")}</Label>
          <Input
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => setField("durationMinutes", Number(e.target.value) || 5)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>{t("tags")}</Label>
          <Input
            placeholder={t("tagsPlaceholder")}
            value={form.tags}
            onChange={(e) => setField("tags", e.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label>{t("thumbnailUrl")}</Label>
          <div className="flex gap-2">
            <Input
              value={form.thumbnailUrl}
              onChange={(e) => setField("thumbnailUrl", e.target.value)}
              placeholder="https://..."
            />
            <input
              ref={thumbRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, "thumb");
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingThumb}
              onClick={() => thumbRef.current?.click()}
            >
              <Upload className="me-1 h-4 w-4" />
              {uploadingThumb ? "…" : t("upload")}
            </Button>
          </div>
          {form.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.thumbnailUrl} alt="" className="h-20 w-32 rounded object-cover" />
          )}
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label>{t("contentUrl")}</Label>
          <div className="flex gap-2">
            <Input
              value={form.contentUrl}
              onChange={(e) => setField("contentUrl", e.target.value)}
              placeholder={t("contentUrlPlaceholder")}
            />
            <input
              ref={contentRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, "content");
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingContent}
              onClick={() => contentRef.current?.click()}
            >
              <Upload className="me-1 h-4 w-4" />
              {uploadingContent ? "…" : t("upload")}
            </Button>
          </div>
        </div>

        {(form.type === "ARTICLE") && (
          <div className="space-y-2 md:col-span-2">
            <Label>{t("contentHtml")}</Label>
            <Textarea
              rows={8}
              value={form.contentHtml}
              onChange={(e) => setField("contentHtml", e.target.value)}
              placeholder="<p>...</p>"
              className="font-mono text-sm"
            />
          </div>
        )}

        <div className="flex items-center gap-3 md:col-span-2">
          <Switch
            checked={form.isPublished}
            onCheckedChange={(v) => setField("isPublished", v)}
            id="published"
          />
          <Label htmlFor="published">{t("publishImmediately")}</Label>
        </div>

        <div className="flex flex-col-reverse gap-2 md:col-span-2 md:flex-row md:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push(returnTo)}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={saving || !form.title || !form.titleAr}
            className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
            data-testid="library-save"
          >
            {saving ? t("saving") : mode === "create" ? t("create") : t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
