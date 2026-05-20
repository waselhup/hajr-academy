// Provider factory. Reads VIDEO_PROVIDER env (zoom | daily). Default: zoom.
// A Daily.co implementation can be slotted in later behind the same interface.

import type { VideoProvider } from "./types";
import { ZoomProvider } from "./ZoomProvider";

let cached: VideoProvider | null = null;

export function getVideoProvider(): VideoProvider {
  if (cached) return cached;
  const choice = (process.env.VIDEO_PROVIDER ?? "zoom").toLowerCase();
  switch (choice) {
    case "zoom":
    default:
      cached = new ZoomProvider();
      return cached;
  }
}

export type { VideoProvider, CreateMeetingOpts, MeetingResult, SignatureOpts } from "./types";
