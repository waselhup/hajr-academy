"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sanitizeNumeric } from "@/lib/western-format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";

interface InitialState {
  bio: string;
  introVideoUrl: string;
  languages: string[];
  yearsExp: number;
  specializations: string[];
  publicSlug: string;
  avatar: string | null;
  name: string;
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function PublicProfileEditor({ initial }: { initial: InitialState }) {
  const t = useTranslations("TeacherProfile");
  const [bio, setBio] = useState(initial.bio);
  const [introVideoUrl, setIntroVideoUrl] = useState(initial.introVideoUrl);
  const [languagesText, setLanguagesText] = useState(initial.languages.join(", "));
  const [yearsExp, setYearsExp] = useState(initial.yearsExp);
  const [specText, setSpecText] = useState(initial.specializations.join(", "));
  const [publicSlug, setPublicSlug] = useState(initial.publicSlug);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/teacher/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.avatar) {
        setAvatar(data.avatar as string);
        setMsg({ ok: true, text: t("photoUploaded") });
      } else {
        setMsg({ ok: false, text: data.error ?? t("photoError") });
      }
    } catch {
      setMsg({ ok: false, text: t("photoError") });
    } finally {
      setUploadingPhoto(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio,
        introVideoUrl,
        languages: languagesText.split(",").map((x) => x.trim()).filter(Boolean),
        yearsExp,
        specializations: specText.split(",").map((x) => x.trim()).filter(Boolean),
        publicSlug,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.teacher.publicSlug) setPublicSlug(data.teacher.publicSlug);
      setMsg({ ok: true, text: t("savedOk") });
    } else {
      setMsg({ ok: false, text: data.error ?? "Failed" });
    }
    setSaving(false);
  }

  async function generateSlug() {
    setSaving(true);
    const res = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoSlug: true }),
    });
    const data = await res.json();
    if (res.ok && data.teacher.publicSlug) {
      setPublicSlug(data.teacher.publicSlug);
      setMsg({ ok: true, text: t("slugGenerated") });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5 rounded-xl border border-hajr-border bg-white p-6 shadow-sm">
      {/* Profile photo (F6) */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 ring-4 ring-brand-rose/20">
          {avatar ? <AvatarImage src={avatar} alt={initial.name} /> : null}
          <AvatarFallback className="bg-brand-navy text-xl text-white">
            {initials(initial.name || "?")}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="mb-1 text-sm font-medium text-hajr-text">{t("photo")}</p>
          <input
            ref={photoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={uploadingPhoto}
            onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
          />
          <button
            type="button"
            disabled={uploadingPhoto}
            onClick={() => photoRef.current?.click()}
            className="inline-flex h-10 items-center rounded-lg border border-hajr-border bg-white px-4 text-sm font-medium text-hajr-text hover:bg-hajr-ivory disabled:opacity-60"
          >
            {uploadingPhoto ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="me-2 h-4 w-4" />
            )}
            {avatar ? t("changePhoto") : t("uploadPhoto")}
          </button>
          <p className="mt-1 text-xs text-hajr-muted">{t("photoHint")}</p>
        </div>
      </div>

      <Field label={t("fieldBio")}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          maxLength={4000}
          className="w-full rounded-lg border border-hajr-border px-3 py-2 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          placeholder={t("bioPlaceholder")}
        />
      </Field>

      <Field label={t("fieldVideo")} hint={t("videoHint")}>
        <input
          type="url"
          value={introVideoUrl}
          onChange={(e) => setIntroVideoUrl(e.target.value)}
          maxLength={500}
          className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          placeholder="https://youtube.com/watch?v=..."
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fieldLanguages")} hint={t("commaSeparated")}>
          <input
            type="text"
            value={languagesText}
            onChange={(e) => setLanguagesText(e.target.value)}
            className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
            placeholder="Arabic, English"
          />
        </Field>

        <Field label={t("fieldYearsExp")}>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={yearsExp}
            onChange={(e) => setYearsExp(Number(sanitizeNumeric(e.target.value)))}
            className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          />
        </Field>
      </div>

      <Field label={t("fieldSpecializations")} hint={t("commaSeparated")}>
        <input
          type="text"
          value={specText}
          onChange={(e) => setSpecText(e.target.value)}
          className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          placeholder="IELTS, STEP, Speaking"
        />
      </Field>

      <Field label={t("fieldSlug")} hint={t("slugHint")}>
        <div className="flex gap-2">
          <input
            type="text"
            value={publicSlug}
            onChange={(e) => setPublicSlug(e.target.value)}
            maxLength={60}
            className="h-11 flex-1 rounded-lg border border-hajr-border px-3 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
            placeholder="my-name"
          />
          <button
            type="button"
            onClick={generateSlug}
            disabled={saving}
            className="h-11 rounded-lg border border-hajr-border bg-white px-4 text-sm font-medium text-hajr-text hover:bg-hajr-ivory disabled:opacity-60"
          >
            {t("generateSlug")}
          </button>
        </div>
      </Field>

      {msg && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm transition hover:bg-hajr-rose/90 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-hajr-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-hajr-muted">{hint}</span>}
    </label>
  );
}
