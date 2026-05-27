/**
 * Seeds 3 PlacementTest variants (GENERAL_ENGLISH / STEP_PREP / IELTS_PREP)
 * with bilingual sample sections + questions. Idempotent.
 *
 * Owner can refine questions later via the admin UI (read-only in Sprint 2).
 *
 * Run: npx tsx prisma/seed-placement-tests.ts
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
  audioUrl?: string | null;
};

type SectionSeed = {
  type: PlacementSectionType;
  titleEn: string;
  titleAr: string;
  timeLimitMin: number;
  questions: Q[];
};

type TestSeed = {
  variant: PlacementVariant;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  passingScore: number;
  durationMin: number;
  sections: SectionSeed[];
};

const GENERAL: TestSeed = {
  variant: "GENERAL_ENGLISH",
  titleEn: "General English Placement",
  titleAr: "اختبار تحديد المستوى العام للإنجليزية",
  descriptionEn: "A 30-minute test to discover your current English level (CEFR A1–C2).",
  descriptionAr: "اختبار مدته ٣٠ دقيقة لتحديد مستواك الحالي في الإنجليزية (CEFR).",
  passingScore: 60,
  durationMin: 30,
  sections: [
    {
      type: "READING",
      titleEn: "Reading",
      titleAr: "القراءة",
      timeLimitMin: 8,
      questions: [
        {
          id: "r1",
          textEn: "Read: 'The library opens at 9 AM and closes at 8 PM.' What time does it open?",
          textAr: "اقرأ: 'تفتح المكتبة الساعة ٩ صباحاً وتغلق الساعة ٨ مساءً'. متى تفتح؟",
          options: [
            { en: "8 AM", ar: "٨ صباحاً" },
            { en: "9 AM", ar: "٩ صباحاً" },
            { en: "10 AM", ar: "١٠ صباحاً" },
            { en: "8 PM", ar: "٨ مساءً" },
          ],
          correct: 1,
          points: 1,
        },
        {
          id: "r2",
          textEn: "Read: 'Sara enjoys cooking traditional dishes.' What is Sara's hobby?",
          textAr: "سارة تستمتع بطبخ الأكلات التقليدية. ما هي هوايتها؟",
          options: [
            { en: "Reading", ar: "القراءة" },
            { en: "Cooking", ar: "الطبخ" },
            { en: "Painting", ar: "الرسم" },
            { en: "Running", ar: "الجري" },
          ],
          correct: 1,
          points: 1,
        },
        {
          id: "r3",
          textEn: "'The meeting was postponed due to bad weather.' What does 'postponed' mean?",
          textAr: "'تم تأجيل الاجتماع بسبب سوء الطقس'. ماذا تعني 'postponed'؟",
          options: [
            { en: "cancelled", ar: "ألغي" },
            { en: "delayed", ar: "أُجِّل" },
            { en: "started", ar: "بدأ" },
            { en: "shortened", ar: "اختُصِر" },
          ],
          correct: 1,
          points: 1,
        },
        {
          id: "r4",
          textEn: "Choose the best title: 'Coffee was discovered in Yemen. Today it is the world's second most-traded commodity.'",
          textAr: "اختر أفضل عنوان: 'اكتُشِفت القهوة في اليمن. اليوم هي ثاني أكبر سلعة في التجارة العالمية.'",
          options: [
            { en: "Yemen Today", ar: "اليمن اليوم" },
            { en: "Coffee: From Yemen to the World", ar: "القهوة: من اليمن إلى العالم" },
            { en: "World Trade", ar: "التجارة العالمية" },
            { en: "Healthy Drinks", ar: "المشروبات الصحية" },
          ],
          correct: 1,
          points: 1,
        },
        {
          id: "r5",
          textEn: "Inference: 'Ahmed put on his coat before leaving.' What can we infer?",
          textAr: "استنتاج: 'لبس أحمد معطفه قبل المغادرة'. ما الذي يمكن استنتاجه؟",
          options: [
            { en: "It was hot outside", ar: "كان الجو حاراً" },
            { en: "It was cold outside", ar: "كان الجو بارداً" },
            { en: "He was sick", ar: "كان مريضاً" },
            { en: "He was at home", ar: "كان في البيت" },
          ],
          correct: 1,
          points: 1,
        },
      ],
    },
    {
      type: "GRAMMAR",
      titleEn: "Grammar",
      titleAr: "القواعد",
      timeLimitMin: 8,
      questions: [
        { id: "g1", textEn: "She ___ to school every day.", textAr: "هي ___ إلى المدرسة كل يوم.", options: [{ en: "go", ar: "go" }, { en: "goes", ar: "goes" }, { en: "going", ar: "going" }, { en: "gone", ar: "gone" }], correct: 1, points: 1 },
        { id: "g2", textEn: "I ___ a book yesterday.", textAr: "أنا ___ كتاباً البارحة.", options: [{ en: "read", ar: "read" }, { en: "reads", ar: "reads" }, { en: "reading", ar: "reading" }, { en: "have read", ar: "have read" }], correct: 0, points: 1 },
        { id: "g3", textEn: "If I ___ more time, I would travel.", textAr: "لو كان لدي ___ وقت، لكنت سافرت.", options: [{ en: "have", ar: "have" }, { en: "had", ar: "had" }, { en: "has", ar: "has" }, { en: "having", ar: "having" }], correct: 1, points: 1 },
        { id: "g4", textEn: "There ___ many people in the room.", textAr: "___ كثيرٌ من الأشخاص في الغرفة.", options: [{ en: "is", ar: "is" }, { en: "are", ar: "are" }, { en: "was", ar: "was" }, { en: "be", ar: "be" }], correct: 1, points: 1 },
        { id: "g5", textEn: "She is ___ than her sister.", textAr: "هي ___ من أختها.", options: [{ en: "taller", ar: "taller" }, { en: "tallest", ar: "tallest" }, { en: "more tall", ar: "more tall" }, { en: "tall", ar: "tall" }], correct: 0, points: 1 },
        { id: "g6", textEn: "We have lived here ___ 2010.", textAr: "نسكن هنا ___ ٢٠١٠.", options: [{ en: "for", ar: "for" }, { en: "since", ar: "since" }, { en: "from", ar: "from" }, { en: "during", ar: "during" }], correct: 1, points: 1 },
        { id: "g7", textEn: "By the time we arrived, the movie ___ already started.", textAr: "بحلول وقت وصولنا كان الفيلم قد ___.", options: [{ en: "has", ar: "has" }, { en: "had", ar: "had" }, { en: "have", ar: "have" }, { en: "having", ar: "having" }], correct: 1, points: 1 },
        { id: "g8", textEn: "Choose the article: ___ honest person is respected.", textAr: "اختر أداة التعريف: ___ شخص أمين يُحترم.", options: [{ en: "A", ar: "A" }, { en: "An", ar: "An" }, { en: "The", ar: "The" }, { en: "—", ar: "—" }], correct: 1, points: 1 },
        { id: "g9", textEn: "Neither John nor his friends ___ coming.", textAr: "لا جون ولا أصدقاؤه ___ قادمون.", options: [{ en: "is", ar: "is" }, { en: "are", ar: "are" }, { en: "was", ar: "was" }, { en: "be", ar: "be" }], correct: 1, points: 1 },
        { id: "g10", textEn: "The report ___ by the manager tomorrow.", textAr: "التقرير ___ من قِبَل المدير غداً.", options: [{ en: "will review", ar: "will review" }, { en: "will be reviewed", ar: "will be reviewed" }, { en: "is reviewing", ar: "is reviewing" }, { en: "reviewed", ar: "reviewed" }], correct: 1, points: 1 },
      ],
    },
    {
      type: "VOCAB",
      titleEn: "Vocabulary",
      titleAr: "المفردات",
      timeLimitMin: 7,
      questions: [
        { id: "v1", textEn: "Synonym of 'happy':", textAr: "مرادف 'سعيد':", options: [{ en: "sad", ar: "حزين" }, { en: "joyful", ar: "مبتهج" }, { en: "tired", ar: "متعب" }, { en: "angry", ar: "غاضب" }], correct: 1, points: 1 },
        { id: "v2", textEn: "Antonym of 'expensive':", textAr: "عكس 'غالٍ':", options: [{ en: "cheap", ar: "رخيص" }, { en: "costly", ar: "ثمين" }, { en: "rare", ar: "نادر" }, { en: "luxurious", ar: "فاخر" }], correct: 0, points: 1 },
        { id: "v3", textEn: "Collocation: make a ___", textAr: "تلازم لفظي: make a ___", options: [{ en: "decision", ar: "قرار" }, { en: "homework", ar: "واجب" }, { en: "fun", ar: "متعة" }, { en: "shower", ar: "دش" }], correct: 0, points: 1 },
        { id: "v4", textEn: "'Ubiquitous' means:", textAr: "كلمة 'Ubiquitous' تعني:", options: [{ en: "rare", ar: "نادر" }, { en: "everywhere", ar: "في كل مكان" }, { en: "loud", ar: "صاخب" }, { en: "dangerous", ar: "خطر" }], correct: 1, points: 1 },
        { id: "v5", textEn: "Phrasal verb: 'give up' means:", textAr: "Phrasal verb 'give up' تعني:", options: [{ en: "succeed", ar: "ينجح" }, { en: "quit", ar: "يستسلم" }, { en: "donate", ar: "يتبرع" }, { en: "increase", ar: "يزيد" }], correct: 1, points: 1 },
        { id: "v6", textEn: "Choose the correct word: I would like a ___ of bread.", textAr: "اختر الكلمة الصحيحة: أريد ___ من الخبز.", options: [{ en: "piece", ar: "قطعة" }, { en: "glass", ar: "كأس" }, { en: "drop", ar: "قطرة" }, { en: "spoon", ar: "ملعقة" }], correct: 0, points: 1 },
        { id: "v7", textEn: "'Endure' is closest to:", textAr: "'Endure' أقرب إلى:", options: [{ en: "enjoy", ar: "يستمتع" }, { en: "tolerate", ar: "يتحمل" }, { en: "explore", ar: "يستكشف" }, { en: "envy", ar: "يحسد" }], correct: 1, points: 1 },
        { id: "v8", textEn: "Idiom 'piece of cake' means:", textAr: "Idiom 'piece of cake' تعني:", options: [{ en: "very tasty", ar: "لذيذ جداً" }, { en: "very easy", ar: "سهل جداً" }, { en: "very small", ar: "صغير جداً" }, { en: "very sweet", ar: "حلو جداً" }], correct: 1, points: 1 },
        { id: "v9", textEn: "'Scrutinize' means to ___ carefully.", textAr: "'Scrutinize' تعني ___ بدقة.", options: [{ en: "ignore", ar: "تجاهل" }, { en: "examine", ar: "فحص" }, { en: "remove", ar: "إزالة" }, { en: "translate", ar: "ترجمة" }], correct: 1, points: 1 },
        { id: "v10", textEn: "Best fit: She works in a ___ environment.", textAr: "الأنسب: تعمل في بيئة ___.", options: [{ en: "fast-paced", ar: "سريعة" }, { en: "fast-pacing", ar: "سريعة" }, { en: "fastly", ar: "بسرعة" }, { en: "fast-walker", ar: "مشّاء" }], correct: 0, points: 1 },
      ],
    },
    {
      type: "LISTENING",
      titleEn: "Listening",
      titleAr: "الاستماع",
      timeLimitMin: 7,
      questions: [
        { id: "l1", textEn: "Audio says: 'The meeting starts at 3 PM.' When does it start?", textAr: "يقول المقطع: 'يبدأ الاجتماع الساعة ٣ مساءً'. متى يبدأ؟", options: [{ en: "1 PM", ar: "١ ظهراً" }, { en: "3 PM", ar: "٣ مساءً" }, { en: "5 PM", ar: "٥ مساءً" }, { en: "7 PM", ar: "٧ مساءً" }], correct: 1, points: 1, audioUrl: null },
        { id: "l2", textEn: "Speaker A asks for directions to the bank. Where is it?", textAr: "السائلة تسأل عن البنك. أين هو؟", options: [{ en: "Next to library", ar: "بجانب المكتبة" }, { en: "Behind the mall", ar: "خلف المول" }, { en: "Across the school", ar: "مقابل المدرسة" }, { en: "Inside the hospital", ar: "داخل المستشفى" }], correct: 0, points: 1, audioUrl: null },
        { id: "l3", textEn: "Tone: 'I really can't believe you did this!' Speaker is:", textAr: "نبرة: 'لا أستطيع تصديق ما فعلت!' المتحدث:", options: [{ en: "Happy", ar: "سعيد" }, { en: "Surprised/angry", ar: "متفاجئ/غاضب" }, { en: "Sleepy", ar: "نعسان" }, { en: "Confused", ar: "محتار" }], correct: 1, points: 1, audioUrl: null },
        { id: "l4", textEn: "Conversation gist: planning a weekend trip. Where to?", textAr: "خلاصة المحادثة: تخطيط رحلة. إلى أين؟", options: [{ en: "Beach", ar: "البحر" }, { en: "Mountains", ar: "الجبال" }, { en: "City museum", ar: "متحف المدينة" }, { en: "Desert", ar: "الصحراء" }], correct: 1, points: 1, audioUrl: null },
        { id: "l5", textEn: "Detail: speaker mentions a price of 250 SAR. For what?", textAr: "تفصيل: المتحدث ذكر سعراً ٢٥٠ ريال. لماذا؟", options: [{ en: "Concert ticket", ar: "تذكرة حفلة" }, { en: "Plane ticket", ar: "تذكرة طيران" }, { en: "Hotel room", ar: "غرفة فندق" }, { en: "Dinner", ar: "عشاء" }], correct: 2, points: 1, audioUrl: null },
      ],
    },
  ],
};

// STEP_PREP — more advanced. Truncated repetition of base shape using A1–C1 distribution.
const STEP: TestSeed = {
  variant: "STEP_PREP",
  titleEn: "STEP Prep Placement",
  titleAr: "اختبار تحديد المستوى لتحضير ستيب",
  descriptionEn: "STEP-style placement: reading-heavy, advanced grammar and vocabulary.",
  descriptionAr: "اختبار بأسلوب ستيب: قراءة مكثفة وقواعد ومفردات متقدمة.",
  passingScore: 70,
  durationMin: 45,
  sections: [
    {
      type: "READING",
      titleEn: "STEP Reading",
      titleAr: "قراءة ستيب",
      timeLimitMin: 15,
      questions: Array.from({ length: 7 }).map((_, i) => ({
        id: `sr${i + 1}`,
        textEn: `STEP reading sample ${i + 1}: choose the best meaning.`,
        textAr: `نموذج قراءة ستيب ${i + 1}: اختر المعنى الأنسب.`,
        options: [
          { en: "Option A", ar: "خيار أ" },
          { en: "Option B (correct)", ar: "خيار ب (صحيح)" },
          { en: "Option C", ar: "خيار ج" },
          { en: "Option D", ar: "خيار د" },
        ],
        correct: 1,
        points: 1,
      })),
    },
    {
      type: "GRAMMAR",
      titleEn: "STEP Grammar",
      titleAr: "قواعد ستيب",
      timeLimitMin: 10,
      questions: Array.from({ length: 12 }).map((_, i) => ({
        id: `sg${i + 1}`,
        textEn: `STEP grammar item ${i + 1}: which form is correct?`,
        textAr: `سؤال قواعد ستيب ${i + 1}: ما الصيغة الصحيحة؟`,
        options: [
          { en: "Form A", ar: "صيغة أ" },
          { en: "Form B (correct)", ar: "صيغة ب (صحيحة)" },
          { en: "Form C", ar: "صيغة ج" },
          { en: "Form D", ar: "صيغة د" },
        ],
        correct: 1,
        points: 1,
      })),
    },
    {
      type: "VOCAB",
      titleEn: "STEP Vocabulary",
      titleAr: "مفردات ستيب",
      timeLimitMin: 10,
      questions: Array.from({ length: 10 }).map((_, i) => ({
        id: `sv${i + 1}`,
        textEn: `STEP vocab ${i + 1}: pick the closest synonym.`,
        textAr: `مفردات ستيب ${i + 1}: اختر المرادف الأقرب.`,
        options: [
          { en: "Word A", ar: "كلمة أ" },
          { en: "Word B (correct)", ar: "كلمة ب (صحيحة)" },
          { en: "Word C", ar: "كلمة ج" },
          { en: "Word D", ar: "كلمة د" },
        ],
        correct: 1,
        points: 1,
      })),
    },
    {
      type: "LISTENING",
      titleEn: "STEP Listening",
      titleAr: "استماع ستيب",
      timeLimitMin: 10,
      questions: Array.from({ length: 6 }).map((_, i) => ({
        id: `sl${i + 1}`,
        textEn: `STEP listening ${i + 1}: pick the correct detail.`,
        textAr: `استماع ستيب ${i + 1}: اختر التفصيل الصحيح.`,
        options: [
          { en: "A", ar: "أ" },
          { en: "B (correct)", ar: "ب (صحيح)" },
          { en: "C", ar: "ج" },
          { en: "D", ar: "د" },
        ],
        correct: 1,
        points: 1,
        audioUrl: null,
      })),
    },
  ],
};

const IELTS: TestSeed = {
  variant: "IELTS_PREP",
  titleEn: "IELTS Prep Placement",
  titleAr: "اختبار تحديد المستوى لتحضير آيلتس",
  descriptionEn: "IELTS-style placement: academic reading, listening with audio.",
  descriptionAr: "اختبار بأسلوب آيلتس: قراءة أكاديمية واستماع.",
  passingScore: 65,
  durationMin: 50,
  sections: [
    {
      type: "READING",
      titleEn: "IELTS Reading",
      titleAr: "قراءة آيلتس",
      timeLimitMin: 15,
      questions: Array.from({ length: 6 }).map((_, i) => ({
        id: `ir${i + 1}`,
        textEn: `IELTS reading ${i + 1}: based on the passage, which is correct?`,
        textAr: `قراءة آيلتس ${i + 1}: حسب الفقرة، ما هو الصحيح؟`,
        options: [
          { en: "Option A", ar: "خيار أ" },
          { en: "Option B (correct)", ar: "خيار ب (صحيح)" },
          { en: "Option C", ar: "خيار ج" },
          { en: "Option D", ar: "خيار د" },
        ],
        correct: 1,
        points: 1,
      })),
    },
    {
      type: "GRAMMAR",
      titleEn: "IELTS Grammar",
      titleAr: "قواعد آيلتس",
      timeLimitMin: 10,
      questions: Array.from({ length: 10 }).map((_, i) => ({
        id: `ig${i + 1}`,
        textEn: `IELTS grammar ${i + 1}: select the academic register.`,
        textAr: `قواعد آيلتس ${i + 1}: اختر السجل الأكاديمي.`,
        options: [
          { en: "Form A", ar: "أ" },
          { en: "Form B (correct)", ar: "ب (صحيح)" },
          { en: "Form C", ar: "ج" },
          { en: "Form D", ar: "د" },
        ],
        correct: 1,
        points: 1,
      })),
    },
    {
      type: "VOCAB",
      titleEn: "IELTS Vocabulary",
      titleAr: "مفردات آيلتس",
      timeLimitMin: 10,
      questions: Array.from({ length: 10 }).map((_, i) => ({
        id: `iv${i + 1}`,
        textEn: `IELTS academic vocab ${i + 1}: pick the academic match.`,
        textAr: `مفردات آيلتس أكاديمية ${i + 1}: اختر الأنسب.`,
        options: [
          { en: "A", ar: "أ" },
          { en: "B (correct)", ar: "ب (صحيح)" },
          { en: "C", ar: "ج" },
          { en: "D", ar: "د" },
        ],
        correct: 1,
        points: 1,
      })),
    },
    {
      type: "LISTENING",
      titleEn: "IELTS Listening",
      titleAr: "استماع آيلتس",
      timeLimitMin: 15,
      questions: Array.from({ length: 8 }).map((_, i) => ({
        id: `il${i + 1}`,
        textEn: `IELTS listening ${i + 1}: choose the correct fill.`,
        textAr: `استماع آيلتس ${i + 1}: اختر التعبئة الصحيحة.`,
        options: [
          { en: "A", ar: "أ" },
          { en: "B (correct)", ar: "ب (صحيح)" },
          { en: "C", ar: "ج" },
          { en: "D", ar: "د" },
        ],
        correct: 1,
        points: 1,
        audioUrl: null,
      })),
    },
  ],
};

async function seedTest(t: TestSeed) {
  // Idempotency: skip if a test with same titleEn already exists.
  const existing = await prisma.placementTest.findFirst({ where: { titleEn: t.titleEn } });
  if (existing) {
    console.log(`  ⏭  ${t.titleEn} already seeded (id=${existing.id})`);
    return;
  }

  const test = await prisma.placementTest.create({
    data: {
      variant: t.variant,
      titleEn: t.titleEn,
      titleAr: t.titleAr,
      descriptionEn: t.descriptionEn,
      descriptionAr: t.descriptionAr,
      passingScore: t.passingScore,
      durationMin: t.durationMin,
      isActive: true,
    },
  });

  for (let i = 0; i < t.sections.length; i++) {
    const s = t.sections[i];
    const maxScore = s.questions.reduce((acc, q) => acc + q.points, 0);
    await prisma.placementSection.create({
      data: {
        testId: test.id,
        type: s.type,
        titleEn: s.titleEn,
        titleAr: s.titleAr,
        timeLimitMin: s.timeLimitMin,
        order: i,
        maxScore,
        questions: s.questions as unknown as object,
      },
    });
  }

  console.log(`  ✓ ${t.titleEn}`);
}

async function main() {
  console.log("Seeding placement tests...");
  for (const t of [GENERAL, STEP, IELTS]) {
    await seedTest(t);
  }
  console.log("✅ Placement tests seeded.");
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
