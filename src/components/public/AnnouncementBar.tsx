"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const LS_KEY = "hajr.announce.v2.dismissed";

export function AnnouncementBar({ message, dismissLabel }: { message: string; dismissLabel: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(LS_KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="bg-hajr-deep-navy text-white">
      <div className="container flex items-center justify-between gap-2 py-2 text-sm">
        <span className="flex-1 text-center">{message}</span>
        <button
          onClick={() => {
            try { localStorage.setItem(LS_KEY, "1"); } catch {}
            setShow(false);
          }}
          aria-label={dismissLabel}
          className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
