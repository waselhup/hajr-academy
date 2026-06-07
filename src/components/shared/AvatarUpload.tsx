"use client";

/**
 * Shared profile-photo control — used by every role (student, teacher,
 * marketer, admin, super-admin, parent). Renders an avatar preview plus
 * "Upload / Change photo" and "Remove" buttons, posts to the role-agnostic
 * `/api/profile/avatar` route, shows a toast, and calls router.refresh() so the
 * server-rendered photo (top-right corner, cards, rosters) updates everywhere.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Trash2 } from "lucide-react";

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function AvatarUpload({
  name,
  initialAvatar,
  size = "lg",
}: {
  /** Display name — used for the initials fallback. */
  name: string;
  /** Current avatar URL (null → initials). */
  initialAvatar: string | null;
  size?: "md" | "lg";
}) {
  const t = useTranslations("Avatar");
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = uploading || removing;
  const dim = size === "lg" ? "h-20 w-20" : "h-16 w-16";

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.avatar) {
        setAvatar(data.avatar as string); // optimistic local preview
        toast.success(t("photoUploaded"));
        router.refresh(); // refresh server-rendered photo everywhere (corner, cards)
      } else {
        toast.error(data.error ?? t("photoError"));
      }
    } catch {
      toast.error(t("photoError"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAvatar(null);
        toast.success(t("photoRemoved"));
        router.refresh();
      } else {
        toast.error(data.error ?? t("photoError"));
      }
    } catch {
      toast.error(t("photoError"));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className={`${dim} ring-4 ring-brand-rose/20`}>
        {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
        <AvatarFallback className="bg-brand-navy text-xl text-white">
          {initials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <p className="mb-1 text-sm font-medium text-hajr-text">{t("photo")}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center rounded-lg border border-hajr-border bg-white px-4 text-sm font-medium text-hajr-text hover:bg-hajr-ivory disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="me-2 h-4 w-4" />
            )}
            {avatar ? t("changePhoto") : t("uploadPhoto")}
          </button>
          {avatar && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="inline-flex h-10 items-center rounded-lg border border-hajr-border bg-white px-4 text-sm font-medium text-hajr-error hover:bg-red-50 disabled:opacity-60"
            >
              {removing ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              {t("removePhoto")}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-hajr-muted">{t("photoHint")}</p>
      </div>
    </div>
  );
}
