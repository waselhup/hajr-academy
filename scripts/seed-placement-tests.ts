/**
 * Seed the placement tests the engine has always been able to run.
 *
 * Every screen for placement already existed — public start page, timed
 * take page, scored results, admin review, CEFR mapping, programme
 * recommendations — but `PlacementTest` held zero rows, so the whole feature
 * was a dead end: a student clicking "take the test" met nothing.
 *
 * This creates the General English test (the one the site links to) with
 * four scored sections. Questions follow the shape the scorer expects:
 *   { id, textEn, textAr, options: [{en, ar}], correct, points }
 * `correct` is the INDEX into options, and maxScore is the sum of points —
 * both are what scoreAttempt() reads, so they must not drift.
 *
 * Idempotent: re-running updates the existing test for a variant rather than
 * creating a second one, so it is safe to run after edits.
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

/** Four options, one right. `c` is the index of the correct one. */
function q(
  id: string,
  textEn: string,
  textAr: string,
  options: Array<[string, string]>,
  c: number,
  points = 2
): Q {
  return {
    id,
    textEn,
    textAr,
    options: options.map(([en, ar]) => ({ en, ar })),
    correct: c,
    points,
  };
}

// ── Grammar: ordered easy → hard so the score separates levels ──────────
const GRAMMAR: Q[] = [
  q("g1", "She ___ to school every day.", "هي ___ إلى المدرسة كل يوم.",
    [["go", "تذهب (go)"], ["goes", "تذهب (goes)"], ["going", "going"], ["gone", "gone"]], 1),
  q("g2", "They ___ playing football now.", "هم ___ يلعبون كرة القدم الآن.",
    [["is", "is"], ["am", "am"], ["are", "are"], ["be", "be"]], 2),
  q("g3", "I have lived here ___ 2019.", "أعيش هنا ___ 2019.",
    [["since", "منذ (since)"], ["for", "لمدة (for)"], ["from", "من (from)"], ["at", "عند (at)"]], 0),
  q("g4", "If it ___ tomorrow, we will stay home.", "إذا ___ غداً، سنبقى في المنزل.",
    [["will rain", "will rain"], ["rains", "rains"], ["rained", "rained"], ["raining", "raining"]], 1),
  q("g5", "This is the book ___ I told you about.", "هذا هو الكتاب ___ أخبرتك عنه.",
    [["who", "who"], ["which", "which"], ["whose", "whose"], ["where", "where"]], 1),
  q("g6", "He asked me where I ___ from.", "سألني من أين ___.",
    [["come", "come"], ["came", "came"], ["coming", "coming"], ["comes", "comes"]], 1),
  q("g7", "By the time we arrived, the match ___.", "بحلول وصولنا، كانت المباراة ___.",
    [["has finished", "has finished"], ["finished", "finished"], ["had finished", "had finished"], ["finishes", "finishes"]], 2),
  q("g8", "I'd rather you ___ tell anyone.", "أفضّل أن ___ تخبر أحداً.",
    [["don't", "don't"], ["didn't", "didn't"], ["won't", "won't"], ["not", "not"]], 1),
];

// ── Vocabulary ─────────────────────────────────────────────────────────
const VOCAB: Q[] = [
  q("v1", "The opposite of 'expensive' is ___.", "عكس كلمة 'expensive' هو ___.",
    [["cheap", "رخيص"], ["large", "كبير"], ["heavy", "ثقيل"], ["quick", "سريع"]], 0),
  q("v2", "A person who teaches at a school is a ___.", "الشخص الذي يُدرّس في المدرسة هو ___.",
    [["doctor", "طبيب"], ["teacher", "معلّم"], ["driver", "سائق"], ["farmer", "مزارع"]], 1),
  q("v3", "Choose the word closest in meaning to 'difficult'.", "اختر الأقرب في المعنى لكلمة 'difficult'.",
    [["simple", "بسيط"], ["hard", "صعب"], ["clean", "نظيف"], ["early", "مبكر"]], 1),
  q("v4", "We need to ___ a decision before Friday.", "نحتاج أن ___ قراراً قبل الجمعة.",
    [["do", "do"], ["make", "make"], ["take", "take"], ["put", "put"]], 1),
  q("v5", "The project was a huge ___ and everyone was proud.", "كان المشروع ___ كبيراً وافتخر به الجميع.",
    [["failure", "فشل"], ["success", "نجاح"], ["problem", "مشكلة"], ["delay", "تأخير"]], 1),
  q("v6", "Her explanation was very ___ — nobody understood it.", "كان شرحها ___ جداً — لم يفهمه أحد.",
    [["clear", "واضح"], ["vague", "غامض"], ["loud", "عالٍ"], ["short", "قصير"]], 1),
  q("v7", "The company decided to ___ the new policy next month.", "قررت الشركة ___ السياسة الجديدة الشهر القادم.",
    [["implement", "تطبيق"], ["imagine", "تخيّل"], ["invite", "دعوة"], ["inherit", "وراثة"]], 0),
];

// ── Reading: one short passage, questions about it ──────────────────────
const READING: Q[] = [
  q("r1",
    "Read: \"Sara wakes up at six every morning. She studies for an hour before breakfast, then walks to school with her brother.\" — What does Sara do first?",
    "اقرأ: \"تستيقظ سارة في السادسة كل صباح. تدرس ساعة قبل الفطور، ثم تمشي إلى المدرسة مع أخيها.\" — ماذا تفعل سارة أولاً؟",
    [["She eats breakfast", "تتناول الفطور"], ["She studies", "تدرس"], ["She walks to school", "تمشي إلى المدرسة"], ["She meets her brother", "تقابل أخاها"]], 1),
  q("r2", "In the same text, who goes to school with Sara?", "في النص نفسه، من يذهب إلى المدرسة مع سارة؟",
    [["Her friend", "صديقتها"], ["Her mother", "والدتها"], ["Her brother", "أخوها"], ["Nobody", "لا أحد"]], 2),
  q("r3",
    "Read: \"The library will close early on Thursday for maintenance. Books borrowed this week may be returned next Sunday without a fine.\" — When can books be returned without a fine?",
    "اقرأ: \"ستغلق المكتبة مبكراً يوم الخميس للصيانة. يمكن إعادة الكتب المستعارة هذا الأسبوع يوم الأحد القادم دون غرامة.\" — متى يمكن إعادة الكتب دون غرامة؟",
    [["Thursday", "الخميس"], ["Next Sunday", "الأحد القادم"], ["Any day", "أي يوم"], ["Never", "أبداً"]], 1),
  q("r4", "Why will the library close early?", "لماذا ستغلق المكتبة مبكراً؟",
    [["For a holiday", "بسبب عطلة"], ["For maintenance", "للصيانة"], ["For an exam", "بسبب اختبار"], ["The text does not say", "النص لا يذكر"]], 1),
  q("r5",
    "Read: \"Although the team trained hard all season, they narrowly missed qualifying.\" — What happened to the team?",
    "اقرأ: \"رغم أن الفريق تدرّب بجد طوال الموسم، إلا أنه أخفق بفارق ضئيل في التأهل.\" — ماذا حدث للفريق؟",
    [["They qualified easily", "تأهلوا بسهولة"], ["They did not qualify", "لم يتأهلوا"], ["They stopped training", "توقفوا عن التدريب"], ["They won the season", "فازوا بالموسم"]], 1),
];

// ── Everyday usage: how English is actually used in context ─────────────
const USAGE: Q[] = [
  q("u1", "Someone says \"Thank you very much.\" A natural reply is ___.", "قال أحدهم \"Thank you very much\". الرد الطبيعي هو ___.",
    [["You're welcome", "You're welcome"], ["Yes please", "Yes please"], ["I am fine", "I am fine"], ["Good night", "Good night"]], 0),
  q("u2", "You want to ask politely for help. You say ___.", "تريد طلب المساعدة بأدب. تقول ___.",
    [["Give me help", "Give me help"], ["Could you help me, please?", "Could you help me, please?"], ["Help now", "Help now"], ["You help me", "You help me"]], 1),
  q("u3", "Your teacher asks a question you did not hear. You say ___.", "سألك المعلّم سؤالاً لم تسمعه. تقول ___.",
    [["Repeat!", "Repeat!"], ["What?", "What?"], ["Sorry, could you say that again?", "Sorry, could you say that again?"], ["I don't know", "I don't know"]], 2),
  q("u4", "You disagree politely in a discussion. You say ___.", "تعترض بأدب في نقاش. تقول ___.",
    [["That's wrong.", "That's wrong."], ["I see your point, but ___", "I see your point, but ___"], ["No.", "No."], ["You don't understand.", "You don't understand."]], 1),
  q("u5", "You are ending a formal email. You write ___.", "تنهي بريداً رسمياً. تكتب ___.",
    [["Bye bye", "Bye bye"], ["Kind regards", "Kind regards"], ["See ya", "See ya"], ["Ok", "Ok"]], 1),
];

const GENERAL_SECTIONS: SectionSeed[] = [
  { type: "GRAMMAR", titleEn: "Grammar", titleAr: "القواعد", timeLimitMin: 8, questions: GRAMMAR },
  { type: "VOCAB", titleEn: "Vocabulary", titleAr: "المفردات", timeLimitMin: 6, questions: VOCAB },
  { type: "READING", titleEn: "Reading", titleAr: "القراءة والاستيعاب", timeLimitMin: 10, questions: READING },
  { type: "SPEAKING", titleEn: "Everyday Usage", titleAr: "الاستخدام اليومي", timeLimitMin: 6, questions: USAGE },
];

async function seedTest(
  variant: PlacementVariant,
  titleEn: string,
  titleAr: string,
  descriptionEn: string,
  descriptionAr: string,
  sections: SectionSeed[]
) {
  const durationMin = sections.reduce((s, x) => s + x.timeLimitMin, 0);

  // One test per variant: find the existing one rather than minting a second.
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
    console.log(`   + ${s.type.padEnd(10)} ${s.questions.length} questions, max ${maxScore}`);
  }

  const total = sections.reduce((sum, s) => sum + s.questions.reduce((a, x) => a + x.points, 0), 0);
  console.log(`  ${existing ? "updated" : "created"} ${variant}: ${sections.length} sections, ${durationMin} min, total ${total} points\n`);
}

async function main() {
  console.log("Seeding placement tests…\n");

  await seedTest(
    "GENERAL_ENGLISH",
    "English Placement Test",
    "اختبار تحديد المستوى",
    "A short test that places you at your true CEFR level and recommends the right programme. No preparation needed.",
    "اختبار قصير يحدّد مستواك الحقيقي وفق الإطار الأوروبي ويقترح البرنامج المناسب لك. لا يحتاج تحضيراً.",
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
