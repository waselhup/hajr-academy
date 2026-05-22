// Video provider abstraction. Implemented in Phase 3 by ZoomProvider.
// Swap providers later by setting VIDEO_PROVIDER env (zoom | daily).

export type VideoRole = "host" | "attendee";

export interface CreateMeetingOpts {
  topic: string;
  scheduledFor: Date;
  durationMinutes: number;
  hostEmail: string;
  password?: string;
  /** Auto-start cloud recording when the host joins. */
  autoRecording?: boolean;
}

export interface MeetingResult {
  meetingId: string;
  joinUrl: string;
  password: string;
  /** Host start URL — server-side only, never sent to students. */
  startUrlForHost?: string;
}

export interface SignatureOpts {
  meetingNumber: string;
  role: VideoRole;
  userName: string;
  /** Validity window in seconds for the signature (default 2h). */
  expirationSeconds?: number;
}

export interface SignatureResult {
  signature: string;
  sdkKey: string;
}

export interface RecordingResult {
  url: string;
  passcode?: string;
}

export interface VideoProvider {
  createMeeting(opts: CreateMeetingOpts): Promise<MeetingResult>;
  updateMeeting(meetingId: string, opts: Partial<CreateMeetingOpts>): Promise<void>;
  deleteMeeting(meetingId: string): Promise<void>;
  endMeeting(meetingId: string): Promise<void>;
  generateJoinSignature(opts: SignatureOpts): Promise<SignatureResult>;
  getMeetingRecording(meetingId: string): Promise<RecordingResult | null>;
  /** Live participant count for a meeting, or null if not live / not found. */
  getLiveParticipantCount(meetingId: string): Promise<number | null>;
  /**
   * Re-apply the "students can always join" settings to an existing
   * meeting (join_before_host on, waiting room off). Used to repair
   * meetings created before this policy. Best-effort.
   */
  ensureJoinableSettings(meetingId: string): Promise<void>;
}
