/**
 * Pure helpers for Western-digit masked date/time fields. No React — unit
 * testable in the node test env. Owner rule: digits are ALWAYS Western (0-9)
 * and dates render dd/mm/yyyy regardless of UI/OS language.
 *
 * Canonical values match what the native inputs they replace produced:
 *   date     → "yyyy-mm-dd"
 *   time     → "HH:mm"
 *   datetime → "yyyy-mm-ddTHH:mm"
 * Incomplete/invalid input → "".
 */

// Map Arabic-Indic (٠-٩) and Eastern-Arabic (۰-۹) digits → ASCII; strip the rest.
const AR_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EA_INDIC = "۰۱۲۳۴۵۶۷۸۹";
export function toAsciiDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const ai = AR_INDIC.indexOf(ch);
    if (ai >= 0) { out += String(ai); continue; }
    const ei = EA_INDIC.indexOf(ch);
    if (ei >= 0) { out += String(ei); continue; }
    if (ch >= "0" && ch <= "9") out += ch;
  }
  return out;
}

/* ── DATE: canonical "yyyy-mm-dd" <-> display "dd/mm/yyyy" ── */
export function dateValueToDisplay(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
export function dateDisplayToValue(display: string): string {
  const d = toAsciiDigits(display);
  if (d.length < 8) return "";
  const dd = d.slice(0, 2), mm = d.slice(2, 4), yyyy = d.slice(4, 8);
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return "";
  return `${yyyy}-${mm}-${dd}`;
}
export function maskDate(display: string): string {
  const d = toAsciiDigits(display).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/* ── TIME: canonical "HH:mm" <-> display "HH:mm" ── */
export function timeValueToDisplay(v: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(v || "");
  return m ? `${m[1]}:${m[2]}` : "";
}
export function timeDisplayToValue(display: string): string {
  const d = toAsciiDigits(display);
  if (d.length < 4) return "";
  const HH = d.slice(0, 2), mm = d.slice(2, 4);
  if (+HH > 23 || +mm > 59) return "";
  return `${HH}:${mm}`;
}
export function maskTime(display: string): string {
  const d = toAsciiDigits(display).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

/* ── DATETIME: canonical "yyyy-mm-ddTHH:mm" <-> display "dd/mm/yyyy HH:mm" ── */
export function dateTimeValueToDisplay(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || "");
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : "";
}
export function dateTimeDisplayToValue(display: string): string {
  const d = toAsciiDigits(display);
  if (d.length < 12) return "";
  const dd = d.slice(0, 2), mm = d.slice(2, 4), yyyy = d.slice(4, 8), HH = d.slice(8, 10), mi = d.slice(10, 12);
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12 || +HH > 23 || +mi > 59) return "";
  return `${yyyy}-${mm}-${dd}T${HH}:${mi}`;
}
export function maskDateTime(display: string): string {
  const d = toAsciiDigits(display).slice(0, 12);
  let out = d.slice(0, 2);
  if (d.length > 2) out += "/" + d.slice(2, 4);
  if (d.length > 4) out += "/" + d.slice(4, 8);
  if (d.length > 8) out += " " + d.slice(8, 10);
  if (d.length > 10) out += ":" + d.slice(10, 12);
  return out;
}

/** Sanitize any free text to ASCII digits only — for number inputs. Keeps an
 *  optional leading "-" and a single "." so decimals/negatives still work. */
export function sanitizeNumeric(s: string): string {
  if (s == null) return "";
  let str = String(s);
  // normalize Arabic decimal separator (٫) and thousands (٬) first
  str = str.replace(/٫/g, ".").replace(/٬/g, "");
  const neg = str.trim().startsWith("-");
  // convert digits, keep . and digits
  let body = "";
  let seenDot = false;
  for (const ch of str) {
    const ascii = toAsciiDigits(ch);
    if (ascii) { body += ascii; continue; }
    if (ch === "." && !seenDot) { body += "."; seenDot = true; }
  }
  return (neg ? "-" : "") + body;
}
