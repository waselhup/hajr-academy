/**
 * Seed the General English placement test.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: the Arabic column may translate the
 * TASK, never the LANGUAGE BEING TESTED.
 *
 * The take page renders `isAr ? q.textAr : q.textEn` and `isAr ? opt.ar :
 * opt.en` — an Arabic student sees the Arabic side and nothing else. The first
 * version of this file translated the items themselves, which produced a test
 * that measured Arabic:
 *
 *   - The whole reading section was an Arabic passage with Arabic options. An
 *     Arabic monolingual with no English at all scored 10/10 on it.
 *   - Grammar options were glossed into Arabic, where "go" and "goes" are one
 *     word — the student chose between two identical strings.
 *
 * So every stem and every option here is English in BOTH fields. The Arabic
 * support lives in the section titles, which is where instructions belong.
 *
 * TWO OTHER THINGS THE FIRST VERSION GOT WRONG, fixed here:
 *
 *   1. The answer key was index 1 in 17 of 25 items and index 3 in none.
 *      Picking the second option every time scored 68%, and percentToCefr maps
 *      65%+ to B2 — so a student who read nothing was certified B2 and sold
 *      the advanced programme. The key below is balanced across all four
 *      positions and asserted at seed time; the script refuses to run if it
 *      drifts again.
 *   2. Nothing was harder than B2, yet the scorer can return C1 and C2. The
 *      set now runs A1 → C1 so the top bands are earned rather than
 *      unreachable, and points are weighted by difficulty so the total
 *      separates levels instead of counting items.
 *
 * Sections are GRAMMAR, VOCAB and READING only. The earlier build had a
 * SPEAKING section containing written multiple-choice items, which made the
 * admin results page report a speaking score for a student who never spoke.
 * Language-in-use items now sit inside grammar, as they do in every serious
 * exam.
 *
 *   npx tsx scripts/seed-placement-tests.ts
 */

import { PrismaClient, type PlacementVariant, type PlacementSectionType } from "@prisma/client";

const prisma = new PrismaClient();

type Q = {
  id: string;
  textEn: string;
  textAr: string;
  options: Array<{ en: string; ar: string }>;
  correct: number;
  points: number;
};

type SectionSeed = {
  type: PlacementSectionType;
  titleEn: string;
  titleAr: string;
  timeLimitMin: number;
  questions: Q[];
};

/**
 * One item. `c` is the index of the correct option; `points` carries the
 * difficulty — a C1 discriminator should not be worth the same as "she goes".
 *
 * Stem and options are English in both language fields, deliberately. See the
 * rule at the top of this file.
 */
function q(id: string, text: string, options: string[], c: number, points = 2): Q {
  if (c < 0 || c >= options.length) throw new Error(`${id}: correct index out of range`);
  if (new Set(options).size !== options.length) throw new Error(`${id}: duplicate options`);
  return {
    id,
    textEn: text,
    textAr: text,
    options: options.map((o) => ({ en: o, ar: o })),
    correct: c,
    points,
  };
}

// ── Grammar and language in use: A1 → C1 ───────────────────────────────
const GRAMMAR: Q[] = [
  q("g1", "My father ___ in a hospital.", ["work", "working", "works", "worked"], 2, 1),
  q("g2", "They ___ playing football now.", ["is", "are", "am", "be"], 1, 1),
  q("g3", "She ___ to school every day.", ["go", "goes", "going", "gone"], 1, 1),
  q("g4", "There ___ four students in the class.", ["is", "was", "are", "be"], 2, 1),
  q("g5", "Yesterday I ___ my grandmother.", ["visit", "visited", "visiting", "will visit"], 1, 2),
  q("g6", "We ___ to Riyadh last summer.", ["goed", "gone", "going", "went"], 3, 2),
  q("g7", "I have lived here ___ 2019.", ["since", "for", "from", "during"], 0, 2),
  q("g8", "If it rains tomorrow, we ___ at home.", ["stayed", "will stay", "would stay", "are staying"], 1, 2),
  q("g9", "This is the book ___ I told you about.", ["who", "whose", "which", "where"], 2, 3),
  q("g10", "He asked me where I ___ from.", ["come", "am coming", "came", "will come"], 2, 3),
  q("g11", "By the time we arrived, the match ___.", ["has finished", "finished", "finishes", "had finished"], 3, 3),
  q("g12", "The report ___ before the meeting started.", ["had been completed", "was completing", "has completed", "is completed"], 0, 4),
  q("g13", "I'd rather you ___ anyone about this.", ["don't tell", "didn't tell", "won't tell", "not tell"], 1, 4),
  q("g14", "Not until the results were published ___ the scale of the problem.", ["did we understand", "we understood", "we did understand", "understood we"], 0, 5),
];

// ── Vocabulary: meaning in context, not memorised lists ────────────────
const VOCAB: Q[] = [
  q("v1", "The opposite of 'expensive' is ___.", ["cheap", "large", "heavy", "quick"], 0, 1),
  q("v2", "A person who teaches at a school is a ___.", ["driver", "farmer", "teacher", "doctor"], 2, 1),
  q("v3", "Choose the word closest in meaning to 'difficult'.", ["simple", "clean", "early", "hard"], 3, 2),
  q("v4", "We need to ___ a decision before Friday.", ["do", "make", "take", "put"], 1, 2),
  q("v5", "The project was a huge ___ and everyone was proud.", ["failure", "delay", "success", "problem"], 2, 2),
  q("v6", "Her explanation was so ___ that nobody understood it.", ["clear", "loud", "brief", "vague"], 3, 3),
  q("v7", "The company decided to ___ the new policy next month.", ["implement", "imagine", "inherit", "invite"], 0, 4),
  q("v8", "His argument was ___ — it contradicted itself twice.", ["persuasive", "incoherent", "detailed", "lengthy"], 1, 5),
];

// ── Reading: two short texts, questions referring back to them ─────────
// All questions in a section render on one page (verified in the take page),
// so a passage stated once can be referred to by the items that follow it.
const READING: Q[] = [
  q(
    "r1",
    "Read the notice:\n\nSCHOOL LIBRARY — NEW HOURS\nFrom Sunday the library opens at 7:30 a.m. and closes at 2:00 p.m.\nOn Thursday it closes at 12:00 noon.\nStudents may borrow up to three books for two weeks.\n\nWhat time does the library close on Thursday?",
    ["7:30 a.m.", "2:00 p.m.", "It does not open", "12:00 noon"],
    3,
    2
  ),
  q("r2", "According to the notice above, how many books may a student borrow?", ["Three", "Two", "Four", "As many as they like"], 0, 2),
  q("r3", "According to the notice above, how long may a book be kept?", ["One week", "Two weeks", "One month", "Until the end of term"], 1, 2),
  q(
    "r4",
    "Read the passage:\n\nMany students believe that studying for long hours is the key to good marks. Research suggests otherwise. Learners who study in short, focused sessions and test themselves regularly remember far more than those who read the same page for hours. The brain needs recall, not repetition. A student who closes the book and tries to write down what they remember is doing harder — and better — work than one who simply reads again.\n\nWhat is the main idea of the passage?",
    [
      "Long study hours guarantee good marks",
      "Research on studying is unreliable",
      "Testing yourself works better than re-reading",
      "Students should read more pages each day",
    ],
    2,
    3
  ),
  q("r5", "In the passage above, the writer says the brain needs ___.", ["repetition", "rest", "reading", "recall"], 3, 3),
  q(
    "r6",
    "Which of these would the writer of the passage above most likely recommend?",
    [
      "Reading a chapter five times",
      "Studying for six hours without a break",
      "Highlighting every important line",
      "Closing the book and writing what you remember",
    ],
    3,
    3
  ),
  q(
    "r7",
    "In the passage above, 'doing harder — and better — work' implies that ___.",
    [
      "difficulty and learning are unrelated",
      "the easier method is the more effective one",
      "effort during recall is what produces the learning",
      "students should avoid difficult subjects",
    ],
    2,
    4
  ),
];

const GENERAL_SECTIONS: SectionSeed[] = [
  { type: "GRAMMAR", titleEn: "Grammar and language in use", titleAr: "القواعد واستخدام اللغة", timeLimitMin: 12, questions: GRAMMAR },
  { type: "VOCAB", titleEn: "Vocabulary in context", titleAr: "المفردات في سياقها", timeLimitMin: 8, questions: VOCAB },
  { type: "READING", titleEn: "Reading comprehension", titleAr: "القراءة والاستيعاب", timeLimitMin: 12, questions: READING },
];

/**
 * Refuse to seed a test that can be passed without reading it.
 *
 * The previous set had 68% of its answers in one position, which meant a
 * student tapping the same option every time was graded B2. This runs on every
 * seed so the failure cannot come back quietly.
 */
function assertKeyIsSound(sections: SectionSeed[]) {
  const all = sections.flatMap((s) => s.questions);
  const total = all.reduce((n, x) => n + x.points, 0);

  const byPosition = new Map<number, number>();
  for (const x of all) byPosition.set(x.correct, (byPosition.get(x.correct) ?? 0) + x.points);

  const positions = Math.max(...all.map((x) => x.options.length));
  for (let i = 0; i < positions; i++) {
    const pts = byPosition.get(i) ?? 0;
    const share = (pts / total) * 100;
    // 65% is the B2 threshold in percentToCefr. Any single position worth even
    // half of that makes blind tapping a viable strategy.
    if (share >= 32) {
      throw new Error(
        `Answer key is skewed: option ${i} is worth ${pts}/${total} points (${share.toFixed(1)}%). ` +
          `Always choosing it would score ${share.toFixed(0)}%. Rebalance before seeding.`
      );
    }
    if (pts === 0) {
      throw new Error(`Answer key never uses option ${i}. Rebalance before seeding.`);
    }
  }

  const best = Math.max(...Array.from(byPosition.values()));
  console.log(
    `  key check: ${all.length} items, ${total} points, best single-option strategy = ${((best / total) * 100).toFixed(0)}%`
  );
}

async function seedTest(
  variant: PlacementVariant,
  titleEn: string,
  titleAr: string,
  descriptionEn: string,
  descriptionAr: string,
  sections: SectionSeed[]
) {
  assertKeyIsSound(sections);

  const durationMin = sections.reduce((s, x) => s + x.timeLimitMin, 0);
  const existing = await prisma.placementTest.findFirst({ where: { variant } });

  const test = existing
    ? await prisma.placementTest.update({
        where: { id: existing.id },
        data: { titleEn, titleAr, descriptionEn, descriptionAr, durationMin, isActive: true },
      })
    : await prisma.placementTest.create({
        data: { variant, titleEn, titleAr, descriptionEn, descriptionAr, durationMin, isActive: true, passingScore: 60 },
      });

  // Sections are replaced wholesale: `order` is uniquely constrained per test,
  // so editing in place would fight the constraint on every re-run.
  await prisma.placementSection.deleteMany({ where: { testId: test.id } });

  let order = 0;
  for (const s of sections) {
    const maxScore = s.questions.reduce((sum, x) => sum + x.points, 0);
    await prisma.placementSection.create({
      data: {
        testId: test.id,
        type: s.type,
        titleEn: s.titleEn,
        titleAr: s.titleAr,
        questions: s.questions as unknown as object,
        timeLimitMin: s.timeLimitMin,
        order: order++,
        maxScore,
      },
    });
    console.log(`   + ${s.type.padEnd(8)} ${String(s.questions.length).padStart(2)} items, max ${maxScore}`);
  }

  const total = sections.reduce((sum, s) => sum + s.questions.reduce((a, x) => a + x.points, 0), 0);
  console.log(`  ${existing ? "updated" : "created"} ${variant}: ${sections.length} sections, ${durationMin} min, ${total} points\n`);
}

async function main() {
  console.log("Seeding placement tests…\n");

  await seedTest(
    "GENERAL_ENGLISH",
    "English Placement Test",
    "اختبار تحديد المستوى",
    "A short test that places you at your true CEFR level and recommends the right programme. The test is in English throughout — that is what it measures. No preparation needed.",
    "اختبار قصير يحدّد مستواك الحقيقي وفق الإطار الأوروبي المرجعي ويقترح البرنامج المناسب لك. الاختبار بالإنجليزية بالكامل لأنها المهارة المقيسة. لا يحتاج تحضيراً.",
    GENERAL_SECTIONS
  );

  const counts = await prisma.placementTest.findMany({
    select: { variant: true, isActive: true, durationMin: true, _count: { select: { sections: true } } },
  });
  console.log("Placement tests now available:");
  for (const c of counts) {
    console.log(`  ${c.isActive ? "ON " : "off"} ${c.variant} — ${c._count.sections} sections, ${c.durationMin} min`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
