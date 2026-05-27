/**
 * i18n parity audit — compare AR vs EN messages, detect untranslated
 * keys (value === key), and any markup leaks.
 */
import { readFileSync } from "fs";
import { join } from "path";

export interface I18nReport {
  arKeyCount: number;
  enKeyCount: number;
  parityOk: boolean;
  missingInAr: string[];
  missingInEn: string[];
  untranslatedAr: string[];
  markupLeaks: string[];
}

function flatten(obj: any, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flatten(v, next));
    else out[next] = String(v ?? "");
  }
  return out;
}

export function getI18nReport(srcRoot: string): I18nReport {
  let ar: Record<string, string> = {};
  let en: Record<string, string> = {};
  try {
    ar = flatten(JSON.parse(readFileSync(join(srcRoot, "messages", "ar.json"), "utf8")));
    en = flatten(JSON.parse(readFileSync(join(srcRoot, "messages", "en.json"), "utf8")));
  } catch (e) {
    console.error("[qa/i18n] failed to read messages:", e);
  }
  const arKeys = new Set(Object.keys(ar));
  const enKeys = new Set(Object.keys(en));
  const missingInAr: string[] = [];
  const missingInEn: string[] = [];
  for (const k of enKeys) if (!arKeys.has(k)) missingInAr.push(k);
  for (const k of arKeys) if (!enKeys.has(k)) missingInEn.push(k);
  const untranslatedAr: string[] = [];
  for (const k of arKeys) {
    const v = ar[k];
    if (v === k) untranslatedAr.push(k);
  }
  const markupLeaks: string[] = [];
  const leakRe = /<\/?[a-z][\s\S]*?>/i;
  for (const [k, v] of [...Object.entries(ar), ...Object.entries(en)]) {
    if (leakRe.test(v)) markupLeaks.push(k);
  }
  return {
    arKeyCount: arKeys.size,
    enKeyCount: enKeys.size,
    parityOk: missingInAr.length === 0 && missingInEn.length === 0,
    missingInAr: missingInAr.slice(0, 200),
    missingInEn: missingInEn.slice(0, 200),
    untranslatedAr: untranslatedAr.slice(0, 200),
    markupLeaks: [...new Set(markupLeaks)].slice(0, 200),
  };
}
