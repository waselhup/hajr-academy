// Known program codes get a curated cohort prefix; any new/custom code falls
// back to a prefix derived from the code itself (Program.code is now free text).
const PROG_PREFIX: Record<string, string> = {
  STEP_PREP: "STEP",
  PRIVATE: "PRIV",
  UNI_PREP: "UNI",
  SCHOOL: "SCH",
  ENGLISH_LAB: "LAB",
};

/** Derive a short, safe cohort prefix for any program code. */
function prefixFor(code: string): string {
  if (PROG_PREFIX[code]) return PROG_PREFIX[code];
  const cleaned = (code || "PROG").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, 4) || "PROG";
}

export function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

export function generateCohortCode(opts: {
  programCode: string;
  year: number;
  quarter?: number;
  letter?: string;
}): string {
  const q = opts.quarter ?? quarterOf(new Date().getMonth() + 1);
  const letter = opts.letter ?? "A";
  return `${prefixFor(opts.programCode)}-${opts.year}-Q${q}-${letter.toUpperCase()}`;
}

export function nextCohortLetter(existing: string[]): string {
  const used = new Set(existing.filter(Boolean).map((s) => s.toUpperCase()));
  for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(c)) return c;
  }
  return "A";
}
