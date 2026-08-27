/**
 * Seed English Lab exercises — one starter set for every skill.
 *
 * The Lab is fully built: a block engine, instant grading, CEFR levels,
 * targeting, attempts and points. `LabExercise` held zero rows, so every
 * skill tab in the student Lab was an empty state. The engine worked; there
 * was simply nothing in it.
 *
 * Content follows labContentSchema exactly — version 2, blocks validated by
 * the same zod union the save route uses, so anything seeded here is
 * editable afterwards in Lab Studio without migration.
 *
 * Only objective block kinds are used (MCQ, TRUE_FALSE, FILL_BLANK,
 * WORD_ORDER, MATCHING) plus PASSAGE for context: those grade themselves the
 * moment a student submits. RECORD and SHORT_TEXT need a human or the AI
 * evaluator, and a starter library that sits waiting for marking is not a
 * library a student can use tonight.
 *
 * Audience is LIBRARY: visible to every student, not tied to a class.
 * Idempotent — an exercise with the same title is updated, not duplicated.
 *
 *   npx tsx scripts/seed-lab-exercises.ts
 */

import { PrismaClient, type ExerciseType, type CefrLevel } from "@prisma/client";

const prisma = new PrismaClient();

type Block = Record<string, unknown>;

const passage = (id: string, text: string, textAr?: string): Block => ({ id, kind: "PASSAGE", text, ...(textAr ? { textAr } : {}) });

const mcq = (id: string, prompt: string, options: string[], correctIndex: number, explanation?: string, points = 1): Block => ({
  id, kind: "MCQ", points, prompt,
  options: options.map((text, i) => ({ id: `${id}o${i}`, text })),
  correctOptionId: `${id}o${correctIndex}`,
  ...(explanation ? { explanation } : {}),
});

const tf = (id: string, prompt: string, answer: boolean, explanation?: string, points = 1): Block => ({
  id, kind: "TRUE_FALSE", points, prompt, answer, ...(explanation ? { explanation } : {}),
});

const fill = (id: string, text: string, accept: string[][], points = 1): Block => ({
  id, kind: "FILL_BLANK", points, text,
  blanks: accept.map((a, i) => ({ index: i + 1, accept: a })),
});

const order = (id: string, prompt: string, tokens: string[], points = 2): Block => ({
  id, kind: "WORD_ORDER", points, prompt, tokens,
});

const match = (id: string, prompt: string, pairs: Array<[string, string]>, points = 2): Block => ({
  id, kind: "MATCHING", points, prompt,
  pairs: pairs.map(([left, right], i) => ({ id: `${id}p${i}`, left, right })),
});

interface Seed {
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  estimatedMinutes: number;
  tags: string[];
  instructions: string;
  blocks: Block[];
}

const EXERCISES: Seed[] = [
  // ── GRAMMAR ──────────────────────────────────────────────────────────
  {
    type: "GRAMMAR", level: "A1", title: "Present Simple: he, she, it", titleAr: "المضارع البسيط: he, she, it",
    description: "The -s that learners forget most.", descriptionAr: "حرف الـ -s الذي يُنسى أكثر من غيره.",
    estimatedMinutes: 8, tags: ["present simple", "verbs"],
    instructions: "Choose the correct verb form.",
    blocks: [
      mcq("b1", "My father ___ in a hospital.", ["work", "works", "working", "worked"], 1, "With he/she/it we add -s: works."),
      mcq("b2", "The children ___ every afternoon.", ["plays", "play", "is playing", "to play"], 1, "Children is plural — no -s on the verb."),
      mcq("b3", "She ___ coffee in the morning.", ["drink", "drinks", "drinking", "drank"], 1),
      fill("b4", "He {{1}} (go) to the mosque on Friday.", [["goes"]]),
      fill("b5", "They {{1}} (live) in Al Ahsa.", [["live"]]),
      tf("b6", "\"She study every night\" is correct English.", false, "It must be: She studies every night."),
    ],
  },
  {
    type: "GRAMMAR", level: "A2", title: "Past Simple: regular and irregular", titleAr: "الماضي البسيط: المنتظم والشاذ",
    description: "Talk about what already happened.", descriptionAr: "تحدّث عمّا حدث بالفعل.",
    estimatedMinutes: 10, tags: ["past simple", "verbs"],
    instructions: "Put the verbs into the past.",
    blocks: [
      mcq("b1", "Yesterday I ___ my grandmother.", ["visit", "visited", "visiting", "visits"], 1),
      mcq("b2", "We ___ to Riyadh last summer.", ["goed", "gone", "went", "going"], 2, "Go is irregular: go → went."),
      fill("b3", "She {{1}} (buy) a new book last week.", [["bought"]]),
      fill("b4", "They {{1}} (finish) the project on time.", [["finished"]]),
      order("b5", "Put the sentence in order.", ["I", "watched", "a", "film", "last", "night"]),
      tf("b6", "The past of \"teach\" is \"teached\".", false, "It is \"taught\"."),
    ],
  },
  {
    type: "GRAMMAR", level: "B1", title: "Present Perfect vs Past Simple", titleAr: "المضارع التام مقابل الماضي البسيط",
    description: "The difference that decides your level.", descriptionAr: "الفرق الذي يحدّد مستواك.",
    estimatedMinutes: 12, tags: ["present perfect", "tenses"],
    instructions: "Choose the tense that fits the time reference.",
    blocks: [
      mcq("b1", "I ___ in this city since 2019.", ["live", "lived", "have lived", "am living"], 2, "\"Since\" + a still-true situation takes the present perfect."),
      mcq("b2", "She ___ her keys yesterday.", ["has lost", "lost", "loses", "was losing"], 1, "\"Yesterday\" is finished time — past simple."),
      mcq("b3", "___ you ever ___ to Jeddah?", ["Did / go", "Have / been", "Are / going", "Do / went"], 1),
      fill("b4", "We {{1}} (know) each other for ten years.", [["have known"]]),
      tf("b5", "\"I have seen him last Monday\" is correct.", false, "A finished time marker needs the past simple: I saw him last Monday."),
      match("b6", "Match the time expression to the tense.", [
        ["since 2020", "present perfect"],
        ["two days ago", "past simple"],
        ["already", "present perfect"],
        ["in 2015", "past simple"],
      ]),
    ],
  },
  // ── VOCABULARY ───────────────────────────────────────────────────────
  {
    type: "VOCABULARY", level: "A1", title: "Everyday objects and places", titleAr: "أشياء وأماكن يومية",
    description: "The first 30 words you actually use.", descriptionAr: "أول ٣٠ كلمة تستخدمها فعلاً.",
    estimatedMinutes: 7, tags: ["basics", "nouns"],
    instructions: "Choose the right word.",
    blocks: [
      mcq("b1", "You buy bread at the ___.", ["bakery", "library", "pharmacy", "garage"], 0),
      mcq("b2", "You sleep in a ___.", ["chair", "bed", "table", "door"], 1),
      match("b3", "Match the place to what you do there.", [
        ["school", "study"], ["hospital", "see a doctor"], ["restaurant", "eat"], ["airport", "take a plane"],
      ]),
      fill("b4", "I keep my books in a {{1}}.", [["bag", "backpack"]]),
      tf("b5", "A \"kitchen\" is a room where you cook.", true),
    ],
  },
  {
    type: "VOCABULARY", level: "B1", title: "Word partners for school and work", titleAr: "تلازمات لفظية للدراسة والعمل",
    description: "Which words go together — make, do, take.", descriptionAr: "أي الكلمات تتلازم — make وdo وtake.",
    estimatedMinutes: 10, tags: ["collocations", "academic"],
    instructions: "Choose the natural partner.",
    blocks: [
      mcq("b1", "___ a decision", ["do", "make", "take", "have"], 1),
      mcq("b2", "___ an exam", ["make", "do", "take", "give"], 2, "In British English you take or sit an exam."),
      mcq("b3", "___ your homework", ["do", "make", "take", "put"], 0),
      mcq("b4", "___ progress", ["do", "make", "take", "get"], 1),
      match("b5", "Match the verb to its partner.", [
        ["make", "a mistake"], ["do", "research"], ["take", "notes"], ["pay", "attention"],
      ]),
      fill("b6", "Please {{1}} attention to the instructions.", [["pay"]]),
    ],
  },
  // ── READING ──────────────────────────────────────────────────────────
  {
    type: "READING", level: "A2", title: "Reading a short notice", titleAr: "قراءة إعلان قصير",
    description: "Find the facts fast.", descriptionAr: "استخرج المعلومة بسرعة.",
    estimatedMinutes: 8, tags: ["skimming", "notices"],
    instructions: "Read the notice, then answer.",
    blocks: [
      passage("b0",
        "SCHOOL LIBRARY — NEW HOURS\nFrom Sunday, the library opens at 7:30 a.m. and closes at 2:00 p.m.\nOn Thursday it closes at 12:00 noon.\nStudents may borrow up to three books for two weeks.",
        "مكتبة المدرسة — مواعيد جديدة\nمن يوم الأحد، تفتح المكتبة 7:30 صباحاً وتغلق 2:00 ظهراً.\nيوم الخميس تغلق 12:00 ظهراً.\nيمكن للطالب استعارة ثلاثة كتب لمدة أسبوعين."),
      mcq("b1", "What time does the library close on Thursday?", ["2:00 p.m.", "12:00 noon", "7:30 a.m.", "It does not open"], 1),
      mcq("b2", "How many books can a student borrow?", ["Two", "Three", "Four", "As many as they want"], 1),
      tf("b3", "Books can be kept for one month.", false, "The notice says two weeks."),
      fill("b4", "The library opens at {{1}} a.m.", [["7:30", "7.30"]]),
    ],
  },
  {
    type: "READING", level: "B1", title: "Understanding a short article", titleAr: "فهم مقال قصير",
    description: "Main idea, detail and inference.", descriptionAr: "الفكرة الرئيسة والتفاصيل والاستنتاج.",
    estimatedMinutes: 12, tags: ["comprehension", "inference"],
    instructions: "Read carefully — one question asks what the writer implies, not what they say.",
    blocks: [
      passage("b0",
        "Many students believe that studying for long hours is the key to good marks. Research suggests otherwise. Learners who study in short, focused sessions and test themselves regularly remember far more than those who read the same page for hours. The brain needs recall, not repetition. A student who closes the book and tries to write down what they remember is doing harder — and better — work than one who simply reads again.",
        "يعتقد كثير من الطلاب أن الدراسة لساعات طويلة هي مفتاح الدرجات العالية. تشير الأبحاث إلى عكس ذلك."),
      mcq("b1", "What is the main idea?", [
        "Long study hours guarantee good marks",
        "Testing yourself beats re-reading",
        "Research is unreliable",
        "Students should read more pages",
      ], 1),
      mcq("b2", "According to the text, the brain needs ___.", ["repetition", "recall", "rest", "reading"], 1),
      tf("b3", "The writer thinks re-reading is the hardest form of study.", false, "The writer says recall is the harder and better work."),
      mcq("b4", "What would the writer most likely recommend?", [
        "Reading a chapter five times",
        "Closing the book and writing what you remember",
        "Studying for six hours without a break",
        "Highlighting every line",
      ], 1),
      order("b5", "Put the study advice in order.", ["study", "in", "short", "focused", "sessions"]),
    ],
  },
  // ── LISTENING (text-driven, no audio file needed yet) ────────────────
  {
    type: "LISTENING", level: "A2", title: "Following classroom instructions", titleAr: "متابعة تعليمات الصف",
    description: "What your teacher actually means.", descriptionAr: "ماذا يقصد معلّمك فعلاً.",
    estimatedMinutes: 7, tags: ["classroom", "instructions"],
    instructions: "Read what the teacher says and choose the right response.",
    blocks: [
      passage("b0", "Your teacher says: \"Open your books to page forty-two and work in pairs.\"",
        "يقول معلّمك: \"افتحوا كتبكم على صفحة ٤٢ واعملوا في أزواج.\""),
      mcq("b1", "What page do you open?", ["24", "42", "40", "22"], 1),
      mcq("b2", "How do you work?", ["Alone", "In pairs", "In one big group", "At home"], 1),
      passage("b2p", "Your teacher says: \"Hand in your homework at the end of the lesson, not now.\"",
        "يقول معلّمك: \"سلّموا واجباتكم في نهاية الحصة، ليس الآن.\""),
      mcq("b3", "When do you hand in the homework?", ["Now", "Tomorrow", "At the end of the lesson", "Next week"], 2),
      tf("b4", "You should give the homework to the teacher immediately.", false),
    ],
  },
  // ── WRITING (objective, so it grades instantly) ──────────────────────
  {
    type: "WRITING", level: "A2", title: "Building a correct sentence", titleAr: "بناء جملة صحيحة",
    description: "Word order before paragraphs.", descriptionAr: "ترتيب الكلمات قبل الفقرات.",
    estimatedMinutes: 9, tags: ["sentence structure", "word order"],
    instructions: "Arrange each sentence, then fix the punctuation questions.",
    blocks: [
      order("b1", "Make a correct sentence.", ["My", "brother", "plays", "football", "on", "Fridays"]),
      order("b2", "Make a correct question.", ["Where", "do", "you", "live"]),
      order("b3", "Make a correct sentence.", ["She", "has", "never", "been", "to", "Cairo"]),
      mcq("b4", "Which sentence is punctuated correctly?", [
        "my name is ahmed",
        "My name is Ahmed.",
        "My name is ahmed",
        "my Name Is Ahmed.",
      ], 1, "Sentences start with a capital letter and names are capitalised."),
      tf("b5", "A question in English ends with a full stop.", false, "It ends with a question mark."),
    ],
  },
  {
    type: "WRITING", level: "B1", title: "Linking your ideas", titleAr: "ربط الأفكار",
    description: "However, because, although — used correctly.", descriptionAr: "however وbecause وalthough بشكل صحيح.",
    estimatedMinutes: 10, tags: ["linkers", "cohesion"],
    instructions: "Choose the linking word that fits the logic.",
    blocks: [
      mcq("b1", "I studied hard, ___ I still found the exam difficult.", ["so", "but", "because", "therefore"], 1),
      mcq("b2", "___ it was raining, we went out.", ["Although", "Because", "So", "Unless"], 0),
      mcq("b3", "He was tired ___ he had worked all night.", ["although", "but", "because", "however"], 2),
      fill("b4", "She is young, {{1}} she is very experienced.", [["but", "yet", "however"]]),
      match("b5", "Match the linker to its job.", [
        ["because", "gives a reason"],
        ["although", "shows contrast"],
        ["so", "shows a result"],
        ["for example", "introduces an example"],
      ]),
    ],
  },
  // ── SPEAKING (preparation, objective) ────────────────────────────────
  {
    type: "SPEAKING", level: "A2", title: "Everyday replies that sound natural", titleAr: "ردود يومية تبدو طبيعية",
    description: "Say the right thing back.", descriptionAr: "قل الرد الصحيح.",
    estimatedMinutes: 8, tags: ["conversation", "functions"],
    instructions: "Choose the natural reply for each situation.",
    blocks: [
      mcq("b1", "Someone says: \"How are you?\"", ["I am 15 years old.", "I'm fine, thanks. And you?", "Yes please.", "My name is Ali."], 1),
      mcq("b2", "Someone says: \"Thanks for your help!\"", ["No problem.", "Good morning.", "I am busy.", "Where?"], 0),
      mcq("b3", "You did not understand. You say:", ["Repeat.", "Sorry, could you say that again?", "No.", "Speak."], 1),
      mcq("b4", "You meet your teacher for the first time. You say:", ["Hey you.", "Nice to meet you.", "What's up?", "Bye."], 1),
      match("b5", "Match the situation to the phrase.", [
        ["apologising", "I'm really sorry"],
        ["asking permission", "May I come in?"],
        ["offering help", "Would you like a hand?"],
        ["agreeing", "That's a good point"],
      ]),
    ],
  },
];

async function main() {
  console.log("Seeding English Lab exercises…\n");
  let created = 0;
  let updated = 0;

  for (const e of EXERCISES) {
    const content = { version: 2, instructions: e.instructions, blocks: e.blocks };
    const points = e.blocks.reduce((s, b) => s + (typeof b.points === "number" ? b.points : 0), 0);

    const existing = await prisma.labExercise.findFirst({ where: { title: e.title } });
    const data = {
      type: e.type,
      level: e.level,
      title: e.title,
      titleAr: e.titleAr,
      description: e.description,
      descriptionAr: e.descriptionAr,
      content: content as unknown as object,
      estimatedMinutes: e.estimatedMinutes,
      pointsValue: points,
      tags: e.tags,
      isPublished: true,
      audience: "LIBRARY" as const,
    };

    if (existing) {
      await prisma.labExercise.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.labExercise.create({ data });
      created++;
    }
    console.log(`  ${existing ? "~" : "+"} ${e.type.padEnd(11)} ${e.level}  ${e.title}  (${e.blocks.length} blocks, ${points} pts)`);
  }

  console.log(`\ncreated ${created}, updated ${updated}`);
  const by = await prisma.labExercise.groupBy({ by: ["type"], _count: true });
  console.log("Lab now holds:");
  for (const b of by) console.log(`  ${String(b.type).padEnd(11)} ${b._count}`);
  console.log(`  published: ${await prisma.labExercise.count({ where: { isPublished: true } })}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
