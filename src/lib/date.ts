import { formatInTimeZone } from "date-fns-tz";

export const RIYADH_TZ = "Asia/Riyadh";

export function fmtRiyadh(date: Date, pattern = "yyyy-MM-dd HH:mm"): string {
  return formatInTimeZone(date, RIYADH_TZ, pattern);
}

export function fmtHijri(date: Date): string {
  // moment-hijri lazy-imported to keep server bundle small. Phase 7 polishes formatting.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const momentHijri = require("moment-hijri");
    return momentHijri(date).format("iYYYY/iM/iD");
  } catch {
    return "";
  }
}
