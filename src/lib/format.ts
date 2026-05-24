import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";

export function fmtSAR(n: number | string, locale: "ar" | "en" = "ar"): string {
  const num = Number(n);
  const formatted = num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return locale === "ar" ? `${formatted} ر.س` : `SAR ${formatted}`;
}

export function fmtRiyadh(d: Date | string, pattern = "yyyy-MM-dd HH:mm"): string {
  return formatInTimeZone(new Date(d), "Asia/Riyadh", pattern);
}

export function fmtRelative(d: Date | string): string {
  return formatDistanceToNowStrict(new Date(d), { addSuffix: true });
}

export function fmtHijri(d: Date | string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const momentHijri = require("moment-hijri");
    return momentHijri(new Date(d)).format("iYYYY/iM/iD");
  } catch {
    return "";
  }
}

const TEACHER_PALETTE = ["#2C3E50", "#B86E7B", "#5B8C7E", "#9B7BB8", "#D4A574", "#7BA7D9", "#B85C5C", "#8B6BAD"];
export function teacherColor(teacherId: string): string {
  let hash = 0;
  for (let i = 0; i < teacherId.length; i++) hash = (hash * 31 + teacherId.charCodeAt(i)) | 0;
  return TEACHER_PALETTE[Math.abs(hash) % TEACHER_PALETTE.length];
}
