/**
 * Scan the codebase for `type: "XXX"` notification call sites and
 * compare against the NotificationType enum to find gaps.
 *
 * Runs at request-time, file system access required (server-only).
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ENUM_VALUES = [
  "CLASS_STARTING",
  "CLASS_CANCELLED",
  "PAYMENT_DUE",
  "PAYMENT_RECEIVED",
  "NEW_MESSAGE",
  "ATTENDANCE_UPDATE",
  "LAB_FEEDBACK",
  "EXAM_RESULT",
  "TRIAL_REQUEST",
  "ENROLLMENT_UPDATE",
  "SYSTEM_ANNOUNCEMENT",
  "MARKETER_UPDATE",
  "COMMISSION_UPDATE",
  "PLACEMENT_RESULT",
  "PARENT_REPORT_READY",
  "SPEAKING_CLUB_CREATED",
  "SPEAKING_CLUB_REMINDER_24H",
  "SPEAKING_CLUB_REMINDER_1H",
  "SPEAKING_CLUB_LIVE_NOW",
  "CERTIFICATE_ISSUED",
  "CERTIFICATE_REVOKED",
  "PAYMENT_REQUEST_SUBMITTED",
  "PAYMENT_REQUEST_APPROVED",
  "PAYMENT_REQUEST_PAID",
  "PAYMENT_REQUEST_REJECTED",
] as const;

export interface NotificationCoverageRow {
  type: string;
  used: number;
}

function* walk(dir: string): Generator<string> {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) yield* walk(p);
    else if ([".ts", ".tsx"].includes(extname(p))) yield p;
  }
}

export function getNotificationCoverage(rootDir: string): NotificationCoverageRow[] {
  const counts: Record<string, number> = {};
  for (const v of ENUM_VALUES) counts[v] = 0;
  const re = /type:\s*["'`]([A-Z_]+)["'`]/g;
  for (const file of walk(rootDir)) {
    let content = "";
    try { content = readFileSync(file, "utf8"); } catch { continue; }
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[1] in counts) counts[m[1]]++;
    }
  }
  return ENUM_VALUES.map((t) => ({ type: t, used: counts[t] }));
}
