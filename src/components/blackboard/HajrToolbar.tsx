"use client";

import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Peer } from "@/lib/blackboard/sync";

const BRAND_PEN_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Rose", value: "#C97B8A" },
  { label: "Mint", value: "#B5E5D8" },
  { label: "Lavender", value: "#D4C5E2" },
  { label: "Yellow", value: "#F59E0B" },
];

interface HajrToolbarProps {
  roomName: string;
  className?: string | null;
  isHost: boolean;
  peers: Peer[];
  onUpload?: () => void;
  onPermissions?: () => void;
  onSnapshot?: () => void;
  onEndSession?: () => void;
  onColorSelect?: (color: string) => void;
  selectedColor?: string;
  saving?: boolean;
}

export function HajrToolbar({
  roomName,
  className,
  isHost,
  peers,
  onUpload,
  onPermissions,
  onSnapshot,
  onEndSession,
  onColorSelect,
  selectedColor,
  saving,
}: HajrToolbarProps) {
  const t = useTranslations("Blackboard");

  return (
    <div className="flex items-center justify-between gap-2 bg-[#0F1419] px-3 py-2 text-white text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <LogoMark />
        <span className="font-semibold truncate">{roomName}</span>
        {className && (
          <Badge variant="outline" className="bg-white/10 text-white/80 text-xs shrink-0 border-white/20">
            {className}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {BRAND_PEN_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => onColorSelect?.(c.value)}
            className={`h-6 w-6 rounded-full border-2 transition-all ${
              selectedColor === c.value ? "border-brand-rose scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {saving && (
          <span className="text-xs text-white/50 animate-pulse">{t("saving")}</span>
        )}

        {/* Presence indicators */}
        <div className="flex -space-x-1.5 rtl:space-x-reverse mx-1">
          {peers.slice(0, 5).map((p) => (
            <div
              key={p.userId}
              className="h-6 w-6 rounded-full border border-[#0F1419] flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: p.color }}
              title={p.userName}
            >
              {p.userName.charAt(0).toUpperCase()}
            </div>
          ))}
          {peers.length > 5 && (
            <div className="h-6 w-6 rounded-full bg-white/20 border border-[#0F1419] flex items-center justify-center text-[10px]">
              +{peers.length - 5}
            </div>
          )}
        </div>

        {isHost && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 text-xs h-7 px-2"
              onClick={onUpload}
            >
              {t("uploadAsset")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 text-xs h-7 px-2"
              onClick={onPermissions}
            >
              {t("permissions")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 text-xs h-7 px-2"
              onClick={onSnapshot}
            >
              {t("snapshot")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-7 px-2"
              onClick={onEndSession}
            >
              {t("endSession")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
