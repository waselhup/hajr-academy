"use client";

/**
 * RecordingPlayer — plays a class recording inside the Hajr platform.
 *
 * Class recordings are stored in Zoom Cloud (auto-recording is enabled
 * when a class starts). Rather than navigating the user away to Zoom,
 * this opens an in-app dialog that embeds the recording's player, so
 * playback happens on the Hajr platform. A "open in Zoom" fallback link
 * is provided in case the embed is blocked.
 */

import { useState } from "react";
import { useLocale } from "next-intl";
import { Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function RecordingPlayer({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Video className="me-1.5 h-3.5 w-3.5" />
        {isAr ? "مشاهدة" : "Watch"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            {open && (
              <iframe
                src={url}
                title={title}
                className="h-full w-full"
                allow="fullscreen; autoplay"
                allowFullScreen
              />
            )}
          </div>
          <div className="flex justify-end">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-rose"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isAr ? "فتح في نافذة جديدة" : "Open in a new tab"}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
