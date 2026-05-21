import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import Papa from "papaparse";

export const dynamic = "force-dynamic";

const SECTIONS = ["READING", "LISTENING", "GRAMMAR", "VOCABULARY", "WRITING", "SPEAKING"];
const MAX_ROWS = 1000;

/**
 * Expected CSV columns (header row required):
 *   section, difficulty, questionText, topic,
 *   optionA, optionB, optionC, optionD, correct, explanation, explanationAr
 *
 * `correct` is the letter (A-D) of the correct option. `passage` is an
 * optional extra column for reading questions.
 */
interface CsvRow {
  section?: string;
  difficulty?: string;
  questionText?: string;
  passage?: string;
  topic?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correct?: string;
  explanation?: string;
  explanationAr?: string;
}

/**
 * POST /api/admin/test-bank/import — bulk-import test-bank questions
 * from a CSV file (multipart form field `file`).
 *
 * Returns a per-row summary: how many imported, how many skipped, and
 * the reasons for skipped rows.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "CSV too large (max 2MB)" }, { status: 413 });
    }

    const text = await file.text();
    const parsed = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data.slice(0, MAX_ROWS);
    const errors: { row: number; reason: string }[] = [];
    const toCreate: object[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 for header, +1 for 1-based
      const section = (row.section ?? "").trim().toUpperCase();
      if (!SECTIONS.includes(section)) {
        errors.push({ row: rowNum, reason: `Invalid section "${row.section}"` });
        return;
      }
      const questionText = (row.questionText ?? "").trim();
      if (!questionText) {
        errors.push({ row: rowNum, reason: "Missing questionText" });
        return;
      }
      const difficulty = Math.min(
        5,
        Math.max(1, parseInt(row.difficulty ?? "3", 10) || 3)
      );

      const optionLetters = ["A", "B", "C", "D"] as const;
      const optionTexts = {
        A: (row.optionA ?? "").trim(),
        B: (row.optionB ?? "").trim(),
        C: (row.optionC ?? "").trim(),
        D: (row.optionD ?? "").trim(),
      };
      const correctLetter = (row.correct ?? "").trim().toUpperCase();

      const presentOptions = optionLetters.filter((l) => optionTexts[l]);
      let options: { id: string; text: string; isCorrect: boolean }[] | null = null;
      let correctAnswer: string | null = null;
      let type: "MULTIPLE_CHOICE" | "ESSAY" = "MULTIPLE_CHOICE";

      if (presentOptions.length >= 2) {
        if (!optionLetters.includes(correctLetter as "A")) {
          errors.push({ row: rowNum, reason: "correct must be A-D" });
          return;
        }
        options = presentOptions.map((l) => ({
          id: l.toLowerCase(),
          text: optionTexts[l],
          isCorrect: l === correctLetter,
        }));
        correctAnswer = correctLetter.toLowerCase();
      } else if (section === "WRITING") {
        // Writing questions can be essay prompts with no options.
        type = "ESSAY";
      } else {
        errors.push({ row: rowNum, reason: "At least 2 options required" });
        return;
      }

      toCreate.push({
        testType: "STEP" as const,
        section,
        difficulty,
        questionText,
        passage: row.passage?.trim() || null,
        type,
        options: options ?? undefined,
        correctAnswer: correctAnswer ?? undefined,
        explanation: row.explanation?.trim() || null,
        explanationAr: row.explanationAr?.trim() || null,
        topic: row.topic?.trim() || null,
        tags: ["imported"],
        isActive: true,
        createdBy: session.user.id,
      });
    });

    let imported = 0;
    if (toCreate.length > 0) {
      const result = await prisma.testQuestion.createMany({
        data: toCreate as never,
      });
      imported = result.count;
    }

    await logAudit({
      userId: session.user.id,
      action: "TEST_BANK_BULK_IMPORT",
      entity: "TestQuestion",
      metadata: { imported, skipped: errors.length, totalRows: rows.length },
    });

    return NextResponse.json({
      imported,
      skipped: errors.length,
      totalRows: rows.length,
      errors: errors.slice(0, 50),
    });
  } catch (e) {
    console.error("[api/admin/test-bank/import] failed:", e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
