"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Upload, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { submitDemoLinkAction } from "@/app/[locale]/(applicant)/applicant/_actions";

const MAX_MB = 200;

/** Demo lesson submission — upload a recorded file OR submit a link. */
export function DemoSubmit() {
  const t = useTranslations("Applicant");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [link, setLink] = useState("");
  const [isPending, startTransition] = useTransition();

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error(t("demoNoFile"));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(t("demoTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/applicants/demo", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error ?? t("demoUploadError"));
        return;
      }
      setUploaded(true);
      toast.success(t("demoUploadOk"));
      router.refresh();
    } catch {
      toast.error(t("demoUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const onSubmitLink = () => {
    startTransition(async () => {
      const res = await submitDemoLinkAction(link);
      if (res.ok) {
        toast.success(t("demoLinkOk"));
        setLink("");
        router.refresh();
      } else {
        toast.error(t("demoLinkError"));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload a recorded file */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <Label className="flex items-center gap-2 font-semibold text-hajr-deep-navy">
            <Upload className="h-4 w-4 text-hajr-rose" />
            {t("demoUploadHeading")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("demoUploadHint", { max: MAX_MB })}</p>
          <input
            ref={fileRef}
            type="file"
            accept="video/webm,video/mp4,video/quicktime,video/ogg"
            className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-hajr-rose/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-hajr-rose hover:file:bg-hajr-rose/20"
          />
          <Button variant="cta" size="sm" onClick={onUpload} disabled={uploading || uploaded}>
            {uploading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : uploaded ? (
              <CheckCircle2 className="me-2 h-4 w-4" />
            ) : (
              <Upload className="me-2 h-4 w-4" />
            )}
            {uploaded ? t("demoUploaded") : t("demoUploadBtn")}
          </Button>
        </CardContent>
      </Card>

      {/* OR submit a link */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <Label htmlFor="demoLink" className="flex items-center gap-2 font-semibold text-hajr-deep-navy">
            <LinkIcon className="h-4 w-4 text-hajr-rose" />
            {t("demoLinkHeading")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("demoLinkHint")}</p>
          <div className="flex gap-2">
            <Input
              id="demoLink"
              type="url"
              dir="ltr"
              placeholder="https://…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onSubmitLink}
              disabled={isPending || !link.trim()}
            >
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("demoLinkBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
