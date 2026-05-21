"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BlackboardSync, type Peer } from "@/lib/blackboard/sync";
import { HajrToolbar } from "./HajrToolbar";
import { PermissionModal } from "./PermissionModal";
import { MobileFallback } from "./MobileFallback";
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

interface BlackboardClientProps {
  roomId: string;
  roomName: string;
  className?: string | null;
  userId: string;
  userName: string;
  isHost: boolean;
  canEdit: boolean;
  isArchived: boolean;
  allowStudentEdit: boolean;
  grantedStudentIds: string[];
  enrolledStudents: { id: string; userId: string; name: string }[];
}

export function BlackboardClient({
  roomId,
  roomName,
  className,
  userId,
  userName,
  isHost,
  canEdit: initialCanEdit,
  isArchived,
  allowStudentEdit: initialAllowStudentEdit,
  grantedStudentIds: initialGrantedIds,
  enrolledStudents,
}: BlackboardClientProps) {
  const t = useTranslations("Blackboard");
  const syncRef = useRef<BlackboardSync | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [canEdit, setCanEdit] = useState(initialCanEdit);
  const [saving, setSaving] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#FFFFFF");
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [allowStudentEdit, setAllowStudentEdit] = useState(initialAllowStudentEdit);
  const [grantedIds, setGrantedIds] = useState<Set<string>>(new Set(initialGrantedIds));
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      if (isArchived || (!isHost && !canEdit)) {
        editor.updateInstanceState({ isReadonly: true });
      }

      const sync = new BlackboardSync({
        roomId,
        userId,
        userName,
        isHost,
        canEdit: isArchived ? false : canEdit,
        onPresenceUpdate: setPeers,
        onSnapshotLoad: (snapshot) => {
          if (snapshot && typeof snapshot === "object") {
            try {
              editor.store.loadStoreSnapshot(snapshot as any);
            } catch {
              // Ignore snapshot load errors on fresh boards
            }
          }
        },
        onPermissionChange: (granted) => {
          setCanEdit(granted);
          editor.updateInstanceState({ isReadonly: !granted });
          toast.info(granted ? t("canDrawNow") : t("viewOnlyMode"));
        },
      });

      syncRef.current = sync;
      sync.connect(editor);
    },
    [roomId, userId, userName, isHost, canEdit, isArchived, t]
  );

  useEffect(() => {
    return () => {
      syncRef.current?.disconnect();
    };
  }, []);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (editorRef.current) {
      editorRef.current.setStyleForNextShapes(
        editorRef.current.getStyleForNextShape("color" as any) ? ("color" as any) : ("color" as any),
        color === "#FFFFFF" ? "white" :
        color === "#C97B8A" ? "red" :
        color === "#B5E5D8" ? "green" :
        color === "#D4C5E2" ? "violet" :
        "yellow"
      );
    }
  };

  const handleUpload = () => uploadInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("fileTooLarge"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/blackboard/${roomId}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      toast.error(t("uploadFailed"));
      return;
    }

    const data = await res.json();
    if (editorRef.current && data.type === "image") {
      const { x, y } = editorRef.current.getViewportScreenCenter();
      editorRef.current.createShape({
        type: "image",
        x: x - 200,
        y: y - 150,
        props: { url: data.url, w: 400, h: 300 },
      } as any);
    }

    toast.success(t("uploadSuccess"));
    e.target.value = "";
  };

  const handleSnapshot = async () => {
    setSaving(true);
    const ok = await syncRef.current?.saveSnapshot();
    setSaving(false);
    toast[ok ? "success" : "error"](ok ? t("snapshotSaved") : t("snapshotFailed"));
  };

  const handleEndSession = async () => {
    const res = await fetch(`/api/blackboard/${roomId}/end-session`, { method: "POST" });
    if (res.ok) {
      toast.success(t("sessionEnded"));
      window.location.reload();
    } else {
      toast.error(t("endSessionFailed"));
    }
    setEndDialogOpen(false);
  };

  const handleGlobalToggle = async (enabled: boolean) => {
    setAllowStudentEdit(enabled);
    await fetch(`/api/blackboard/${roomId}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snapshot: editorRef.current?.store.getStoreSnapshot(),
      }),
    });
  };

  const handleBroadcastPermission = (studentUserId: string, granted: boolean) => {
    syncRef.current?.broadcastPermissionChange(studentUserId, granted);
  };

  return (
    <>
      <MobileFallback />

      <div className="hidden lg:flex flex-col h-screen w-screen">
        {isArchived && (
          <div className="bg-amber-600 text-white text-center text-sm py-1.5 font-medium">
            {t("archivedBanner")}
          </div>
        )}

        {!isHost && (
          <div className={`text-center text-sm py-1 font-medium ${canEdit ? "bg-brand-mint text-brand-navy" : "bg-brand-navy text-white/70"}`}>
            {canEdit ? t("canDrawNow") : t("viewOnlyMode")}
          </div>
        )}

        <HajrToolbar
          roomName={roomName}
          className={className}
          isHost={isHost}
          peers={peers}
          saving={saving}
          selectedColor={selectedColor}
          onColorSelect={handleColorSelect}
          onUpload={handleUpload}
          onPermissions={() => setPermModalOpen(true)}
          onSnapshot={handleSnapshot}
          onEndSession={() => setEndDialogOpen(true)}
        />

        <div className="flex-1 relative">
          <Tldraw
            onMount={handleEditorMount}
            inferDarkMode={false}
            components={{
              SharePanel: null,
              HelpMenu: null,
              NavigationPanel: null,
              PageMenu: null,
            }}
          />
        </div>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {isHost && (
        <>
          <PermissionModal
            open={permModalOpen}
            onOpenChange={setPermModalOpen}
            roomId={roomId}
            students={enrolledStudents}
            allowStudentEdit={allowStudentEdit}
            grantedStudentIds={grantedIds}
            onGlobalToggle={handleGlobalToggle}
            onBroadcastPermission={handleBroadcastPermission}
          />

          <AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("endSessionConfirm")}</AlertDialogTitle>
                <AlertDialogDescription>{t("endSessionDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleEndSession}>{t("endSession")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
