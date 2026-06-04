"use client";

/**
 * Admin "Targeted uploads" panel (C7) — sits alongside the existing Zoom
 * recordings list on /admin/recordings (a sibling tab; the Zoom list is
 * untouched).
 *
 * An admin records or picks a video, titles it (EN/AR), picks the exact users
 * who may see it (reusing the create-assignment multi-select UX: search,
 * select-all, clear, checkbox list), and uploads. The binary goes to a PRIVATE
 * bucket; only the chosen users (and the uploading admin) can ever play it.
 *
 * Below the form is a live list of the admin's targeted uploads with viewer +
 * viewed counts. Mobile-first, RTL-safe, with loading/empty/error states.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Upload, Search, Users, Film, Eye, Video as VideoIcon,
} from "lucide-react";
import { VoiceRecorder } from "@/components/shared/voice-recorder";

export interface TargetUser {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface TargetedRow {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSec: number | null;
  createdAt: string;
  viewerCount: number;
  viewedCount: number;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TargetedRecordingsAdmin({ users }: { users: TargetUser[] }) {
  const t = useTranslations("TargetedRecordings");
  const locale = useLocale();
  const isAr = locale === "ar";

  // Form state.
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // A blob captured in-browser (alternative to picking a file).
  const [recorded, setRecorded] = useState<{ blob: Blob; durationSec: number } | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // List state.
  const [rows, setRows] = useState<TargetedRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(false);

  const filteredUsers = userQuery.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(userQuery.trim().toLowerCase()) ||
          u.email.toLowerCase().includes(userQuery.trim().toLowerCase())
      )
    : users;

  const loadList = useCallback(async () => {
    setListError(false);
    try {
      const res = await fetch("/api/admin/targeted-recordings");
      if (res.ok) {
        const data = await res.json();
        setRows(data.recordings ?? []);
      } else {
        setListError(true);
      }
    } catch {
      setListError(true);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const toggleUser = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const reset = () => {
    setTitle("");
    setTitleAr("");
    setDescription("");
    setFile(null);
    setRecorded(null);
    setShowRecorder(false);
    setSelectedIds([]);
    setUserQuery("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = () => {
    if (title.trim().length < 2) {
      toast.error(t("titleRequired"));
      return;
    }
    if (!file && !recorded) {
      toast.error(t("fileRequired"));
      return;
    }
    if (selectedIds.length === 0) {
      toast.error(t("selectViewersRequired"));
      return;
    }

    setUploading(true);
    setProgress(0);
    const fd = new FormData();
    if (recorded) {
      fd.append("file", recorded.blob, "recording.webm");
      fd.append("durationSec", String(recorded.durationSec));
    } else if (file) {
      fd.append("file", file);
    }
    fd.append("title", title.trim());
    if (titleAr.trim()) fd.append("titleAr", titleAr.trim());
    if (description.trim()) fd.append("description", description.trim());
    fd.append("userIds", JSON.stringify(selectedIds));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/targeted-recordings/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      setProgress(null);
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          toast.success(t("uploadedOk"));
          reset();
          loadList();
        } else {
          toast.error(data.error ?? t("uploadError"));
        }
      } catch {
        toast.error(t("uploadError"));
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setProgress(null);
      toast.error(t("uploadError"));
    };
    xhr.send(fd);
  };

  return (
    <div className="space-y-6">
      {/* ── Upload form ── */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand-rose" />
            <h2 className="text-base font-semibold">{t("uploadTitle")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{t("uploadHint")}</p>

          {/* Titles */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tr-title">
                {t("titleLabel")} <span className="text-brand-rose">*</span>
              </Label>
              <Input id="tr-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-title-ar">{t("titleArLabel")}</Label>
              <Input id="tr-title-ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} disabled={uploading} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tr-desc">{t("descriptionLabel")}</Label>
            <Textarea id="tr-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={uploading} />
          </div>

          {/* Video source: upload OR record in-browser */}
          <div className="space-y-2">
            <Label>
              {t("videoLabel")} <span className="text-brand-rose">*</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) {
                    setFile(f);
                    setRecorded(null);
                    setShowRecorder(false);
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Film className="me-2 h-4 w-4" />
                {t("chooseVideo")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRecorder((s) => !s);
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                disabled={uploading}
              >
                <VideoIcon className="me-2 h-4 w-4" />
                {t("recordVideo")}
              </Button>
              {file && !recorded && (
                <span className="text-xs text-muted-foreground">
                  {file.name} <span className="num">({humanSize(file.size)})</span>
                </span>
              )}
              {recorded && (
                <span className="text-xs text-muted-foreground">
                  {t("recordedReady")} <span className="num">({humanSize(recorded.blob.size)})</span>
                </span>
              )}
            </div>

            {showRecorder && !recorded && (
              <div className="rounded-md border bg-muted/20 p-3">
                <VoiceRecorder
                  mode="video"
                  maxSeconds={10 * 60}
                  disabled={uploading}
                  onCaptured={(blob, durationSec) => {
                    setRecorded({ blob, durationSec });
                    setShowRecorder(false);
                  }}
                  onCancel={() => setShowRecorder(false)}
                />
              </div>
            )}
          </div>

          {/* Viewer multi-select (mirrors create-assignment audience picker) */}
          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-rose" />
              <Label>
                {t("viewersLabel")} <span className="text-brand-rose">*</span>
              </Label>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                <span className="num">{selectedIds.length}</span> / <span className="num">{users.length}</span>{" "}
                {t("usersWord")}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedIds(filteredUsers.map((u) => u.id))}
                  disabled={uploading || filteredUsers.length === 0}
                >
                  {t("selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedIds([])}
                  disabled={uploading || selectedIds.length === 0}
                >
                  {t("clearSelection")}
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-2.5 rtl:right-2.5" />
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={t("searchUsers")}
                className="ltr:pl-8 rtl:pr-8"
                disabled={uploading}
              />
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border bg-background p-1">
              {filteredUsers.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">{t("noUsersMatch")}</p>
              ) : (
                filteredUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox checked={selectedIds.includes(u.id)} onCheckedChange={() => toggleUser(u.id)} disabled={uploading} />
                    <span className="truncate">{u.name}</span>
                    <Badge variant="navy" className="ms-auto shrink-0 px-1.5 py-0 text-[10px]">
                      {t(`role_${u.role}` as never)}
                    </Badge>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Progress */}
          {progress != null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-brand-rose transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onSubmit} disabled={uploading} className="bg-brand-navy text-white">
              {uploading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
              {t("uploadButton")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── My targeted uploads ── */}
      <div>
        <h2 className="mb-3 text-base font-semibold">{t("listTitle")}</h2>
        {loadingList ? (
          <Card>
            <CardContent className="flex justify-center p-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-navy" />
            </CardContent>
          </Card>
        ) : listError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
              <Button variant="outline" size="sm" onClick={loadList}>
                {t("retry")}
              </Button>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Film className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-muted-foreground">{t("emptyList")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => {
              const dateStr = new Date(r.createdAt).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB");
              const displayTitle = isAr && r.titleAr ? r.titleAr : r.title;
              return (
                <Card key={r.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Film className="h-4 w-4 shrink-0 text-brand-rose" />
                        <span className="truncate font-medium">{displayTitle}</span>
                      </span>
                      <span className="num shrink-0 text-xs text-muted-foreground">{dateStr}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span className="num">{r.viewerCount}</span> {t("viewersWord")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="num">{r.viewedCount}</span> {t("viewedWord")}
                      </span>
                      <span className="num">{humanSize(r.sizeBytes)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
