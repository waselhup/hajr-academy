import type { ProgramCode } from "@prisma/client";

const PROG_PREFIX: Record<ProgramCode, string> = {
  STEP_PREP: "STEP",
  PRIVATE: "PRIV",
  UNI_PREP: "UNI",
  SCHOOL: "SCH",
  ENGLISH_LAB: "LAB",
};

export function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

export function generateCohortCode(opts: {
  programCode: ProgramCode;
  year: number;
  quarter?: number;
  letter?: string;
}): string {
  const q = opts.quarter ?? quarterOf(new Date().getMonth() + 1);
  const letter = opts.letter ?? "A";
  return `${PROG_PREFIX[opts.programCode]}-${opts.year}-Q${q}-${letter.toUpperCase()}`;
}

export function nextCohortLetter(existing: string[]): string {
  const used = new Set(existing.filter(Boolean).map((s) => s.toUpperCase()));
  for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(c)) return c;
  }
  return "A";
}
