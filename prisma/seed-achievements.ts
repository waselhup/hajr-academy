/**
 * Idempotent achievement seeder. Run: npx tsx prisma/seed-achievements.ts
 *
 * 30 achievements total — 5 universal + 7 TIER_1_3 + 7 TIER_4_6 + 6 MIDDLE + 5 HIGH.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACHIEVEMENTS: Array<{
  key: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  iconKey: string;
  xpReward: number;
  ageTier: "TIER_1_3" | "TIER_4_6" | "MIDDLE" | "HIGH" | null;
  category: string;
}> = [
  // Universal (5)
  {
    key: "first_login",
    nameAr: "أهلاً بك!",
    nameEn: "Welcome!",
    descriptionAr: "أول تسجيل دخول للأكاديمية.",
    descriptionEn: "Logged in to the academy for the first time.",
    iconKey: "sparkle",
    xpReward: 10,
    ageTier: null,
    category: "milestone",
  },
  {
    key: "first_class",
    nameAr: "أول حصة",
    nameEn: "First Class",
    descriptionAr: "حضرت أول حصة لك.",
    descriptionEn: "Attended your first class.",
    iconKey: "graduation",
    xpReward: 20,
    ageTier: null,
    category: "milestone",
  },
  {
    key: "first_homework",
    nameAr: "أول واجب",
    nameEn: "First Homework",
    descriptionAr: "سلّمت أول واجب لك.",
    descriptionEn: "Submitted your first homework.",
    iconKey: "book-check",
    xpReward: 15,
    ageTier: null,
    category: "milestone",
  },
  {
    key: "first_library_item",
    nameAr: "قارئ بدأ",
    nameEn: "Library Starter",
    descriptionAr: "أكملت أول عنصر من المكتبة.",
    descriptionEn: "Completed your first library item.",
    iconKey: "book-open",
    xpReward: 10,
    ageTier: null,
    category: "milestone",
  },
  {
    key: "month_one_complete",
    nameAr: "شهر مكتمل",
    nameEn: "First Month",
    descriptionAr: "أكملت أول شهر معنا.",
    descriptionEn: "Completed your first month with us.",
    iconKey: "calendar-check",
    xpReward: 30,
    ageTier: null,
    category: "milestone",
  },
  // TIER_1_3 (7) — playful
  {
    key: "tier13_star_collector",
    nameAr: "جامع النجوم",
    nameEn: "Star Collector",
    descriptionAr: "حصلت على ٥ نجوم من معلمك!",
    descriptionEn: "Got 5 stars from your teacher!",
    iconKey: "star",
    xpReward: 15,
    ageTier: "TIER_1_3",
    category: "performance",
  },
  {
    key: "tier13_color_master",
    nameAr: "سيد الألوان",
    nameEn: "Color Master",
    descriptionAr: "أكملت ١٠ تمارين في مختبر اللغة.",
    descriptionEn: "Completed 10 lab exercises.",
    iconKey: "palette",
    xpReward: 25,
    ageTier: "TIER_1_3",
    category: "lab",
  },
  {
    key: "tier13_story_time",
    nameAr: "وقت القصة",
    nameEn: "Story Time",
    descriptionAr: "قرأت ٥ قصص.",
    descriptionEn: "Read 5 stories.",
    iconKey: "book",
    xpReward: 20,
    ageTier: "TIER_1_3",
    category: "library",
  },
  {
    key: "tier13_singing_star",
    nameAr: "نجم الغناء",
    nameEn: "Singing Star",
    descriptionAr: "أكملت ٥ تمارين صوتية.",
    descriptionEn: "Completed 5 audio exercises.",
    iconKey: "mic",
    xpReward: 15,
    ageTier: "TIER_1_3",
    category: "skill",
  },
  {
    key: "tier13_helper",
    nameAr: "مساعد رائع",
    nameEn: "Great Helper",
    descriptionAr: "ساعدت زميلًا في الفصل.",
    descriptionEn: "Helped a classmate.",
    iconKey: "heart",
    xpReward: 10,
    ageTier: "TIER_1_3",
    category: "social",
  },
  {
    key: "tier13_perfect_week",
    nameAr: "أسبوع مثالي",
    nameEn: "Perfect Week",
    descriptionAr: "حضرت كل حصص الأسبوع.",
    descriptionEn: "Attended every class this week.",
    iconKey: "trophy",
    xpReward: 25,
    ageTier: "TIER_1_3",
    category: "attendance",
  },
  {
    key: "tier13_explorer",
    nameAr: "مستكشف",
    nameEn: "Explorer",
    descriptionAr: "جرّبت ٣ أنواع نشاطات مختلفة.",
    descriptionEn: "Tried 3 different activity types.",
    iconKey: "compass",
    xpReward: 15,
    ageTier: "TIER_1_3",
    category: "milestone",
  },

  // TIER_4_6 (7) — game-like
  {
    key: "tier46_word_wizard",
    nameAr: "ساحر الكلمات",
    nameEn: "Word Wizard",
    descriptionAr: "تعلمت ١٠٠ كلمة جديدة.",
    descriptionEn: "Learned 100 new words.",
    iconKey: "wand",
    xpReward: 50,
    ageTier: "TIER_4_6",
    category: "vocab",
  },
  {
    key: "tier46_reading_rocket",
    nameAr: "صاروخ القراءة",
    nameEn: "Reading Rocket",
    descriptionAr: "قرأت ١٠ مقالات.",
    descriptionEn: "Read 10 articles.",
    iconKey: "rocket",
    xpReward: 30,
    ageTier: "TIER_4_6",
    category: "library",
  },
  {
    key: "tier46_quiz_champion",
    nameAr: "بطل المسابقات",
    nameEn: "Quiz Champion",
    descriptionAr: "حصلت على ١٠٠٪ في ٥ اختبارات.",
    descriptionEn: "Got 100% on 5 quizzes.",
    iconKey: "trophy",
    xpReward: 40,
    ageTier: "TIER_4_6",
    category: "performance",
  },
  {
    key: "tier46_grammar_guru",
    nameAr: "خبير القواعد",
    nameEn: "Grammar Guru",
    descriptionAr: "نجحت في ١٠ تمارين قواعد.",
    descriptionEn: "Passed 10 grammar exercises.",
    iconKey: "book-check",
    xpReward: 30,
    ageTier: "TIER_4_6",
    category: "skill",
  },
  {
    key: "tier46_writing_wizard",
    nameAr: "ساحر الكتابة",
    nameEn: "Writing Wizard",
    descriptionAr: "كتبت ٥ مقالات.",
    descriptionEn: "Wrote 5 essays.",
    iconKey: "pen",
    xpReward: 35,
    ageTier: "TIER_4_6",
    category: "writing",
  },
  {
    key: "tier46_listener",
    nameAr: "مستمع جيّد",
    nameEn: "Good Listener",
    descriptionAr: "أكملت ١٠ تمارين استماع.",
    descriptionEn: "Completed 10 listening exercises.",
    iconKey: "ear",
    xpReward: 25,
    ageTier: "TIER_4_6",
    category: "skill",
  },
  {
    key: "tier46_streak_master",
    nameAr: "ملك الاستمرارية",
    nameEn: "Streak Master",
    descriptionAr: "تواصلت ٧ أيام متتالية.",
    descriptionEn: "7-day streak.",
    iconKey: "flame",
    xpReward: 25,
    ageTier: "TIER_4_6",
    category: "streak",
  },

  // MIDDLE (6)
  {
    key: "middle_step_climber",
    nameAr: "متسلق ستيب",
    nameEn: "STEP Climber",
    descriptionAr: "نجحت في وحدة كاملة من بنك ستيب.",
    descriptionEn: "Passed a STEP module.",
    iconKey: "mountain",
    xpReward: 50,
    ageTier: "MIDDLE",
    category: "step",
  },
  {
    key: "middle_vocab_100",
    nameAr: "مفردات ١٠٠",
    nameEn: "Vocabulary 100",
    descriptionAr: "أتقنت ١٠٠ مفردة.",
    descriptionEn: "Mastered 100 vocabulary words.",
    iconKey: "library",
    xpReward: 40,
    ageTier: "MIDDLE",
    category: "vocab",
  },
  {
    key: "middle_streak_master_7",
    nameAr: "ملك السلسلة",
    nameEn: "Streak Master 7",
    descriptionAr: "تواصلت ٧ أيام متتالية.",
    descriptionEn: "7 days in a row.",
    iconKey: "flame",
    xpReward: 30,
    ageTier: "MIDDLE",
    category: "streak",
  },
  {
    key: "middle_speaker",
    nameAr: "متحدث الفصل",
    nameEn: "Class Speaker",
    descriptionAr: "حضرت ٣ جلسات محادثة.",
    descriptionEn: "Attended 3 speaking sessions.",
    iconKey: "mic",
    xpReward: 35,
    ageTier: "MIDDLE",
    category: "skill",
  },
  {
    key: "middle_reader",
    nameAr: "قارئ نهم",
    nameEn: "Avid Reader",
    descriptionAr: "قرأت ٢٠ مقالًا.",
    descriptionEn: "Read 20 articles.",
    iconKey: "book-open",
    xpReward: 30,
    ageTier: "MIDDLE",
    category: "library",
  },
  {
    key: "middle_test_ace",
    nameAr: "نجم الاختبارات",
    nameEn: "Test Ace",
    descriptionAr: "حصلت على ٩٠٪+ في ٣ اختبارات.",
    descriptionEn: "Scored 90%+ on 3 exams.",
    iconKey: "award",
    xpReward: 45,
    ageTier: "MIDDLE",
    category: "performance",
  },

  // HIGH (5)
  {
    key: "high_ielts_ready",
    nameAr: "جاهز لأيلتس",
    nameEn: "IELTS Ready",
    descriptionAr: "حصلت على ٧+ في اختبار تجريبي.",
    descriptionEn: "Scored 7+ on a mock IELTS.",
    iconKey: "award",
    xpReward: 100,
    ageTier: "HIGH",
    category: "exam",
  },
  {
    key: "high_perfect_score",
    nameAr: "علامة كاملة",
    nameEn: "Perfect Score",
    descriptionAr: "حصلت على ١٠٠٪ في اختبار رسمي.",
    descriptionEn: "Got 100% on a major exam.",
    iconKey: "trophy",
    xpReward: 75,
    ageTier: "HIGH",
    category: "performance",
  },
  {
    key: "high_mock_master",
    nameAr: "محترف الاختبارات التجريبية",
    nameEn: "Mock Exam Master",
    descriptionAr: "أكملت ٥ اختبارات تجريبية كاملة.",
    descriptionEn: "Completed 5 full mock exams.",
    iconKey: "clipboard-check",
    xpReward: 60,
    ageTier: "HIGH",
    category: "exam",
  },
  {
    key: "high_essayist",
    nameAr: "كاتب مقالات",
    nameEn: "Essayist",
    descriptionAr: "كتبت ١٠ مقالات تجريبية.",
    descriptionEn: "Wrote 10 practice essays.",
    iconKey: "pen",
    xpReward: 50,
    ageTier: "HIGH",
    category: "writing",
  },
  {
    key: "high_step_champion",
    nameAr: "بطل ستيب",
    nameEn: "STEP Champion",
    descriptionAr: "حصلت على ١١٠+ في ستيب.",
    descriptionEn: "Scored 110+ on STEP.",
    iconKey: "crown",
    xpReward: 100,
    ageTier: "HIGH",
    category: "step",
  },
];

async function main() {
  console.log(`Seeding ${ACHIEVEMENTS.length} achievements...`);
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      create: a,
      update: {
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        descriptionAr: a.descriptionAr,
        descriptionEn: a.descriptionEn,
        iconKey: a.iconKey,
        xpReward: a.xpReward,
        ageTier: a.ageTier,
        category: a.category,
        isActive: true,
      },
    });
    console.log(`  ✓ ${a.key}`);
  }
  console.log("✅ Achievements seeded.");
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
