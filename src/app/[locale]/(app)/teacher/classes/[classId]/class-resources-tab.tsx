"use client";

/**
 * Teacher's private "Resources" area for a single class — a calm personal
 * locker that persists WITH the class across terms. Upload (drag-drop or
 * button) with a title + category, browse a scannable grid of resource cards,
 * filter by category, preview images / play video & audio / view PDFs / download
 * everything else, and rename or delete your own files.
 *
 * Signed URLs are fetched on demand from the access-controlled endpoint
 * (/api/class-resources/file) — the server re-checks access every time, so a
 * leaked link can't be replayed. Uploads POST to /api/class-resources/upload.
 */
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Film,
  Music,
  ImageIcon,
  FileType2,
  Presentation,
  Download,
  Loader2,
  Play,
  Upload,
  Pencil,
  Trash2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────── Types ───────────────────────────

type Kind = "VIDEO" | "AUDIO" | "FILE";
type Category = "LESSON_PLAN" | "EXERCISE" | "SLIDES" | "OTHER";

export interface ResourceVM {
  id: string;
  kind: Kind;
  category: Category;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string; // ISO
  /** True when the current viewer uploaded it → may rename / delete. */
  mine: boolean;
}

const CATEGORIES: Category[] = ["LESSON_PLAN", "EXERCISE", "SLIDES", "OTHER"];

// ─────────────────────────── Helpers ───────────────────────────

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Finer display type from the stored kind + mime (for the icon + type chip). */
type DisplayType = "VIDEO" | "AUDIO" | "IMAGE" | "PDF" | "SLIDES" | "DOCUMENT";
function displayTypeOf(r: ResourceVM): DisplayType {
  if (r.kind === "VIDEO") return "VIDEO";
  if (r.kind === "AUDIO") return "AUDIO";
  if (r.mimeType.startsWith("image/")) return "IMAGE";
  if (r.mimeType === "application/pdf") return "PDF";
  if (
    r.mimeType.includes("presentation") ||
    r.mimeType.includes("powerpoint") ||
    /\.pptx?$/i.test(r.fileName)
  )
    return "SLIDES";
  return "DOCUMENT";
}

function TypeIcon({ type }: { type: DisplayType }) {
  const cls = "h-5 w-5 shrink-0";
  switch (type) {
    case "VIDEO":
      return <Film className={cls} />;
    case "AUDIO":
      return <Music className={cls} />;
    case "IMAGE":
      return <ImageIcon className={cls} />;
    case "PDF":
      return <FileType2 className={cls} />;
    case "SLIDES":
      return <Presentation className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

// ─────────────────────────── Card ───────────────────────────

function ResourceCard({
  resource,
  locale,
  typeLabel,
  categoryLabel,
  onRename,
  onDelete,
  busy,
}: {
  resource: ResourceVM;
  locale: string;
  typeLabel: (t: DisplayType) => string;
  categoryLabel: (c: Category) => string;
  onRename: (r: ResourceVM) => void;
  onDelete: (r: ResourceVM) => void;
  busy: boolean;
}) {
  const t = useTranslations("ClassResources");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dtype = displayTypeOf(resource);
  const isImage = dtype === "IMAGE";
  const isVideo = dtype === "VIDEO";
  const isAudio = dtype === "AUDIO";
  const isPdf = dtype === "PDF";

  const fetchUrl = useCallback(async (): Promise<string | null> => {
    if (url) return url;
    setLoading(true);
    try {
      const res = await fetch(`/api/class-resources/file?id=${resource.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(t("loadError"));
        return null;
      }
      setUrl(data.url as string);
      return data.url as string;
    } catch {
      toast.error(t("loadError"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, resource.id, t]);

  const onOpen = useCallback(async () => {
    const u = await fetchUrl();
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  }, [fetchUrl]);

  const date = new Date(resource.createdAt).toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
      {/* Header: icon + title + (manage menu) */}
      <div className="flex items-start gap-3">
        <span className="text-hajr-rose">
          <TypeIcon type={dtype} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-navy" title={resource.title}>
            {resource.title}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={resource.fileName}>
            {resource.fileName}
          </p>
        </div>
        {resource.mine && (
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={busy}
              onClick={() => onRename(resource)}
              aria-label={t("rename")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => onDelete(resource)}
              aria-label={t("delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Chips: category + type + size + date */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="default" className="text-[10px]">
          {categoryLabel(resource.category)}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {typeLabel(dtype)}
        </Badge>
        <span className="num text-[11px] text-muted-foreground">{humanSize(resource.sizeBytes)}</span>
        <span className="text-[11px] text-muted-foreground">·</span>
        <span className="num text-[11px] text-muted-foreground">{date}</span>
      </div>

      {/* Inline preview / player / open */}
      {isImage ? (
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={resource.title} className="max-h-56 w-auto rounded-md" />
        ) : (
          <Button variant="outline" size="sm" onClick={fetchUrl} disabled={loading} className="w-fit">
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ImageIcon className="me-2 h-4 w-4" />}
            {t("preview")}
          </Button>
        )
      ) : isVideo ? (
        url ? (
          <video controls className="w-full rounded-md" src={url} preload="metadata" />
        ) : (
          <Button variant="outline" size="sm" onClick={fetchUrl} disabled={loading} className="w-fit">
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Play className="me-2 h-4 w-4" />}
            {t("play")}
          </Button>
        )
      ) : isAudio ? (
        url ? (
          <audio controls className="w-full" src={url} preload="metadata" />
        ) : (
          <Button variant="outline" size="sm" onClick={fetchUrl} disabled={loading} className="w-fit">
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Play className="me-2 h-4 w-4" />}
            {t("play")}
          </Button>
        )
      ) : (
        <Button variant="outline" size="sm" onClick={onOpen} disabled={loading} className="w-fit">
          {loading ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : isPdf ? (
            <FileType2 className="me-2 h-4 w-4" />
          ) : (
            <Download className="me-2 h-4 w-4" />
          )}
          {isPdf ? t("view") : t("download")}
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────── Main tab ───────────────────────────

export function ClassResourcesTab({
  classId,
  locale,
  initialResources,
}: {
  classId: string;
  locale: string;
  initialResources: ResourceVM[];
}) {
  const t = useTranslations("ClassResources");
  const router = useRouter();
  const ar = locale === "ar";

  const [resources, setResources] = useState<ResourceVM[]>(initialResources);
  const [filter, setFilter] = useState<Category | "ALL">("ALL");
  const [pending, startTransition] = useTransition();

  // Upload form state
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("OTHER");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Rename dialog state
  const [renaming, setRenaming] = useState<ResourceVM | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameCategory, setRenameCategory] = useState<Category>("OTHER");

  // Delete confirm state
  const [deleting, setDeleting] = useState<ResourceVM | null>(null);

  const categoryLabel = useCallback(
    (c: Category) =>
      c === "LESSON_PLAN"
        ? t("catLessonPlan")
        : c === "EXERCISE"
        ? t("catExercise")
        : c === "SLIDES"
        ? t("catSlides")
        : t("catOther"),
    [t]
  );

  const typeLabel = useCallback(
    (dt: DisplayType) =>
      dt === "VIDEO"
        ? t("typeVideo")
        : dt === "AUDIO"
        ? t("typeAudio")
        : dt === "IMAGE"
        ? t("typeImage")
        : dt === "PDF"
        ? t("typePdf")
        : dt === "SLIDES"
        ? t("typeSlides")
        : t("typeDocument"),
    [t]
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { ALL: resources.length };
    for (const c of CATEGORIES) m[c] = 0;
    for (const r of resources) m[r.category] = (m[r.category] ?? 0) + 1;
    return m;
  }, [resources]);

  const visible = useMemo(
    () => (filter === "ALL" ? resources : resources.filter((r) => r.category === filter)),
    [resources, filter]
  );

  // ── Upload ──────────────────────────────────────────────────────
  const pickFile = useCallback((f: File | null) => {
    if (!f) return;
    setPendingFile(f);
    setTitle((prev) => prev || f.name.replace(/\.[^.]+$/, "").slice(0, 160));
    setUploadOpen(true);
  }, []);

  const resetUpload = useCallback(() => {
    setPendingFile(null);
    setTitle("");
    setCategory("OTHER");
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const doUpload = useCallback(() => {
    if (!pendingFile) return;
    const f = pendingFile;
    const kind: Kind = f.type.startsWith("video/")
      ? "VIDEO"
      : f.type.startsWith("audio/")
      ? "AUDIO"
      : "FILE";

    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    fd.append("file", f, f.name);
    fd.append("classId", classId);
    fd.append("title", title.trim() || f.name);
    fd.append("category", category);
    fd.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/class-resources/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      setProgress(null);
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.resource) {
          const r = data.resource;
          setResources((prev) => [
            { ...r, createdAt: r.createdAt ?? new Date().toISOString(), mine: true },
            ...prev,
          ]);
          toast.success(t("uploadedOk"));
          setUploadOpen(false);
          resetUpload();
          router.refresh();
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
  }, [pendingFile, classId, title, category, t, resetUpload, router]);

  // ── Rename ──────────────────────────────────────────────────────
  const openRename = useCallback((r: ResourceVM) => {
    setRenaming(r);
    setRenameTitle(r.title);
    setRenameCategory(r.category);
  }, []);

  const doRename = useCallback(() => {
    if (!renaming) return;
    const id = renaming.id;
    const newTitle = renameTitle.trim();
    const newCat = renameCategory;
    if (newTitle.length < 1) {
      toast.error(t("titleRequired"));
      return;
    }
    startTransition(async () => {
      const { renameClassResourceAction } = await import("@/lib/class-resources/actions");
      const res = await renameClassResourceAction({ resourceId: id, title: newTitle, category: newCat });
      if (res.ok) {
        setResources((prev) =>
          prev.map((r) => (r.id === id ? { ...r, title: newTitle, category: newCat } : r))
        );
        toast.success(t("renamedOk"));
        setRenaming(null);
        router.refresh();
      } else {
        toast.error(t("actionError"));
      }
    });
  }, [renaming, renameTitle, renameCategory, t, router]);

  // ── Delete ──────────────────────────────────────────────────────
  const doDelete = useCallback(() => {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      const { deleteClassResourceAction } = await import("@/lib/class-resources/actions");
      const res = await deleteClassResourceAction({ resourceId: id });
      if (res.ok) {
        setResources((prev) => prev.filter((r) => r.id !== id));
        toast.success(t("deletedOk"));
        setDeleting(null);
        router.refresh();
      } else {
        toast.error(t("actionError"));
      }
    });
  }, [deleting, t, router]);

  return (
    <div className="space-y-4">
      {/* Persistence reassurance */}
      <div className="flex items-start gap-2 rounded-md border border-hajr-border bg-hajr-rose/5 p-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-hajr-rose" />
        <span>{t("persistenceNote")}</span>
      </div>

      {/* Upload drop zone + button */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (uploading) return;
          const f = e.dataTransfer.files?.[0];
          if (f) pickFile(f);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-5 text-center transition-colors",
          dragOver ? "border-hajr-rose bg-hajr-rose/5" : "border-hajr-border bg-muted/20"
        )}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <Upload className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("dropHint")}</p>
        <Button
          type="button"
          variant="cta"
          size="sm"
          className="mt-3"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
          {t("uploadButton")}
        </Button>
      </div>

      {/* Filter chips */}
      {resources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            {t("filterAll")} <span className="num">({counts.ALL})</span>
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {categoryLabel(c)} <span className="num">({counts[c] ?? 0})</span>
            </FilterChip>
          ))}
        </div>
      )}

      {/* Grid / empty state */}
      {resources.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-brand-navy">{t("emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("emptyBody")}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("emptyFilter")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              locale={locale}
              typeLabel={typeLabel}
              categoryLabel={categoryLabel}
              onRename={openRename}
              onDelete={setDeleting}
              busy={pending}
            />
          ))}
        </div>
      )}

      {/* Upload metadata dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          if (uploading) return;
          setUploadOpen(o);
          if (!o) resetUpload();
        }}
      >
        <DialogContent dir={ar ? "rtl" : "ltr"} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("uploadDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pendingFile && (
              <p className="truncate rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground" title={pendingFile.name}>
                {pendingFile.name} <span className="num">· {humanSize(pendingFile.size)}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cr-title">
                {t("titleLabel")} <span className="text-hajr-rose">*</span>
              </Label>
              <Input
                id="cr-title"
                value={title}
                disabled={uploading}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("categoryLabel")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {progress != null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-hajr-rose transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => {
                setUploadOpen(false);
                resetUpload();
              }}
            >
              {t("cancel")}
            </Button>
            <Button variant="cta" size="sm" disabled={uploading || !title.trim()} onClick={doUpload}>
              {uploading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("uploadConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent dir={ar ? "rtl" : "ltr"} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("renameDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cr-rename">
                {t("titleLabel")} <span className="text-hajr-rose">*</span>
              </Label>
              <Input
                id="cr-rename"
                value={renameTitle}
                disabled={pending}
                onChange={(e) => setRenameTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("categoryLabel")}</Label>
              <Select
                value={renameCategory}
                onValueChange={(v) => setRenameCategory(v as Category)}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setRenaming(null)}>
              {t("cancel")}
            </Button>
            <Button variant="cta" size="sm" disabled={pending || !renameTitle.trim()} onClick={doRename}>
              {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent dir={ar ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmBody", { title: deleting?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-hajr-rose bg-hajr-rose text-white"
          : "border-hajr-border bg-white text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
