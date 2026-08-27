/**
 * Seed the student Library.
 *
 * The Library screens, progress tracking and viewer were all built; the
 * `LibraryItem` table was empty, so every student saw an empty shelf.
 *
 * Deliberately ARTICLE-only. The viewer renders VIDEO, AUDIO and PDF from
 * `contentUrl`, and the academy has no hosted media yet — seeding those types
 * would put dead players on the shelf, which is worse than an empty one.
 * ARTICLE renders from `contentHtml`, which is self-contained: it works
 * offline, on any device, with nothing to upload. Media items can be added
 * from the admin side the day real files exist.
 *
 * `publishedAt` is set because the student query orders by it — an item
 * without it sorts unpredictably and can vanish below the fold.
 *
 * Age tiers are spread across TIER_1_3 / TIER_4_6 / MIDDLE / HIGH plus ALL,
 * because the student page only shows items matching the reader's tier (or
 * ALL). Seeding one tier would leave most students staring at an empty shelf
 * anyway.
 *
 *   npx tsx scripts/seed-library.ts
 */

import { PrismaClient, type LibraryItemType, type LibrarySkillLevel, type LibraryAgeTier } from "@prisma/client";

const prisma = new PrismaClient();

const wrap = (title: string, body: string) =>
  `<h2>${title}</h2>\n${body}`;

interface Seed {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  type: LibraryItemType;
  skillLevel: LibrarySkillLevel;
  targetAgeTier: LibraryAgeTier;
  durationMinutes: number;
  contentHtml: string;
}

const ITEMS: Seed[] = [
  {
    title: "The 100 words you will use every day",
    titleAr: "المئة كلمة التي ستستخدمها كل يوم",
    description: "Start here. These words appear in half of everything you will read.",
    descriptionAr: "ابدأ من هنا. هذه الكلمات تظهر في نصف ما ستقرأه.",
    type: "ARTICLE", skillLevel: "A1", targetAgeTier: "ALL", durationMinutes: 6,
    contentHtml: wrap("Where to start",
      `<p>English has more than a hundred thousand words, but you do not need them. Around one hundred words make up roughly half of everything written in English. Learn those first and the rest becomes easier.</p>
<h3>The words that carry sentences</h3>
<p><strong>the, be, to, of, and, a, in, that, have, it, for, not, on, with, he, as, you, do, at, this, but, his, by, from, they, we, say, her, she, or, an, will, my, one, all, would, there, their</strong></p>
<p>Notice something: almost none of them are nouns. They are the joints of the language — the small words that hold bigger ones together. A learner who knows <em>camel</em> but not <em>with</em> cannot build a sentence. A learner who knows <em>with</em> can.</p>
<h3>How to practise them</h3>
<ol>
<li>Read a short paragraph and underline every word from the list. You will be surprised how much of the page you already know.</li>
<li>Cover the paragraph and write one sentence using three of them.</li>
<li>Say the sentence out loud. Speaking fixes words in memory faster than reading.</li>
</ol>
<p>Ten minutes a day for two weeks is enough to make these automatic. Once they are automatic, your brain is free to focus on the new words instead of the glue between them.</p>`),
  },
  {
    title: "How to answer a reading question without panicking",
    titleAr: "كيف تجيب عن سؤال قراءة دون توتر",
    description: "A method that works in class, in STEP and in IELTS.",
    descriptionAr: "طريقة تنفع في الصف وفي ستيب وآيلتس.",
    type: "ARTICLE", skillLevel: "B1", targetAgeTier: "HIGH", durationMinutes: 8,
    contentHtml: wrap("Read the question first",
      `<p>Most students read the passage, then read the question, then read the passage again. That is three readings and a lot of lost time. Reverse it.</p>
<h3>The four steps</h3>
<ol>
<li><strong>Read the question first.</strong> Now you know what you are looking for, so your eyes have a job.</li>
<li><strong>Find the keyword.</strong> Names, numbers, dates and unusual nouns are easy to spot on a page. Common words are not.</li>
<li><strong>Read only around the keyword.</strong> The answer is almost always in the sentence before, the sentence itself, or the sentence after.</li>
<li><strong>Check the other options are wrong.</strong> A wrong option is usually right about the topic but wrong about the detail — a changed number, a reversed cause, an added "always" or "never".</li>
</ol>
<h3>The trap to know</h3>
<p>Exam writers love options that repeat words from the passage. Repetition is not evidence. An option that copies four words from the text can still be false, and the correct answer is often the one that says the same thing in <em>different</em> words. Match the meaning, not the vocabulary.</p>
<h3>If you run out of time</h3>
<p>Answer every question. There is no penalty for a wrong guess in STEP or IELTS, and an empty box scores zero with certainty.</p>`),
  },
  {
    title: "Talking about your family",
    titleAr: "الحديث عن عائلتك",
    description: "Simple sentences you can say today.",
    descriptionAr: "جمل بسيطة تستطيع قولها اليوم.",
    type: "ARTICLE", skillLevel: "A1", targetAgeTier: "TIER_4_6", durationMinutes: 5,
    contentHtml: wrap("Words for people you love",
      `<p>Every conversation in a new language starts with people. Here is what you need.</p>
<h3>The words</h3>
<p>father / mother / brother / sister / son / daughter / grandfather / grandmother / uncle / aunt / cousin</p>
<h3>The sentences</h3>
<ul>
<li>I have <strong>two brothers</strong> and <strong>one sister</strong>.</li>
<li>My father <strong>is</strong> a teacher.</li>
<li>My sister <strong>works</strong> in a hospital.</li>
<li>We <strong>live</strong> in Al Ahsa.</li>
<li>My grandmother <strong>makes</strong> the best food.</li>
</ul>
<h3>The mistake almost everyone makes</h3>
<p>In Arabic you can say "I have brother two". In English the number comes first and the noun becomes plural: <em>two brothers</em>. One brother, two brother<strong>s</strong>. Say it five times and it will stop feeling strange.</p>
<h3>Try it</h3>
<p>Write four sentences about your own family using the patterns above. Then read them aloud to someone at home.</p>`),
  },
  {
    title: "Why you understand English but cannot speak it",
    titleAr: "لماذا تفهم الإنجليزية ولا تستطيع التحدث بها",
    description: "The gap between input and output, and how to close it.",
    descriptionAr: "الفجوة بين الفهم والتحدث، وكيف تُغلق.",
    type: "ARTICLE", skillLevel: "B1", targetAgeTier: "ALL", durationMinutes: 7,
    contentHtml: wrap("Two different skills",
      `<p>You watch a film and follow it easily. Someone asks you a question and nothing comes out. This is not a lack of English — it is the difference between <strong>recognising</strong> a word and <strong>producing</strong> one.</p>
<p>Recognition is easy: the word is in front of you and your brain only has to match it. Production is hard: your brain must search, choose, arrange and pronounce, all in about one second.</p>
<h3>What actually helps</h3>
<ul>
<li><strong>Speak before you are ready.</strong> Waiting until you feel confident is waiting forever. Confidence comes after speaking, never before.</li>
<li><strong>Say full sentences, not words.</strong> Answer "Where do you live?" with "I live in Al Ahsa", not "Al Ahsa". You are training the pattern, not the fact.</li>
<li><strong>Repeat what you hear.</strong> Pause a video and say the line yourself. This is called shadowing, and it moves words from recognition to production faster than any other exercise.</li>
<li><strong>Accept mistakes.</strong> A student who speaks with mistakes improves. A student who stays silent to avoid them does not.</li>
</ul>
<h3>Five minutes a day</h3>
<p>Describe your day out loud in English before you sleep. Nobody has to hear it. The point is that your mouth, not only your eyes, has done the work.</p>`),
  },
  {
    title: "Reading a story: The Boy and the Camel",
    titleAr: "قصة للقراءة: الولد والجمل",
    description: "A short story with the questions underneath.",
    descriptionAr: "قصة قصيرة مع أسئلة في نهايتها.",
    type: "ARTICLE", skillLevel: "A2", targetAgeTier: "TIER_1_3", durationMinutes: 6,
    contentHtml: wrap("The Boy and the Camel",
      `<p>Salem was ten years old. He lived with his family near the palm trees, and every morning he walked with his father's camel to the water.</p>
<p>One day the camel stopped. It would not move. Salem pulled the rope, but the camel sat down in the sand and closed its eyes.</p>
<p>Salem was angry. Then he looked at the camel's foot. A sharp stone was stuck between its toes.</p>
<p>He was a small boy and the camel was very big, but he sat down in the sand too, and slowly, carefully, he took the stone out.</p>
<p>The camel stood up. It walked to the water. And after that day, whenever Salem came near, the camel lowered its head to him — the way a friend says hello.</p>
<h3>Questions</h3>
<ol>
<li>How old was Salem?</li>
<li>Why did the camel stop walking?</li>
<li>What did Salem do first — get angry, or look at the foot?</li>
<li>What does the last sentence tell you about the camel?</li>
</ol>
<h3>Words to learn</h3>
<p><strong>stuck</strong> = cannot move · <strong>sharp</strong> = it can cut you · <strong>lowered</strong> = moved down · <strong>carefully</strong> = slowly, without hurting</p>`),
  },
  {
    title: "STEP: what the test actually asks you",
    titleAr: "ستيب: ماذا يطلب منك الاختبار فعلاً",
    description: "The four sections, the timing, and where marks are lost.",
    descriptionAr: "الأقسام الأربعة والتوقيت وأين تُفقد الدرجات.",
    type: "ARTICLE", skillLevel: "B2", targetAgeTier: "HIGH", durationMinutes: 9,
    contentHtml: wrap("Know the shape before you study the content",
      `<p>STEP measures English for Saudi universities. Students lose marks less because their English is weak and more because the test surprises them. It should not.</p>
<h3>What it contains</h3>
<ul>
<li><strong>Reading comprehension</strong> — passages followed by questions about main idea, detail and inference.</li>
<li><strong>Grammar and structure</strong> — sentence completion; tenses, prepositions and word order.</li>
<li><strong>Vocabulary</strong> — meaning in context, not memorised lists.</li>
<li><strong>Composition analysis</strong> — recognising the correct or best-written sentence.</li>
</ul>
<h3>Where marks are actually lost</h3>
<ol>
<li><strong>Time.</strong> Students read the first passage too slowly and rush the last three. Give each passage a fixed number of minutes and move on when it ends, answered or not.</li>
<li><strong>Vocabulary in isolation.</strong> Memorising word lists helps far less than reading. STEP tests words <em>in context</em>, and context is only learned by reading real sentences.</li>
<li><strong>Empty answers.</strong> There is no penalty for guessing. Never leave a box blank.</li>
</ol>
<h3>A four-week plan</h3>
<p>Week 1: one reading passage a day, timed. Week 2: add twenty minutes of grammar practice. Week 3: full sections under exam timing. Week 4: two complete mock tests and review every wrong answer — the review is where the marks come from, not the test itself.</p>`),
  },
  {
    title: "Writing an email your teacher will take seriously",
    titleAr: "كتابة بريد يأخذه معلّمك على محمل الجد",
    description: "Structure, tone, and the mistakes that make an email look careless.",
    descriptionAr: "البنية والأسلوب والأخطاء التي تجعل البريد يبدو مهملاً.",
    type: "ARTICLE", skillLevel: "B1", targetAgeTier: "MIDDLE", durationMinutes: 7,
    contentHtml: wrap("Four lines and a signature",
      `<p>A good email is short. Long emails do not sound polite — they sound uncertain.</p>
<h3>The structure</h3>
<ol>
<li><strong>Greeting:</strong> Dear Ms Fatimah, / Dear Sir,</li>
<li><strong>Reason:</strong> I am writing about the homework due on Sunday.</li>
<li><strong>Request:</strong> Could I please have one extra day? I was unwell on Thursday.</li>
<li><strong>Close:</strong> Thank you for your time. / Kind regards, Ahmed Al Ali</li>
</ol>
<h3>What makes an email look careless</h3>
<ul>
<li><strong>No subject line.</strong> Write one: "Homework — request for extension".</li>
<li><strong>hi teacher</strong> with a small letter, or no greeting at all.</li>
<li><strong>Text-message spelling</strong> — u, pls, thx.</li>
<li><strong>No name at the end.</strong> Your teacher has many students; make it easy.</li>
</ul>
<h3>Compare</h3>
<p><em>Weak:</em> "hi i cant do the hw can u give me time thx"</p>
<p><em>Strong:</em> "Dear Ms Fatimah, I am writing about the homework due on Sunday. I was unwell on Thursday and would be grateful for one extra day. Thank you for your time. Kind regards, Ahmed Al Ali"</p>
<p>Same request. Completely different answer.</p>`),
  },
  {
    title: "Ten pronunciation habits Arabic speakers can fix quickly",
    titleAr: "عشر عادات نطق يستطيع الناطق بالعربية إصلاحها بسرعة",
    description: "The specific sounds, and what to do with your mouth.",
    descriptionAr: "الأصوات المحددة وماذا تفعل بفمك.",
    type: "ARTICLE", skillLevel: "A2", targetAgeTier: "ALL", durationMinutes: 8,
    contentHtml: wrap("Small changes, large difference",
      `<p>Arabic and English do not share all their sounds. These are the ones worth practising, and none of them take long.</p>
<h3>The sounds</h3>
<ol>
<li><strong>P vs B</strong> — <em>park</em> is not <em>bark</em>. Hold a paper in front of your mouth: for P it should move.</li>
<li><strong>V vs F</strong> — <em>very</em>, not <em>fery</em>. Top teeth touch the bottom lip and the sound buzzes.</li>
<li><strong>The two TH sounds</strong> — <em>think</em> (quiet) and <em>this</em> (buzzing). The tongue goes between the teeth for both.</li>
<li><strong>NG at the end</strong> — <em>singing</em>, not <em>singin-g</em>. Stop the sound in your nose, do not add a hard G.</li>
<li><strong>Short vs long vowels</strong> — <em>ship</em> and <em>sheep</em> are different words. So are <em>full</em> and <em>fool</em>.</li>
<li><strong>Silent letters</strong> — <em>know</em>, <em>write</em>, <em>hour</em>, <em>listen</em>. The letter is there; the sound is not.</li>
<li><strong>Consonant clusters</strong> — <em>street</em>, <em>splash</em>. Do not add a vowel between them.</li>
<li><strong>Word stress</strong> — <strong>PHO</strong>tograph, pho<strong>TOG</strong>rapher. Stress in the wrong place makes a known word unrecognisable.</li>
<li><strong>-ed endings</strong> — <em>walked</em> sounds like "walkt", <em>played</em> like "playd", <em>wanted</em> like "wantid".</li>
<li><strong>Sentence rhythm</strong> — English squeezes the small words and leans on the important ones. Copying that rhythm helps more than any single sound.</li>
</ol>
<h3>How to practise</h3>
<p>Record yourself reading four lines. Listen once. Fix one sound only. Record again. One sound at a time is the whole method.</p>`),
  },
];

async function main() {
  console.log("Seeding library…\n");
  let created = 0;
  let updated = 0;
  const now = new Date();

  for (const it of ITEMS) {
    const existing = await prisma.libraryItem.findFirst({ where: { title: it.title } });
    const data = {
      title: it.title,
      titleAr: it.titleAr,
      description: it.description,
      descriptionAr: it.descriptionAr,
      type: it.type,
      skillLevel: it.skillLevel,
      targetAgeTier: it.targetAgeTier,
      durationMinutes: it.durationMinutes,
      contentHtml: it.contentHtml,
      isPublished: true,
      publishedAt: existing?.publishedAt ?? now,
    };
    if (existing) {
      await prisma.libraryItem.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.libraryItem.create({ data });
      created++;
    }
    console.log(`  ${existing ? "~" : "+"} ${it.type.padEnd(8)} ${it.skillLevel.padEnd(4)} ${it.targetAgeTier.padEnd(10)} ${it.title}`);
  }

  console.log(`\ncreated ${created}, updated ${updated}`);
  const byTier = await prisma.libraryItem.groupBy({ by: ["targetAgeTier"], _count: true });
  console.log("Library by age tier:");
  for (const b of byTier) console.log(`  ${String(b.targetAgeTier).padEnd(10)} ${b._count}`);
  console.log(`  published: ${await prisma.libraryItem.count({ where: { isPublished: true } })}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
