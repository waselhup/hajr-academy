// Provider selector. Phase 3 will plug in concrete ZoomProvider / DailyProvider.
// For Phase 1 this returns a stub so server code can import the interface safely.

import type { VideoProvider } from "./types";

const stubProvider: VideoProvider = {
  async createMeeting() {
    throw new Error("VideoProvider not configured (Phase 3)");
  },
  async generateJoinSignature() {
    throw new Error("VideoProvider not configured (Phase 3)");
  },
  async endMeeting() {
    throw new Error("VideoProvider not configured (Phase 3)");
  },
  async getRecordingUrl() {
    return null;
  },
};

export function getVideoProvider(): VideoProvider {
  // wired in Phase 3
  return stubProvider;
}
