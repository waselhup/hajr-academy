// Lab Studio v2 — instant auto-grading for objective blocks.
// Subjective blocks (SHORT_TEXT writing, RECORD speaking) are not auto-scored
// here; the submit route routes them to AI evaluation / teacher review.
import { type Block, isObjective, isSubjective, normalizeAnswer } from "./blocks";

export type BlockResult = {
  blockId: string;
  kind: string;
  correct: boolean | null; // null = not auto-graded (subjective / display)
  points: number; // max for this block (objective only)
  earned: number; // earned for this block
  detail?: any; // per-blank / per-pair breakdown for review UI
};

export type GradeResult = {
  perBlock: BlockResult[];
  maxPoints: number; // objective only
  earnedPoints: number; // objective only
  autoScore: number; // 0..100 over objective blocks
  hasSubjective: boolean;
  needsReview: boolean;
};

const eq = (a: string, b: string) => normalizeAnswer(a) === normalizeAnswer(b);
const arrEq = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => eq(x, b[i]));

/**
 * WORD_ORDER answers arrive as `"<originalIndex>:<token>"`.
 *
 * The solver prefixes each token so that a sentence containing the same word
 * twice still has distinct, selectable chips. That prefix is a UI transport
 * detail and was never stripped before grading — and `normalizeAnswer` removes
 * the colon rather than the prefix, so `"0:My"` became `"0my"` and could never
 * equal `"my"`. Every WORD_ORDER block scored zero for every student, no
 * matter how correct the answer was.
 *
 * Only a prefix whose number is a real index into this block's tokens is
 * removed. That protects a legitimate token like a clock time: in a five-token
 * sentence "12:30" keeps its colon, because 12 is not an index.
 */
function stripTokenIndex(token: unknown, tokenCount: number): string {
  const s = String(token ?? "");
  const m = /^(\d+):(.*)$/s.exec(s);
  if (!m) return s;
  const idx = Number(m[1]);
  return Number.isInteger(idx) && idx >= 0 && idx < tokenCount ? m[2] : s;
}

export function gradeBlocks(blocks: Block[], submission: Record<string, any>): GradeResult {
  const perBlock: BlockResult[] = [];
  let maxPoints = 0;
  let earnedPoints = 0;
  let hasSubjective = false;

  for (const b of blocks) {
    const pts = b.points ?? 1;
    const ans = submission?.[b.id];

    if (isSubjective(b.kind)) {
      hasSubjective = true;
      perBlock.push({ blockId: b.id, kind: b.kind, correct: null, points: 0, earned: 0 });
      continue;
    }
    if (!isObjective(b.kind)) {
      // PASSAGE / MEDIA — display only
      perBlock.push({ blockId: b.id, kind: b.kind, correct: null, points: 0, earned: 0 });
      continue;
    }

    maxPoints += pts;
    let correct = false;
    let earned = 0;
    let detail: any;

    switch (b.kind) {
      case "MCQ": {
        correct = typeof ans === "string" && ans === b.correctOptionId;
        earned = correct ? pts : 0;
        break;
      }
      case "TRUE_FALSE": {
        correct = typeof ans === "boolean" && ans === b.answer;
        earned = correct ? pts : 0;
        break;
      }
      case "FILL_BLANK": {
        const given: string[] = Array.isArray(ans) ? ans : [];
        const flags = b.blanks.map((bl, i) => bl.accept.some((a) => eq(a, given[i] ?? "")));
        const right = flags.filter(Boolean).length;
        correct = right === b.blanks.length;
        earned = b.blanks.length ? Math.round((right / b.blanks.length) * pts) : 0;
        detail = { flags, total: b.blanks.length, right };
        break;
      }
      case "WORD_ORDER": {
        const given: string[] = (Array.isArray(ans) ? ans : []).map((tok) =>
          stripTokenIndex(tok, b.tokens.length)
        );
        correct = arrEq(given, b.tokens);
        const matches = b.tokens.filter((t, i) => eq(t, given[i] ?? "")).length;
        earned = b.tokens.length ? Math.round((matches / b.tokens.length) * pts) : 0;
        detail = { matches, total: b.tokens.length };
        break;
      }
      case "MATCHING": {
        // answer: { [leftPairId]: rightPairId } — correct when each left is
        // matched to the right that belongs to the SAME pair id.
        const map: Record<string, string> = ans && typeof ans === "object" ? ans : {};
        const right = b.pairs.filter((p) => map[p.id] === p.id).length;
        correct = right === b.pairs.length;
        earned = b.pairs.length ? Math.round((right / b.pairs.length) * pts) : 0;
        detail = { right, total: b.pairs.length };
        break;
      }
    }

    earnedPoints += earned;
    perBlock.push({ blockId: b.id, kind: b.kind, correct, points: pts, earned, detail });
  }

  const autoScore = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : hasSubjective ? 0 : 100;
  return { perBlock, maxPoints, earnedPoints, autoScore, hasSubjective, needsReview: hasSubjective };
}
