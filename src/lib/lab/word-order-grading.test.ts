/**
 * WORD_ORDER blocks scored zero for every student, always.
 *
 * The solver stores each chosen chip as `"<index>:<token>"` so a sentence
 * containing the same word twice still has distinct chips. Grading compared
 * those raw strings against the plain tokens, and `normalizeAnswer` strips the
 * colon rather than the prefix — so `"0:My"` normalised to `"0my"` and never
 * matched `"my"`. A perfect answer scored 0%.
 *
 * These tests pin the fix, including the case that made a naive fix unsafe.
 */
import { describe, it, expect } from "vitest";
import { gradeBlocks } from "./grade-blocks";
import type { Block } from "./blocks";

const wordOrder = (tokens: string[], points = 2): Block =>
  ({ id: "b1", kind: "WORD_ORDER", points, prompt: "Order the words.", tokens }) as unknown as Block;

describe("WORD_ORDER grading", () => {
  const tokens = ["My", "brother", "plays", "football", "on", "Fridays"];

  it("scores a perfect answer 100% in the format the solver actually submits", () => {
    const submitted = tokens.map((t, i) => `${i}:${t}`);
    const r = gradeBlocks([wordOrder(tokens)], { b1: submitted });
    expect(r.autoScore).toBe(100);
    expect(r.perBlock[0].correct).toBe(true);
  });

  it("still accepts a plain answer with no index prefix", () => {
    const r = gradeBlocks([wordOrder(tokens)], { b1: [...tokens] });
    expect(r.autoScore).toBe(100);
  });

  it("marks a wrong order wrong, and awards partial credit for the words in place", () => {
    // First two swapped: 4 of 6 positions still correct.
    const submitted = ["1:brother", "0:My", "2:plays", "3:football", "4:on", "5:Fridays"];
    const r = gradeBlocks([wordOrder(tokens)], { b1: submitted });
    expect(r.perBlock[0].correct).toBe(false);
    expect(r.perBlock[0].detail).toEqual({ matches: 4, total: 6 });
  });

  it("does not eat a colon that belongs to the token itself", () => {
    // "12:30" is a real token, not an index prefix — 12 is not a valid index
    // into a 3-token sentence, so the colon must survive.
    const t = ["The", "match", "12:30"];
    const r = gradeBlocks([wordOrder(t)], { b1: ["0:The", "1:match", "2:12:30"] });
    expect(r.autoScore).toBe(100);
  });

  it("an empty answer scores zero rather than throwing", () => {
    const r = gradeBlocks([wordOrder(tokens)], {});
    expect(r.autoScore).toBe(0);
    expect(r.perBlock[0].correct).toBe(false);
  });
});
