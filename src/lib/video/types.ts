// Video provider abstraction. Implemented in Phase 3 by ZoomProvider + DailyProvider.

export type VideoRole = "host" | "attendee";

export interface CreateMeetingOpts {
  topic: string;
  scheduledFor: Date;
  durationMinutes: number;
  hostEmail: string;
  password?: string;
}

export interface MeetingResult {
  meetingId: string;
  joinUrl: string;
  password: string;
  startUrlForHost?: string; // never expose to students
}

export interface VideoProvider {
  createMeeting(opts: CreateMeetingOpts): Promise<MeetingResult>;
  generateJoinSignature(meetingId: string, role: VideoRole, userName: string): Promise<string>;
  endMeeting(meetingId: string): Promise<void>;
  getRecordingUrl(meetingId: string): Promise<string | null>;
}
