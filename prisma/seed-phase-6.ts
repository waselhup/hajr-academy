/**
 * Phase 6 seed — English Lab exercises + STEP Test Bank.
 * Run: npx tsx prisma/seed-phase-6.ts
 *
 * Content is realistic ESL / Saudi-STEP style. Audio URLs are placeholders
 * (real recordings/TTS added later); structure is production-shaped.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLACEHOLDER_AUDIO = "https://placeholder.hajracademy.com/audio/coming-soon.mp3";

// ──────────────────────────────────────────────────────────────
// ENGLISH LAB EXERCISES
// ──────────────────────────────────────────────────────────────

type ExerciseSeed = {
  type: "SPEAKING" | "LISTENING" | "WRITING" | "READING" | "GRAMMAR" | "VOCABULARY";
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  estimatedMinutes: number;
  pointsValue: number;
  tags: string[];
  content: unknown;
};

const speakingExercises: ExerciseSeed[] = [
  {
    type: "SPEAKING", level: "A1",
    title: "Introduce Yourself", titleAr: "عرّف عن نفسك",
    description: "Record a short introduction about who you are.",
    descriptionAr: "سجّل تعريفاً قصيراً عن نفسك.",
    estimatedMinutes: 5, pointsValue: 10, tags: ["beginner", "speaking", "basics"],
    content: {
      prompt: "Introduce yourself. Say your name, where you are from, and one thing you like.",
      promptAr: "عرّف عن نفسك. قل اسمك، من أين أنت، وشيئاً واحداً تحبه.",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "Hello, my name is ... I am from ... I like ...",
      minDurationSec: 15, maxDurationSec: 60,
      scoringCriteria: ["fluency", "pronunciation", "grammar", "vocabulary"],
    },
  },
  {
    type: "SPEAKING", level: "A2",
    title: "Describe Your Hometown", titleAr: "صف مدينتك",
    description: "Talk about the city or town where you live.",
    descriptionAr: "تحدث عن المدينة التي تعيش فيها.",
    estimatedMinutes: 6, pointsValue: 12, tags: ["speaking", "description"],
    content: {
      prompt: "Describe your hometown. What is it like? What can people do there?",
      promptAr: "صف مدينتك. كيف هي؟ ماذا يمكن للناس أن يفعلوا هناك؟",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "My hometown is ... It is famous for ... People can ...",
      minDurationSec: 30, maxDurationSec: 90,
      scoringCriteria: ["fluency", "pronunciation", "grammar", "vocabulary"],
    },
  },
  {
    type: "SPEAKING", level: "A2",
    title: "Order Food at a Restaurant", titleAr: "اطلب طعاماً في مطعم",
    description: "Practice a common restaurant conversation.",
    descriptionAr: "تدرب على محادثة شائعة في مطعم.",
    estimatedMinutes: 5, pointsValue: 12, tags: ["speaking", "everyday", "roleplay"],
    content: {
      prompt: "You are at a restaurant. Order a starter, a main dish, and a drink. Be polite.",
      promptAr: "أنت في مطعم. اطلب مقبلات وطبقاً رئيسياً ومشروباً. كن مهذباً.",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "Good evening. Could I have ..., please? I would also like ...",
      minDurationSec: 20, maxDurationSec: 75,
      scoringCriteria: ["fluency", "pronunciation", "vocabulary", "politeness"],
    },
  },
  {
    type: "SPEAKING", level: "B1",
    title: "Talk About Your Weekend Plans", titleAr: "تحدث عن خطط نهاية الأسبوع",
    description: "Describe what you plan to do this weekend.",
    descriptionAr: "صف ما تخطط لفعله نهاية هذا الأسبوع.",
    estimatedMinutes: 6, pointsValue: 14, tags: ["speaking", "future", "intermediate"],
    content: {
      prompt: "Describe your plans for the weekend. Use future forms (will, going to).",
      promptAr: "صف خططك لنهاية الأسبوع. استخدم صيغ المستقبل.",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "This weekend I am going to ... I will probably ...",
      minDurationSec: 40, maxDurationSec: 100,
      scoringCriteria: ["fluency", "pronunciation", "grammar", "vocabulary"],
    },
  },
  {
    type: "SPEAKING", level: "B1",
    title: "Give Directions", titleAr: "أعطِ اتجاهات",
    description: "Explain how to get from one place to another.",
    descriptionAr: "اشرح كيفية الوصول من مكان إلى آخر.",
    estimatedMinutes: 5, pointsValue: 14, tags: ["speaking", "everyday"],
    content: {
      prompt: "A tourist asks how to get to the nearest mall. Give clear directions.",
      promptAr: "سائح يسأل كيف يصل إلى أقرب مركز تسوق. أعطِ اتجاهات واضحة.",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "Go straight, then turn left at ... It is next to ...",
      minDurationSec: 30, maxDurationSec: 90,
      scoringCriteria: ["fluency", "pronunciation", "vocabulary", "clarity"],
    },
  },
  {
    type: "SPEAKING", level: "B2",
    title: "Express and Justify an Opinion", titleAr: "عبّر عن رأيك وبرّره",
    description: "Give your opinion on a topic and support it with reasons.",
    descriptionAr: "أعطِ رأيك في موضوع وادعمه بأسباب.",
    estimatedMinutes: 7, pointsValue: 16, tags: ["speaking", "opinion", "step"],
    content: {
      prompt: "Some people think students should not use phones at school. Do you agree? Give reasons.",
      promptAr: "يعتقد البعض أن الطلاب يجب ألا يستخدموا الهواتف في المدرسة. هل توافق؟ اذكر أسباباً.",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "In my opinion ... There are two main reasons. Firstly ... Secondly ...",
      minDurationSec: 60, maxDurationSec: 120,
      scoringCriteria: ["fluency", "pronunciation", "grammar", "vocabulary", "coherence"],
    },
  },
  {
    type: "SPEAKING", level: "B2",
    title: "Describe a Memorable Experience", titleAr: "صف تجربة لا تُنسى",
    description: "Tell a story about an experience that you remember well.",
    descriptionAr: "احكِ قصة عن تجربة تتذكرها جيداً.",
    estimatedMinutes: 7, pointsValue: 16, tags: ["speaking", "narrative"],
    content: {
      prompt: "Describe a memorable experience from your life. What happened and why was it special?",
      promptAr: "صف تجربة لا تُنسى من حياتك. ماذا حدث ولماذا كانت مميزة؟",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "I will never forget the time when ... It was special because ...",
      minDurationSec: 60, maxDurationSec: 120,
      scoringCriteria: ["fluency", "pronunciation", "grammar", "vocabulary", "coherence"],
    },
  },
  {
    type: "SPEAKING", level: "C1",
    title: "Discuss a Complex Issue", titleAr: "ناقش قضية معقدة",
    description: "Present a balanced discussion of an abstract topic.",
    descriptionAr: "قدّم نقاشاً متوازناً لموضوع تجريدي.",
    estimatedMinutes: 8, pointsValue: 20, tags: ["speaking", "advanced", "academic"],
    content: {
      prompt: "Discuss the advantages and disadvantages of remote work for society. Reach a conclusion.",
      promptAr: "ناقش مزايا وعيوب العمل عن بُعد للمجتمع. توصّل إلى استنتاج.",
      modelAudio: PLACEHOLDER_AUDIO,
      targetText: "On one hand ... On the other hand ... Taking everything into account ...",
      minDurationSec: 90, maxDurationSec: 180,
      scoringCriteria: ["fluency", "pronunciation", "grammar", "vocabulary", "coherence"],
    },
  },
];

const listeningExercises: ExerciseSeed[] = [
  {
    type: "LISTENING", level: "A1",
    title: "At the Coffee Shop", titleAr: "في المقهى",
    description: "Listen to a short order at a coffee shop.",
    descriptionAr: "استمع إلى طلب قصير في مقهى.",
    estimatedMinutes: 5, pointsValue: 10, tags: ["listening", "beginner", "everyday"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Customer: Hi, can I have a small coffee, please? Server: Sure. Anything else? Customer: Yes, one chocolate muffin. Server: That will be twelve riyals.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "What size coffee does the customer want?", options: [{ id: "a", text: "Small" }, { id: "b", text: "Medium" }, { id: "c", text: "Large" }], correct: "a" },
        { id: "q2", text: "What food does the customer order?", options: [{ id: "a", text: "A sandwich" }, { id: "b", text: "A chocolate muffin" }, { id: "c", text: "A cake" }], correct: "b" },
        { id: "q3", text: "How much does it cost?", options: [{ id: "a", text: "Ten riyals" }, { id: "b", text: "Twelve riyals" }, { id: "c", text: "Twenty riyals" }], correct: "b" },
      ],
    },
  },
  {
    type: "LISTENING", level: "A2",
    title: "Asking for the Time", titleAr: "السؤال عن الوقت",
    description: "Listen to people talking about time and schedules.",
    descriptionAr: "استمع إلى أشخاص يتحدثون عن الوقت والمواعيد.",
    estimatedMinutes: 5, pointsValue: 12, tags: ["listening", "everyday"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "A: Excuse me, what time does the library open? B: It opens at eight in the morning. A: And when does it close? B: At ten at night, except on Fridays.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "What time does the library open?", options: [{ id: "a", text: "7 a.m." }, { id: "b", text: "8 a.m." }, { id: "c", text: "9 a.m." }], correct: "b" },
        { id: "q2", text: "What time does it close?", options: [{ id: "a", text: "9 p.m." }, { id: "b", text: "10 p.m." }, { id: "c", text: "11 p.m." }], correct: "b" },
        { id: "q3", text: "Which day has different hours?", options: [{ id: "a", text: "Friday" }, { id: "b", text: "Saturday" }, { id: "c", text: "Sunday" }], correct: "a" },
      ],
    },
  },
  {
    type: "LISTENING", level: "A2",
    title: "A Weather Forecast", titleAr: "نشرة الطقس",
    description: "Listen to a short weather report.",
    descriptionAr: "استمع إلى تقرير قصير عن الطقس.",
    estimatedMinutes: 5, pointsValue: 12, tags: ["listening", "everyday"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Good morning. Today will be hot and sunny in Riyadh, with temperatures around forty degrees. Tomorrow there is a chance of dust in the afternoon. Drivers should be careful.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "What is the weather like today?", options: [{ id: "a", text: "Cold and rainy" }, { id: "b", text: "Hot and sunny" }, { id: "c", text: "Cloudy" }], correct: "b" },
        { id: "q2", text: "What is expected tomorrow afternoon?", options: [{ id: "a", text: "Rain" }, { id: "b", text: "Snow" }, { id: "c", text: "Dust" }], correct: "c" },
        { id: "q3", text: "Who should be careful?", options: [{ id: "a", text: "Drivers" }, { id: "b", text: "Students" }, { id: "c", text: "Pilots" }], correct: "a" },
      ],
    },
  },
  {
    type: "LISTENING", level: "B1",
    title: "Booking a Hotel Room", titleAr: "حجز غرفة فندق",
    description: "Listen to a phone call to a hotel.",
    descriptionAr: "استمع إلى مكالمة هاتفية مع فندق.",
    estimatedMinutes: 6, pointsValue: 14, tags: ["listening", "intermediate", "travel"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Receptionist: Good afternoon, Al-Noor Hotel. Guest: Hello, I would like to book a room for two nights, starting Thursday. Receptionist: Of course. A single or double room? Guest: A double room, please, with breakfast included.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "How many nights does the guest want?", options: [{ id: "a", text: "One" }, { id: "b", text: "Two" }, { id: "c", text: "Three" }], correct: "b" },
        { id: "q2", text: "When does the booking start?", options: [{ id: "a", text: "Wednesday" }, { id: "b", text: "Thursday" }, { id: "c", text: "Friday" }], correct: "b" },
        { id: "q3", text: "What type of room does the guest book?", options: [{ id: "a", text: "Single" }, { id: "b", text: "Double" }, { id: "c", text: "Suite" }], correct: "b" },
      ],
    },
  },
  {
    type: "LISTENING", level: "B1",
    title: "A University Announcement", titleAr: "إعلان جامعي",
    description: "Listen to an announcement for students.",
    descriptionAr: "استمع إلى إعلان موجّه للطلاب.",
    estimatedMinutes: 6, pointsValue: 14, tags: ["listening", "academic"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Attention all students. The final exam timetable is now available on the student portal. Exams will begin next Sunday. Please bring your student ID card. Anyone who arrives more than fifteen minutes late will not be allowed to enter.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "Where can students find the timetable?", options: [{ id: "a", text: "On a noticeboard" }, { id: "b", text: "On the student portal" }, { id: "c", text: "In the library" }], correct: "b" },
        { id: "q2", text: "What must students bring?", options: [{ id: "a", text: "A calculator" }, { id: "b", text: "Their ID card" }, { id: "c", text: "A textbook" }], correct: "b" },
        { id: "q3", text: "What happens if a student is very late?", options: [{ id: "a", text: "They lose marks" }, { id: "b", text: "They cannot enter" }, { id: "c", text: "Nothing" }], correct: "b" },
      ],
    },
  },
  {
    type: "LISTENING", level: "B2",
    title: "A Job Interview", titleAr: "مقابلة عمل",
    description: "Listen to part of a job interview.",
    descriptionAr: "استمع إلى جزء من مقابلة عمل.",
    estimatedMinutes: 7, pointsValue: 16, tags: ["listening", "work"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Interviewer: Can you tell me about your previous experience? Candidate: Certainly. I worked for three years as a marketing assistant, where I managed social media campaigns. I believe my biggest strength is communication, although I am still improving my time management.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "How long did the candidate work as a marketing assistant?", options: [{ id: "a", text: "Two years" }, { id: "b", text: "Three years" }, { id: "c", text: "Five years" }], correct: "b" },
        { id: "q2", text: "What does the candidate say is their biggest strength?", options: [{ id: "a", text: "Communication" }, { id: "b", text: "Time management" }, { id: "c", text: "Leadership" }], correct: "a" },
        { id: "q3", text: "What is the candidate still improving?", options: [{ id: "a", text: "Communication" }, { id: "b", text: "Time management" }, { id: "c", text: "Teamwork" }], correct: "b" },
      ],
    },
  },
  {
    type: "LISTENING", level: "B2",
    title: "A Lecture on the Environment", titleAr: "محاضرة عن البيئة",
    description: "Listen to a short academic lecture extract.",
    descriptionAr: "استمع إلى مقتطف من محاضرة أكاديمية.",
    estimatedMinutes: 7, pointsValue: 16, tags: ["listening", "academic", "step"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Today we will look at water scarcity. Many countries in the region face a shortage of fresh water. One solution is desalination, which removes salt from sea water. However, desalination uses a lot of energy and can be expensive. Researchers are now exploring solar-powered methods.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "What is the main topic of the lecture?", options: [{ id: "a", text: "Air pollution" }, { id: "b", text: "Water scarcity" }, { id: "c", text: "Climate change" }], correct: "b" },
        { id: "q2", text: "What does desalination do?", options: [{ id: "a", text: "Adds minerals to water" }, { id: "b", text: "Removes salt from sea water" }, { id: "c", text: "Cleans rivers" }], correct: "b" },
        { id: "q3", text: "What is one disadvantage of desalination?", options: [{ id: "a", text: "It is slow" }, { id: "b", text: "It uses a lot of energy" }, { id: "c", text: "It is illegal" }], correct: "b" },
      ],
    },
  },
  {
    type: "LISTENING", level: "C1",
    title: "A Debate on Technology", titleAr: "مناظرة حول التكنولوجيا",
    description: "Listen to two speakers debating a topic.",
    descriptionAr: "استمع إلى متحدثَين يتناظران في موضوع.",
    estimatedMinutes: 8, pointsValue: 20, tags: ["listening", "advanced"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Speaker A: I would argue that artificial intelligence will create more jobs than it destroys, because it generates entirely new industries. Speaker B: That is a common claim, but it overlooks the fact that the new jobs often require skills that displaced workers do not have. Retraining takes time and money.",
      playLimit: 1,
      questions: [
        { id: "q1", text: "What is Speaker A's main argument?", options: [{ id: "a", text: "AI will destroy most jobs" }, { id: "b", text: "AI will create more jobs than it destroys" }, { id: "c", text: "AI has no effect on jobs" }], correct: "b" },
        { id: "q2", text: "What problem does Speaker B identify?", options: [{ id: "a", text: "New jobs need different skills" }, { id: "b", text: "AI is too expensive" }, { id: "c", text: "There are no new industries" }], correct: "a" },
        { id: "q3", text: "According to Speaker B, what do displaced workers need?", options: [{ id: "a", text: "More holidays" }, { id: "b", text: "Retraining" }, { id: "c", text: "Higher salaries" }], correct: "b" },
      ],
    },
  },
  {
    type: "LISTENING", level: "A1",
    title: "Family Members", titleAr: "أفراد العائلة",
    description: "Listen to someone describing their family.",
    descriptionAr: "استمع إلى شخص يصف عائلته.",
    estimatedMinutes: 4, pointsValue: 10, tags: ["listening", "beginner"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "This is my family. I have one brother and two sisters. My father is a teacher and my mother is a doctor. We live together in a small house.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "How many brothers does the speaker have?", options: [{ id: "a", text: "One" }, { id: "b", text: "Two" }, { id: "c", text: "Three" }], correct: "a" },
        { id: "q2", text: "What is the father's job?", options: [{ id: "a", text: "A doctor" }, { id: "b", text: "A teacher" }, { id: "c", text: "An engineer" }], correct: "b" },
        { id: "q3", text: "Where does the family live?", options: [{ id: "a", text: "In a big house" }, { id: "b", text: "In a small house" }, { id: "c", text: "In an apartment" }], correct: "b" },
      ],
    },
  },
  {
    type: "LISTENING", level: "B1",
    title: "Planning a Trip", titleAr: "التخطيط لرحلة",
    description: "Listen to friends planning a holiday.",
    descriptionAr: "استمع إلى أصدقاء يخططون لعطلة.",
    estimatedMinutes: 6, pointsValue: 14, tags: ["listening", "travel"],
    content: {
      audioUrl: PLACEHOLDER_AUDIO,
      transcript: "Sara: Where should we go for the holiday? Layla: How about Abha? The weather is cooler there in summer. Sara: Good idea. Should we travel by car or plane? Layla: Let's fly. It is faster and not too expensive this month.",
      playLimit: 2,
      questions: [
        { id: "q1", text: "Where do they decide to go?", options: [{ id: "a", text: "Jeddah" }, { id: "b", text: "Abha" }, { id: "c", text: "Dammam" }], correct: "b" },
        { id: "q2", text: "Why does Layla suggest that place?", options: [{ id: "a", text: "It is cheap" }, { id: "b", text: "The weather is cooler" }, { id: "c", text: "It is close" }], correct: "b" },
        { id: "q3", text: "How will they travel?", options: [{ id: "a", text: "By car" }, { id: "b", text: "By plane" }, { id: "c", text: "By train" }], correct: "b" },
      ],
    },
  },
];

const writingExercises: ExerciseSeed[] = [
  {
    type: "WRITING", level: "A2",
    title: "Write About Your Weekend", titleAr: "اكتب عن نهاية أسبوعك",
    description: "Write a short paragraph about your last weekend.",
    descriptionAr: "اكتب فقرة قصيرة عن نهاية أسبوعك الماضي.",
    estimatedMinutes: 15, pointsValue: 12, tags: ["writing", "beginner"],
    content: {
      prompt: "Write about what you did last weekend. Mention at least three activities.",
      promptAr: "اكتب عمّا فعلته نهاية الأسبوع الماضي. اذكر ثلاثة أنشطة على الأقل.",
      minWords: 50, maxWords: 120,
      rubric: ["task completion", "grammar (past tense)", "vocabulary", "organization"],
    },
  },
  {
    type: "WRITING", level: "A2",
    title: "Describe Your Best Friend", titleAr: "صف صديقك المفضّل",
    description: "Write a description of a person you know well.",
    descriptionAr: "اكتب وصفاً لشخص تعرفه جيداً.",
    estimatedMinutes: 15, pointsValue: 12, tags: ["writing", "description"],
    content: {
      prompt: "Describe your best friend. What do they look like? What is their personality?",
      promptAr: "صف صديقك المفضّل. كيف يبدو؟ ما هي شخصيته؟",
      minWords: 60, maxWords: 130,
      rubric: ["task completion", "grammar", "vocabulary (adjectives)", "organization"],
    },
  },
  {
    type: "WRITING", level: "B1",
    title: "An Email to a Friend", titleAr: "بريد إلكتروني لصديق",
    description: "Write an informal email inviting a friend to an event.",
    descriptionAr: "اكتب بريداً إلكترونياً غير رسمي لدعوة صديق إلى مناسبة.",
    estimatedMinutes: 20, pointsValue: 14, tags: ["writing", "intermediate", "email"],
    content: {
      prompt: "Write an email to a friend inviting them to your birthday. Include the date, place, and what to bring.",
      promptAr: "اكتب بريداً إلكترونياً لصديق تدعوه إلى عيد ميلادك. اذكر التاريخ والمكان وما الذي يجب إحضاره.",
      minWords: 80, maxWords: 150,
      rubric: ["task completion", "register (informal)", "grammar", "vocabulary", "organization"],
    },
  },
  {
    type: "WRITING", level: "B1",
    title: "Describe a Place You Visited", titleAr: "صف مكاناً زرته",
    description: "Write about a place you have been to.",
    descriptionAr: "اكتب عن مكان زرته.",
    estimatedMinutes: 20, pointsValue: 14, tags: ["writing", "narrative"],
    content: {
      prompt: "Describe a place you visited recently. Where was it, what did you see, and how did you feel?",
      promptAr: "صف مكاناً زرته مؤخراً. أين كان، وماذا رأيت، وكيف شعرت؟",
      minWords: 90, maxWords: 170,
      rubric: ["task completion", "grammar (past tense)", "vocabulary", "coherence"],
    },
  },
  {
    type: "WRITING", level: "B2",
    title: "Pros and Cons of Social Media", titleAr: "إيجابيات وسلبيات وسائل التواصل",
    description: "Write a balanced opinion essay.",
    descriptionAr: "اكتب مقالة رأي متوازنة.",
    estimatedMinutes: 30, pointsValue: 18, tags: ["writing", "essay", "step", "opinion"],
    content: {
      prompt: "Some people believe social media brings people together, while others think it isolates them. Discuss both views and give your own opinion.",
      promptAr: "يعتقد البعض أن وسائل التواصل تقرّب الناس، بينما يرى آخرون أنها تعزلهم. ناقش كلا الرأيين وأعطِ رأيك.",
      minWords: 180, maxWords: 280,
      rubric: ["task response", "coherence and cohesion", "vocabulary range", "grammar range and accuracy"],
    },
  },
  {
    type: "WRITING", level: "B2",
    title: "The Importance of Learning English", titleAr: "أهمية تعلم اللغة الإنجليزية",
    description: "Write an argumentative essay.",
    descriptionAr: "اكتب مقالة حجاجية.",
    estimatedMinutes: 30, pointsValue: 18, tags: ["writing", "essay", "step"],
    content: {
      prompt: "Why is learning English important for young people in Saudi Arabia today? Give specific reasons and examples.",
      promptAr: "لماذا يُعدّ تعلم الإنجليزية مهماً للشباب في السعودية اليوم؟ اذكر أسباباً وأمثلة محددة.",
      minWords: 180, maxWords: 280,
      rubric: ["task response", "coherence and cohesion", "vocabulary range", "grammar range and accuracy"],
    },
  },
  {
    type: "WRITING", level: "C1",
    title: "Technology and Education", titleAr: "التكنولوجيا والتعليم",
    description: "Write an advanced discursive essay.",
    descriptionAr: "اكتب مقالة استطرادية متقدمة.",
    estimatedMinutes: 35, pointsValue: 22, tags: ["writing", "essay", "advanced", "academic"],
    content: {
      prompt: "To what extent has technology improved the quality of education? Support your argument with reasoned examples.",
      promptAr: "إلى أي مدى حسّنت التكنولوجيا جودة التعليم؟ ادعم حجتك بأمثلة مُسبّبة.",
      minWords: 220, maxWords: 350,
      rubric: ["task response", "coherence and cohesion", "lexical sophistication", "grammatical range and accuracy"],
    },
  },
  {
    type: "WRITING", level: "A2",
    title: "My Daily Routine", titleAr: "روتيني اليومي",
    description: "Write about a typical day in your life.",
    descriptionAr: "اكتب عن يوم عادي في حياتك.",
    estimatedMinutes: 15, pointsValue: 12, tags: ["writing", "beginner", "everyday"],
    content: {
      prompt: "Describe your daily routine. What do you do in the morning, afternoon, and evening?",
      promptAr: "صف روتينك اليومي. ماذا تفعل في الصباح وبعد الظهر والمساء؟",
      minWords: 60, maxWords: 130,
      rubric: ["task completion", "grammar (present simple)", "vocabulary (time)", "organization"],
    },
  },
];

const readingPassages: ExerciseSeed[] = [
  {
    type: "READING", level: "B1",
    title: "Saudi Vision 2030", titleAr: "رؤية السعودية 2030",
    description: "Read about Saudi Arabia's national transformation plan.",
    descriptionAr: "اقرأ عن خطة التحول الوطني للسعودية.",
    estimatedMinutes: 12, pointsValue: 16, tags: ["reading", "step", "saudi"],
    content: {
      text: "Saudi Arabia's Vision 2030 is a strategic framework launched in 2016. Its main goal is to reduce the country's dependence on oil, diversify the economy, and develop public service sectors such as health, education, and tourism. The plan sets ambitious targets. For example, it aims to increase the private sector's contribution to the economy and to create thousands of new jobs for Saudi citizens. Vision 2030 also focuses on improving quality of life. New entertainment venues, sports facilities, and cultural events have been introduced across the kingdom. Tourism is another key area: the country has opened its doors to international visitors and is developing major projects on the Red Sea coast. Many experts believe that the success of Vision 2030 depends on education and on preparing young people with the skills the modern economy needs.",
      questions: [
        { id: "q1", text: "When was Vision 2030 launched?", options: [{ id: "a", text: "2014" }, { id: "b", text: "2016" }, { id: "c", text: "2018" }, { id: "d", text: "2020" }], correct: "b" },
        { id: "q2", text: "What is the main goal of Vision 2030?", options: [{ id: "a", text: "To increase oil production" }, { id: "b", text: "To reduce dependence on oil and diversify the economy" }, { id: "c", text: "To build more oil refineries" }, { id: "d", text: "To stop tourism" }], correct: "b" },
        { id: "q3", text: "Which sector is NOT mentioned as being developed?", options: [{ id: "a", text: "Health" }, { id: "b", text: "Education" }, { id: "c", text: "Agriculture" }, { id: "d", text: "Tourism" }], correct: "c" },
        { id: "q4", text: "According to the passage, what are major Red Sea projects related to?", options: [{ id: "a", text: "Oil drilling" }, { id: "b", text: "Tourism" }, { id: "c", text: "Fishing" }, { id: "d", text: "Farming" }], correct: "b" },
        { id: "q5", text: "What do many experts say the success of Vision 2030 depends on?", options: [{ id: "a", text: "Oil prices" }, { id: "b", text: "Education and skills" }, { id: "c", text: "The weather" }, { id: "d", text: "Foreign loans" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "A2",
    title: "Effective Study Tips", titleAr: "نصائح فعّالة للمذاكرة",
    description: "Read about ways to study more effectively.",
    descriptionAr: "اقرأ عن طرق المذاكرة بفعّالية أكبر.",
    estimatedMinutes: 10, pointsValue: 14, tags: ["reading", "study-skills"],
    content: {
      text: "Studying well is a skill that anyone can learn. The first tip is to make a plan. Decide what you will study and when. A clear timetable helps you avoid wasting time. The second tip is to find a quiet place. It is difficult to concentrate when there is a lot of noise. Turn off your phone or put it in another room. The third tip is to take short breaks. After studying for about forty minutes, rest for five or ten minutes. This helps your brain stay fresh. Finally, do not study only the night before a test. It is much better to review a little every day. Students who follow these simple tips usually feel less stressed and remember more information.",
      questions: [
        { id: "q1", text: "What is the first study tip?", options: [{ id: "a", text: "Make a plan" }, { id: "b", text: "Sleep more" }, { id: "c", text: "Study with friends" }, { id: "d", text: "Use a computer" }], correct: "a" },
        { id: "q2", text: "Why should you find a quiet place?", options: [{ id: "a", text: "It is cheaper" }, { id: "b", text: "Noise makes it hard to concentrate" }, { id: "c", text: "It is more comfortable" }, { id: "d", text: "Teachers prefer it" }], correct: "b" },
        { id: "q3", text: "How long should a study session be before a break?", options: [{ id: "a", text: "About ten minutes" }, { id: "b", text: "About forty minutes" }, { id: "c", text: "About two hours" }, { id: "d", text: "All day" }], correct: "b" },
        { id: "q4", text: "What does the passage say about studying the night before a test?", options: [{ id: "a", text: "It is the best method" }, { id: "b", text: "It is not as good as daily review" }, { id: "c", text: "It is impossible" }, { id: "d", text: "It is required" }], correct: "b" },
        { id: "q5", text: "How do students who follow these tips usually feel?", options: [{ id: "a", text: "More stressed" }, { id: "b", text: "Less stressed" }, { id: "c", text: "Bored" }, { id: "d", text: "Tired" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "B1",
    title: "The Benefits of Exercise", titleAr: "فوائد الرياضة",
    description: "Read about why physical activity matters.",
    descriptionAr: "اقرأ عن أهمية النشاط البدني.",
    estimatedMinutes: 11, pointsValue: 16, tags: ["reading", "health"],
    content: {
      text: "Regular exercise is one of the most important things people can do for their health. Many studies show that physical activity reduces the risk of serious illnesses such as heart disease and diabetes. Exercise is also good for the mind. When we are active, our bodies release chemicals that improve our mood and reduce stress. People who exercise often report that they sleep better and feel more energetic during the day. The good news is that you do not need to spend hours at a gym. Experts recommend at least thirty minutes of moderate activity, such as fast walking, on most days of the week. Simple changes can also help: taking the stairs instead of the lift, or walking to nearby shops instead of driving. The key is to choose an activity you enjoy, because you are more likely to continue doing it.",
      questions: [
        { id: "q1", text: "According to the passage, what does exercise reduce the risk of?", options: [{ id: "a", text: "Heart disease and diabetes" }, { id: "b", text: "Headaches only" }, { id: "c", text: "Eye problems" }, { id: "d", text: "Nothing" }], correct: "a" },
        { id: "q2", text: "How does exercise affect the mind?", options: [{ id: "a", text: "It has no effect" }, { id: "b", text: "It improves mood and reduces stress" }, { id: "c", text: "It causes stress" }, { id: "d", text: "It makes people sleepy" }], correct: "b" },
        { id: "q3", text: "How much moderate activity do experts recommend?", options: [{ id: "a", text: "Ten minutes a week" }, { id: "b", text: "Thirty minutes on most days" }, { id: "c", text: "Three hours a day" }, { id: "d", text: "Only on weekends" }], correct: "b" },
        { id: "q4", text: "Which is given as an example of a simple change?", options: [{ id: "a", text: "Taking the stairs" }, { id: "b", text: "Sleeping more" }, { id: "c", text: "Eating less" }, { id: "d", text: "Joining a team" }], correct: "a" },
        { id: "q5", text: "Why should you choose an activity you enjoy?", options: [{ id: "a", text: "It is cheaper" }, { id: "b", text: "You are more likely to continue it" }, { id: "c", text: "It is faster" }, { id: "d", text: "Doctors require it" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "B2",
    title: "Artificial Intelligence in Daily Life", titleAr: "الذكاء الاصطناعي في الحياة اليومية",
    description: "Read about how AI is used around us.",
    descriptionAr: "اقرأ عن كيفية استخدام الذكاء الاصطناعي حولنا.",
    estimatedMinutes: 13, pointsValue: 18, tags: ["reading", "step", "technology"],
    content: {
      text: "Artificial intelligence, or AI, has quietly become part of everyday life. When you receive a film recommendation from a streaming service, or when your email automatically sorts messages into folders, AI is at work. These systems learn from large amounts of data and improve their predictions over time. One of the most visible uses of AI is in smartphones. Voice assistants can answer questions, set reminders, and translate languages almost instantly. In healthcare, AI helps doctors analyse medical images and identify diseases earlier than before. However, the rise of AI also raises important questions. Some people worry about privacy, because AI systems often depend on personal data. Others are concerned that automation may replace certain jobs. Most experts agree that AI is a powerful tool, but that it must be developed responsibly. The challenge for society is to enjoy the benefits of AI while managing its risks carefully.",
      questions: [
        { id: "q1", text: "What is given as an everyday example of AI?", options: [{ id: "a", text: "Film recommendations" }, { id: "b", text: "Paper newspapers" }, { id: "c", text: "Hand-written letters" }, { id: "d", text: "Mechanical clocks" }], correct: "a" },
        { id: "q2", text: "How do AI systems improve over time?", options: [{ id: "a", text: "They are repaired by hand" }, { id: "b", text: "They learn from large amounts of data" }, { id: "c", text: "They do not improve" }, { id: "d", text: "They are replaced every year" }], correct: "b" },
        { id: "q3", text: "According to the passage, how does AI help in healthcare?", options: [{ id: "a", text: "It performs surgery alone" }, { id: "b", text: "It helps analyse medical images" }, { id: "c", text: "It replaces all doctors" }, { id: "d", text: "It has no role in healthcare" }], correct: "b" },
        { id: "q4", text: "What is one concern mentioned about AI?", options: [{ id: "a", text: "It is too slow" }, { id: "b", text: "Privacy and personal data" }, { id: "c", text: "It uses too much paper" }, { id: "d", text: "It cannot translate" }], correct: "b" },
        { id: "q5", text: "What do most experts agree about AI?", options: [{ id: "a", text: "It should be banned" }, { id: "b", text: "It must be developed responsibly" }, { id: "c", text: "It is useless" }, { id: "d", text: "It is only for scientists" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "A2",
    title: "Healthy Eating Habits", titleAr: "عادات الأكل الصحي",
    description: "Read about making better food choices.",
    descriptionAr: "اقرأ عن اتخاذ خيارات غذائية أفضل.",
    estimatedMinutes: 10, pointsValue: 14, tags: ["reading", "health"],
    content: {
      text: "Eating healthy food is important for everyone. A balanced diet gives the body the energy and nutrients it needs to grow and stay strong. Fruits and vegetables are an important part of a healthy diet. They contain vitamins that protect us from illness. Doctors say we should eat several portions of fruit and vegetables every day. It is also important to drink enough water. Many people drink sugary drinks, but water is a much better choice. Sugary drinks contain a lot of calories and can be bad for the teeth. Another good habit is to eat breakfast. Breakfast gives us energy for the morning and helps us concentrate at school or work. Finally, it is fine to enjoy sweets sometimes, but only in small amounts. Healthy eating is about balance, not about stopping all the food you like.",
      questions: [
        { id: "q1", text: "Why are fruits and vegetables important?", options: [{ id: "a", text: "They contain vitamins" }, { id: "b", text: "They are cheap" }, { id: "c", text: "They taste sweet" }, { id: "d", text: "They are easy to cook" }], correct: "a" },
        { id: "q2", text: "What should we drink instead of sugary drinks?", options: [{ id: "a", text: "Coffee" }, { id: "b", text: "Water" }, { id: "c", text: "Juice" }, { id: "d", text: "Milkshakes" }], correct: "b" },
        { id: "q3", text: "Why is breakfast a good habit?", options: [{ id: "a", text: "It is the cheapest meal" }, { id: "b", text: "It gives energy and helps concentration" }, { id: "c", text: "It is quick to prepare" }, { id: "d", text: "It is the largest meal" }], correct: "b" },
        { id: "q4", text: "What does the passage say about sweets?", options: [{ id: "a", text: "Never eat them" }, { id: "b", text: "Eat them in small amounts" }, { id: "c", text: "Eat them every meal" }, { id: "d", text: "They are healthy" }], correct: "b" },
        { id: "q5", text: "What is healthy eating mainly about?", options: [{ id: "a", text: "Balance" }, { id: "b", text: "Stopping all favourite food" }, { id: "c", text: "Eating only fruit" }, { id: "d", text: "Eating quickly" }], correct: "a" },
      ],
    },
  },
  {
    type: "READING", level: "B2",
    title: "The History of Coffee", titleAr: "تاريخ القهوة",
    description: "Read about how coffee spread around the world.",
    descriptionAr: "اقرأ عن كيفية انتشار القهوة حول العالم.",
    estimatedMinutes: 12, pointsValue: 18, tags: ["reading", "culture"],
    content: {
      text: "Coffee is one of the most popular drinks in the world, but its history is long and interesting. According to a well-known legend, coffee was discovered in Ethiopia, where a shepherd noticed that his goats became very lively after eating the red berries of a certain plant. From Ethiopia, coffee travelled to the Arabian Peninsula. By the fifteenth century, coffee was being grown in Yemen, and the port city of Mocha became famous for trading it. Coffee houses soon appeared in cities across the region. These places were not only for drinking coffee; they were also centres for conversation, music, and the exchange of news and ideas. Later, European travellers brought coffee back to their own countries, and its popularity spread quickly. Today, coffee is grown in many tropical regions and is enjoyed by millions of people every day. For many cultures, offering coffee to a guest remains an important sign of hospitality and respect.",
      questions: [
        { id: "q1", text: "Where, according to legend, was coffee discovered?", options: [{ id: "a", text: "Yemen" }, { id: "b", text: "Ethiopia" }, { id: "c", text: "Europe" }, { id: "d", text: "Brazil" }], correct: "b" },
        { id: "q2", text: "What did the shepherd notice?", options: [{ id: "a", text: "His goats became lively after eating red berries" }, { id: "b", text: "His goats stopped eating" }, { id: "c", text: "His goats slept all day" }, { id: "d", text: "His goats ran away" }], correct: "a" },
        { id: "q3", text: "Which city became famous for trading coffee?", options: [{ id: "a", text: "Mocha" }, { id: "b", text: "Cairo" }, { id: "c", text: "Rome" }, { id: "d", text: "Paris" }], correct: "a" },
        { id: "q4", text: "What were coffee houses also used for?", options: [{ id: "a", text: "Only sleeping" }, { id: "b", text: "Conversation and exchanging ideas" }, { id: "c", text: "Storing goods" }, { id: "d", text: "Growing plants" }], correct: "b" },
        { id: "q5", text: "What does offering coffee to a guest still represent in many cultures?", options: [{ id: "a", text: "A business deal" }, { id: "b", text: "Hospitality and respect" }, { id: "c", text: "A warning" }, { id: "d", text: "Bad luck" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "B1",
    title: "Working from Home", titleAr: "العمل من المنزل",
    description: "Read about the advantages and challenges of remote work.",
    descriptionAr: "اقرأ عن مزايا وتحديات العمل عن بُعد.",
    estimatedMinutes: 11, pointsValue: 16, tags: ["reading", "work"],
    content: {
      text: "In recent years, working from home has become much more common. Improvements in technology mean that many employees can now do their jobs from anywhere with an internet connection. This way of working has several advantages. Employees save time and money because they do not need to travel to an office every day. They also have more flexibility, which can make it easier to balance work and family life. However, working from home is not without challenges. Some people find it difficult to concentrate when family members or housework distract them. Others miss the social contact of an office, and may feel lonely or disconnected from their colleagues. Communication can also be harder, because quick conversations are replaced by emails and video calls. Many companies now use a 'hybrid' model, in which employees work from home for part of the week and come to the office for the rest. This approach tries to combine the benefits of both ways of working.",
      questions: [
        { id: "q1", text: "Why has working from home become more common?", options: [{ id: "a", text: "Offices have closed" }, { id: "b", text: "Improvements in technology" }, { id: "c", text: "People dislike travel" }, { id: "d", text: "It is a new law" }], correct: "b" },
        { id: "q2", text: "What is one advantage of working from home?", options: [{ id: "a", text: "More meetings" }, { id: "b", text: "Saving time and money" }, { id: "c", text: "Longer hours" }, { id: "d", text: "Less flexibility" }], correct: "b" },
        { id: "q3", text: "What problem might people face when working from home?", options: [{ id: "a", text: "Too much travel" }, { id: "b", text: "Difficulty concentrating" }, { id: "c", text: "Higher salaries" }, { id: "d", text: "Too many colleagues" }], correct: "b" },
        { id: "q4", text: "What replaces quick office conversations?", options: [{ id: "a", text: "Emails and video calls" }, { id: "b", text: "Letters" }, { id: "c", text: "Nothing" }, { id: "d", text: "Newspapers" }], correct: "a" },
        { id: "q5", text: "What is a 'hybrid' model?", options: [{ id: "a", text: "Working only at home" }, { id: "b", text: "Working part of the week at home and part at the office" }, { id: "c", text: "Working only at the office" }, { id: "d", text: "Not working at all" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "C1",
    title: "Renewable Energy and the Future", titleAr: "الطاقة المتجددة والمستقبل",
    description: "Read an advanced passage on sustainable energy.",
    descriptionAr: "اقرأ نصاً متقدماً عن الطاقة المستدامة.",
    estimatedMinutes: 14, pointsValue: 22, tags: ["reading", "advanced", "step", "environment"],
    content: {
      text: "The transition to renewable energy is widely regarded as one of the defining challenges of the twenty-first century. As concerns about climate change intensify, governments and companies are investing heavily in sources such as solar and wind power. The appeal of these sources is clear: unlike fossil fuels, they do not release greenhouse gases when generating electricity, and they will not run out. Saudi Arabia, a country traditionally associated with oil, has announced ambitious plans to expand its solar capacity, taking advantage of its abundant sunshine. Nevertheless, the path to a renewable future is not without obstacles. One significant difficulty is intermittency: the sun does not always shine and the wind does not always blow. To address this, engineers are developing better battery technology that can store surplus energy for later use. Another challenge is cost, although the price of renewable technology has fallen dramatically over the past decade. Critics also point out that building large solar or wind farms requires considerable land and resources. Despite these concerns, the overall trend is unmistakable. Renewable energy is becoming cheaper, more efficient, and more central to the global economy, and most analysts believe this shift will continue to accelerate.",
      questions: [
        { id: "q1", text: "Why are solar and wind power described as appealing?", options: [{ id: "a", text: "They are easy to hide" }, { id: "b", text: "They do not release greenhouse gases and will not run out" }, { id: "c", text: "They are completely free" }, { id: "d", text: "They require no technology" }], correct: "b" },
        { id: "q2", text: "What advantage does Saudi Arabia have for solar power?", options: [{ id: "a", text: "Abundant sunshine" }, { id: "b", text: "Cold weather" }, { id: "c", text: "Many rivers" }, { id: "d", text: "Strong winds only" }], correct: "a" },
        { id: "q3", text: "What does 'intermittency' refer to in the passage?", options: [{ id: "a", text: "The high cost of oil" }, { id: "b", text: "The sun and wind not always being available" }, { id: "c", text: "A type of battery" }, { id: "d", text: "A government policy" }], correct: "b" },
        { id: "q4", text: "How are engineers trying to solve the problem of intermittency?", options: [{ id: "a", text: "By burning more fossil fuels" }, { id: "b", text: "By developing better battery technology" }, { id: "c", text: "By reducing sunshine" }, { id: "d", text: "By stopping renewable projects" }], correct: "b" },
        { id: "q5", text: "What is the overall trend described in the passage?", options: [{ id: "a", text: "Renewable energy is disappearing" }, { id: "b", text: "Renewable energy is becoming cheaper and more central" }, { id: "c", text: "Fossil fuels are the only future" }, { id: "d", text: "Energy use is falling everywhere" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "A2",
    title: "A New Public Library", titleAr: "مكتبة عامة جديدة",
    description: "Read a short article about a community library.",
    descriptionAr: "اقرأ مقالاً قصيراً عن مكتبة مجتمعية.",
    estimatedMinutes: 9, pointsValue: 14, tags: ["reading", "community"],
    content: {
      text: "A new public library opened last month in the centre of the city. The library is large and modern, with space for thousands of books. It also has a special section for children, with colourful chairs and picture books. On the second floor, there is a quiet study area where students can work. The library is open every day except Friday morning. Membership is free for everyone who lives in the city. Members can borrow up to five books at a time and keep them for three weeks. The library also offers free internet and computers. Every Saturday, there is a story time for young children, and once a month the library holds a book club for adults. The manager says that more than two thousand people have already become members. She hopes the library will become an important place for learning and for the whole community.",
      questions: [
        { id: "q1", text: "When did the library open?", options: [{ id: "a", text: "Last week" }, { id: "b", text: "Last month" }, { id: "c", text: "Last year" }, { id: "d", text: "Yesterday" }], correct: "b" },
        { id: "q2", text: "What is on the second floor?", options: [{ id: "a", text: "A children's section" }, { id: "b", text: "A quiet study area" }, { id: "c", text: "A cafe" }, { id: "d", text: "An office" }], correct: "b" },
        { id: "q3", text: "How many books can a member borrow at one time?", options: [{ id: "a", text: "Three" }, { id: "b", text: "Five" }, { id: "c", text: "Ten" }, { id: "d", text: "Twenty" }], correct: "b" },
        { id: "q4", text: "What happens every Saturday?", options: [{ id: "a", text: "A book club for adults" }, { id: "b", text: "A story time for children" }, { id: "c", text: "The library closes" }, { id: "d", text: "A film show" }], correct: "b" },
        { id: "q5", text: "How many people have become members so far?", options: [{ id: "a", text: "More than two hundred" }, { id: "b", text: "More than two thousand" }, { id: "c", text: "More than twenty" }, { id: "d", text: "Exactly one thousand" }], correct: "b" },
      ],
    },
  },
  {
    type: "READING", level: "B1",
    title: "The Importance of Sleep", titleAr: "أهمية النوم",
    description: "Read about why sleep matters for health.",
    descriptionAr: "اقرأ عن أهمية النوم للصحة.",
    estimatedMinutes: 11, pointsValue: 16, tags: ["reading", "health"],
    content: {
      text: "Sleep is something we all need, but many people do not get enough of it. Scientists explain that sleep is not simply a time when the body does nothing. In fact, the brain is very active during sleep. It processes information from the day, stores memories, and prepares us for learning the next day. This is why students who sleep well often perform better in exams than students who study late into the night. Sleep also affects our physical health. During sleep, the body repairs muscles and strengthens the immune system, which helps us fight illness. People who regularly sleep too little have a higher risk of health problems. Most adults need between seven and nine hours of sleep each night, while teenagers usually need a little more. Experts suggest some simple ways to sleep better: going to bed at the same time every night, avoiding screens before bed, and keeping the bedroom dark and cool. Good sleep is not a luxury; it is an essential part of a healthy life.",
      questions: [
        { id: "q1", text: "What does the brain do during sleep?", options: [{ id: "a", text: "Nothing at all" }, { id: "b", text: "Processes information and stores memories" }, { id: "c", text: "Stops completely" }, { id: "d", text: "Only dreams" }], correct: "b" },
        { id: "q2", text: "Why do students who sleep well often do better in exams?", options: [{ id: "a", text: "They study less" }, { id: "b", text: "Sleep helps the brain store information" }, { id: "c", text: "They are luckier" }, { id: "d", text: "Teachers help them" }], correct: "b" },
        { id: "q3", text: "What does the body do during sleep for physical health?", options: [{ id: "a", text: "Repairs muscles and strengthens the immune system" }, { id: "b", text: "Loses weight" }, { id: "c", text: "Grows taller only" }, { id: "d", text: "Nothing useful" }], correct: "a" },
        { id: "q4", text: "How many hours of sleep do most adults need?", options: [{ id: "a", text: "Three to four" }, { id: "b", text: "Seven to nine" }, { id: "c", text: "Eleven to twelve" }, { id: "d", text: "Two to three" }], correct: "b" },
        { id: "q5", text: "Which is suggested as a way to sleep better?", options: [{ id: "a", text: "Using screens in bed" }, { id: "b", text: "Avoiding screens before bed" }, { id: "c", text: "Keeping the room bright" }, { id: "d", text: "Sleeping at different times" }], correct: "b" },
      ],
    },
  },
];

const grammarExercises: ExerciseSeed[] = [
  {
    type: "GRAMMAR", level: "A1",
    title: "Present Simple: To Be", titleAr: "المضارع البسيط: فعل الكون",
    description: "Practise am, is, and are.",
    descriptionAr: "تدرب على am و is و are.",
    estimatedMinutes: 8, pointsValue: 10, tags: ["grammar", "beginner", "verb-to-be"],
    content: {
      instructions: "Choose the correct form of the verb 'to be'.",
      instructionsAr: "اختر الصيغة الصحيحة لفعل الكون.",
      items: [
        { id: "g1", text: "I ___ a student.", options: [{ id: "a", text: "am" }, { id: "b", text: "is" }, { id: "c", text: "are" }], correct: "a" },
        { id: "g2", text: "She ___ my sister.", options: [{ id: "a", text: "am" }, { id: "b", text: "is" }, { id: "c", text: "are" }], correct: "b" },
        { id: "g3", text: "They ___ from Riyadh.", options: [{ id: "a", text: "am" }, { id: "b", text: "is" }, { id: "c", text: "are" }], correct: "c" },
        { id: "g4", text: "We ___ happy today.", options: [{ id: "a", text: "am" }, { id: "b", text: "is" }, { id: "c", text: "are" }], correct: "c" },
        { id: "g5", text: "He ___ a good teacher.", options: [{ id: "a", text: "am" }, { id: "b", text: "is" }, { id: "c", text: "are" }], correct: "b" },
        { id: "g6", text: "You ___ very kind.", options: [{ id: "a", text: "am" }, { id: "b", text: "is" }, { id: "c", text: "are" }], correct: "c" },
      ],
    },
  },
  {
    type: "GRAMMAR", level: "A2",
    title: "Articles: A, An, The", titleAr: "أدوات التعريف والتنكير",
    description: "Practise using a, an, and the.",
    descriptionAr: "تدرب على استخدام a و an و the.",
    estimatedMinutes: 8, pointsValue: 12, tags: ["grammar", "articles"],
    content: {
      instructions: "Choose the correct article.",
      instructionsAr: "اختر أداة التعريف الصحيحة.",
      items: [
        { id: "g1", text: "I saw ___ elephant at the zoo.", options: [{ id: "a", text: "a" }, { id: "b", text: "an" }, { id: "c", text: "the" }], correct: "b" },
        { id: "g2", text: "She is ___ best student in the class.", options: [{ id: "a", text: "a" }, { id: "b", text: "an" }, { id: "c", text: "the" }], correct: "c" },
        { id: "g3", text: "He bought ___ new car last week.", options: [{ id: "a", text: "a" }, { id: "b", text: "an" }, { id: "c", text: "the" }], correct: "a" },
        { id: "g4", text: "Can you pass me ___ salt, please?", options: [{ id: "a", text: "a" }, { id: "b", text: "an" }, { id: "c", text: "the" }], correct: "c" },
        { id: "g5", text: "We waited for ___ hour.", options: [{ id: "a", text: "a" }, { id: "b", text: "an" }, { id: "c", text: "the" }], correct: "b" },
        { id: "g6", text: "There is ___ book on the table.", options: [{ id: "a", text: "a" }, { id: "b", text: "an" }, { id: "c", text: "the" }], correct: "a" },
      ],
    },
  },
  {
    type: "GRAMMAR", level: "A2",
    title: "Prepositions of Place", titleAr: "حروف الجر المكانية",
    description: "Practise in, on, under, and between.",
    descriptionAr: "تدرب على in و on و under و between.",
    estimatedMinutes: 8, pointsValue: 12, tags: ["grammar", "prepositions"],
    content: {
      instructions: "Choose the correct preposition.",
      instructionsAr: "اختر حرف الجر الصحيح.",
      items: [
        { id: "g1", text: "The cat is ___ the table.", options: [{ id: "a", text: "under" }, { id: "b", text: "on" }, { id: "c", text: "between" }], correct: "a" },
        { id: "g2", text: "The keys are ___ my bag.", options: [{ id: "a", text: "on" }, { id: "b", text: "in" }, { id: "c", text: "under" }], correct: "b" },
        { id: "g3", text: "The picture is ___ the wall.", options: [{ id: "a", text: "in" }, { id: "b", text: "on" }, { id: "c", text: "between" }], correct: "b" },
        { id: "g4", text: "The bank is ___ the school and the mosque.", options: [{ id: "a", text: "between" }, { id: "b", text: "on" }, { id: "c", text: "in" }], correct: "a" },
        { id: "g5", text: "There is a rug ___ the floor.", options: [{ id: "a", text: "in" }, { id: "b", text: "on" }, { id: "c", text: "under" }], correct: "b" },
        { id: "g6", text: "The shoes are ___ the bed.", options: [{ id: "a", text: "under" }, { id: "b", text: "in" }, { id: "c", text: "between" }], correct: "a" },
      ],
    },
  },
  {
    type: "GRAMMAR", level: "B1",
    title: "Past Simple vs Past Continuous", titleAr: "الماضي البسيط مقابل الماضي المستمر",
    description: "Practise choosing between past tenses.",
    descriptionAr: "تدرب على الاختيار بين أزمنة الماضي.",
    estimatedMinutes: 10, pointsValue: 14, tags: ["grammar", "intermediate", "past-tense"],
    content: {
      instructions: "Choose the correct past form.",
      instructionsAr: "اختر صيغة الماضي الصحيحة.",
      items: [
        { id: "g1", text: "While I ___ dinner, the phone rang.", options: [{ id: "a", text: "cooked" }, { id: "b", text: "was cooking" }, { id: "c", text: "cook" }], correct: "b" },
        { id: "g2", text: "She ___ to the office at eight o'clock.", options: [{ id: "a", text: "arrived" }, { id: "b", text: "was arriving" }, { id: "c", text: "arrive" }], correct: "a" },
        { id: "g3", text: "They ___ football when it started to rain.", options: [{ id: "a", text: "played" }, { id: "b", text: "were playing" }, { id: "c", text: "play" }], correct: "b" },
        { id: "g4", text: "I ___ the news yesterday evening.", options: [{ id: "a", text: "was watching" }, { id: "b", text: "watched" }, { id: "c", text: "watch" }], correct: "b" },
        { id: "g5", text: "What ___ you ___ at ten o'clock last night?", options: [{ id: "a", text: "did / do" }, { id: "b", text: "were / doing" }, { id: "c", text: "do / did" }], correct: "b" },
        { id: "g6", text: "He fell while he ___ down the stairs.", options: [{ id: "a", text: "ran" }, { id: "b", text: "was running" }, { id: "c", text: "runs" }], correct: "b" },
      ],
    },
  },
  {
    type: "GRAMMAR", level: "B1",
    title: "Conditionals: First and Second", titleAr: "الجمل الشرطية: الأولى والثانية",
    description: "Practise real and unreal conditionals.",
    descriptionAr: "تدرب على الشرط الحقيقي وغير الحقيقي.",
    estimatedMinutes: 10, pointsValue: 14, tags: ["grammar", "conditionals", "step"],
    content: {
      instructions: "Choose the correct conditional form.",
      instructionsAr: "اختر صيغة الشرط الصحيحة.",
      items: [
        { id: "g1", text: "If it rains tomorrow, we ___ at home.", options: [{ id: "a", text: "will stay" }, { id: "b", text: "would stay" }, { id: "c", text: "stayed" }], correct: "a" },
        { id: "g2", text: "If I ___ rich, I would travel the world.", options: [{ id: "a", text: "am" }, { id: "b", text: "were" }, { id: "c", text: "will be" }], correct: "b" },
        { id: "g3", text: "She would help you if she ___ time.", options: [{ id: "a", text: "has" }, { id: "b", text: "had" }, { id: "c", text: "will have" }], correct: "b" },
        { id: "g4", text: "If you heat ice, it ___.", options: [{ id: "a", text: "melts" }, { id: "b", text: "would melt" }, { id: "c", text: "melted" }], correct: "a" },
        { id: "g5", text: "If I were you, I ___ that job.", options: [{ id: "a", text: "will take" }, { id: "b", text: "would take" }, { id: "c", text: "take" }], correct: "b" },
        { id: "g6", text: "We will miss the bus if we ___ now.", options: [{ id: "a", text: "don't leave" }, { id: "b", text: "didn't leave" }, { id: "c", text: "wouldn't leave" }], correct: "a" },
      ],
    },
  },
  {
    type: "GRAMMAR", level: "B2",
    title: "The Passive Voice", titleAr: "المبني للمجهول",
    description: "Practise forming passive sentences.",
    descriptionAr: "تدرب على تكوين الجمل المبنية للمجهول.",
    estimatedMinutes: 10, pointsValue: 16, tags: ["grammar", "passive", "step"],
    content: {
      instructions: "Choose the correct passive form.",
      instructionsAr: "اختر الصيغة الصحيحة للمبني للمجهول.",
      items: [
        { id: "g1", text: "The report ___ by the manager yesterday.", options: [{ id: "a", text: "was written" }, { id: "b", text: "wrote" }, { id: "c", text: "is writing" }], correct: "a" },
        { id: "g2", text: "English ___ in many countries.", options: [{ id: "a", text: "speaks" }, { id: "b", text: "is spoken" }, { id: "c", text: "speaking" }], correct: "b" },
        { id: "g3", text: "The new bridge ___ next year.", options: [{ id: "a", text: "will build" }, { id: "b", text: "will be built" }, { id: "c", text: "builds" }], correct: "b" },
        { id: "g4", text: "These cars ___ in Japan.", options: [{ id: "a", text: "are made" }, { id: "b", text: "make" }, { id: "c", text: "made" }], correct: "a" },
        { id: "g5", text: "The window ___ by the strong wind.", options: [{ id: "a", text: "broke" }, { id: "b", text: "was broken" }, { id: "c", text: "is breaking" }], correct: "b" },
        { id: "g6", text: "The results ___ tomorrow morning.", options: [{ id: "a", text: "will be announced" }, { id: "b", text: "will announce" }, { id: "c", text: "announce" }], correct: "a" },
      ],
    },
  },
  {
    type: "GRAMMAR", level: "B2",
    title: "Reported Speech", titleAr: "الكلام المنقول",
    description: "Practise changing direct speech to reported speech.",
    descriptionAr: "تدرب على تحويل الكلام المباشر إلى منقول.",
    estimatedMinutes: 10, pointsValue: 16, tags: ["grammar", "reported-speech", "step"],
    content: {
      instructions: "Choose the correct reported form.",
      instructionsAr: "اختر صيغة الكلام المنقول الصحيحة.",
      items: [
        { id: "g1", text: "\"I am tired,\" she said. -> She said that she ___ tired.", options: [{ id: "a", text: "is" }, { id: "b", text: "was" }, { id: "c", text: "will be" }], correct: "b" },
        { id: "g2", text: "\"We will come,\" they said. -> They said they ___ come.", options: [{ id: "a", text: "will" }, { id: "b", text: "would" }, { id: "c", text: "are" }], correct: "b" },
        { id: "g3", text: "\"I have finished,\" he said. -> He said he ___ finished.", options: [{ id: "a", text: "has" }, { id: "b", text: "had" }, { id: "c", text: "have" }], correct: "b" },
        { id: "g4", text: "\"Do you like tea?\" she asked. -> She asked if I ___ tea.", options: [{ id: "a", text: "like" }, { id: "b", text: "liked" }, { id: "c", text: "will like" }], correct: "b" },
        { id: "g5", text: "\"I can swim,\" the boy said. -> The boy said he ___ swim.", options: [{ id: "a", text: "can" }, { id: "b", text: "could" }, { id: "c", text: "will" }], correct: "b" },
        { id: "g6", text: "\"I am working now,\" she said. -> She said she ___ working then.", options: [{ id: "a", text: "is" }, { id: "b", text: "was" }, { id: "c", text: "will be" }], correct: "b" },
      ],
    },
  },
  {
    type: "GRAMMAR", level: "C1",
    title: "Perfect Tenses in Context", titleAr: "الأزمنة التامة في السياق",
    description: "Practise present perfect, past perfect, and future perfect.",
    descriptionAr: "تدرب على المضارع التام والماضي التام والمستقبل التام.",
    estimatedMinutes: 12, pointsValue: 20, tags: ["grammar", "advanced", "perfect-tenses", "step"],
    content: {
      instructions: "Choose the correct perfect tense.",
      instructionsAr: "اختر الزمن التام الصحيح.",
      items: [
        { id: "g1", text: "By the time the meeting ended, we ___ for three hours.", options: [{ id: "a", text: "had been talking" }, { id: "b", text: "were talking" }, { id: "c", text: "have talked" }, { id: "d", text: "talk" }], correct: "a" },
        { id: "g2", text: "She ___ in this city since 2015.", options: [{ id: "a", text: "has lived" }, { id: "b", text: "lived" }, { id: "c", text: "had lived" }, { id: "d", text: "lives" }], correct: "a" },
        { id: "g3", text: "By next June, I ___ my degree.", options: [{ id: "a", text: "will finish" }, { id: "b", text: "will have finished" }, { id: "c", text: "finish" }, { id: "d", text: "have finished" }], correct: "b" },
        { id: "g4", text: "When we arrived, the film ___ already ___.", options: [{ id: "a", text: "has / started" }, { id: "b", text: "had / started" }, { id: "c", text: "have / started" }, { id: "d", text: "was / starting" }], correct: "b" },
        { id: "g5", text: "I cannot find my phone. I think I ___ it.", options: [{ id: "a", text: "have lost" }, { id: "b", text: "had lost" }, { id: "c", text: "lose" }, { id: "d", text: "was losing" }], correct: "a" },
        { id: "g6", text: "They ___ each other for ten years before they got married.", options: [{ id: "a", text: "have known" }, { id: "b", text: "had known" }, { id: "c", text: "know" }, { id: "d", text: "knew" }], correct: "b" },
      ],
    },
  },
];

const vocabularyExercises: ExerciseSeed[] = [
  {
    type: "VOCABULARY", level: "A1",
    title: "Everyday Objects", titleAr: "الأشياء اليومية",
    description: "Match common objects to their meanings.",
    descriptionAr: "طابق الأشياء الشائعة مع معانيها.",
    estimatedMinutes: 6, pointsValue: 10, tags: ["vocabulary", "beginner"],
    content: {
      instructions: "Choose the word that matches the description.",
      instructionsAr: "اختر الكلمة التي تطابق الوصف.",
      items: [
        { id: "v1", text: "You use this to write.", options: [{ id: "a", text: "pen" }, { id: "b", text: "cup" }, { id: "c", text: "shoe" }], correct: "a" },
        { id: "v2", text: "You drink water from this.", options: [{ id: "a", text: "book" }, { id: "b", text: "glass" }, { id: "c", text: "chair" }], correct: "b" },
        { id: "v3", text: "You sit on this.", options: [{ id: "a", text: "chair" }, { id: "b", text: "pen" }, { id: "c", text: "lamp" }], correct: "a" },
        { id: "v4", text: "You read this.", options: [{ id: "a", text: "spoon" }, { id: "b", text: "book" }, { id: "c", text: "door" }], correct: "b" },
        { id: "v5", text: "You wear these on your feet.", options: [{ id: "a", text: "shoes" }, { id: "b", text: "plates" }, { id: "c", text: "keys" }], correct: "a" },
        { id: "v6", text: "This gives light in a room.", options: [{ id: "a", text: "lamp" }, { id: "b", text: "bag" }, { id: "c", text: "fork" }], correct: "a" },
      ],
    },
  },
  {
    type: "VOCABULARY", level: "A2",
    title: "Synonyms: Common Adjectives", titleAr: "المرادفات: صفات شائعة",
    description: "Find words with similar meanings.",
    descriptionAr: "ابحث عن كلمات بمعانٍ متشابهة.",
    estimatedMinutes: 7, pointsValue: 12, tags: ["vocabulary", "synonyms"],
    content: {
      instructions: "Choose the word closest in meaning.",
      instructionsAr: "اختر الكلمة الأقرب في المعنى.",
      items: [
        { id: "v1", text: "happy", options: [{ id: "a", text: "glad" }, { id: "b", text: "tired" }, { id: "c", text: "angry" }], correct: "a" },
        { id: "v2", text: "big", options: [{ id: "a", text: "small" }, { id: "b", text: "large" }, { id: "c", text: "fast" }], correct: "b" },
        { id: "v3", text: "fast", options: [{ id: "a", text: "slow" }, { id: "b", text: "quick" }, { id: "c", text: "loud" }], correct: "b" },
        { id: "v4", text: "begin", options: [{ id: "a", text: "start" }, { id: "b", text: "finish" }, { id: "c", text: "stop" }], correct: "a" },
        { id: "v5", text: "difficult", options: [{ id: "a", text: "easy" }, { id: "b", text: "hard" }, { id: "c", text: "cheap" }], correct: "b" },
        { id: "v6", text: "beautiful", options: [{ id: "a", text: "ugly" }, { id: "b", text: "pretty" }, { id: "c", text: "empty" }], correct: "b" },
      ],
    },
  },
  {
    type: "VOCABULARY", level: "B1",
    title: "Phrasal Verbs in Context", titleAr: "الأفعال المركبة في السياق",
    description: "Complete sentences with common phrasal verbs.",
    descriptionAr: "أكمل الجمل بأفعال مركبة شائعة.",
    estimatedMinutes: 9, pointsValue: 14, tags: ["vocabulary", "phrasal-verbs", "intermediate"],
    content: {
      instructions: "Choose the correct phrasal verb.",
      instructionsAr: "اختر الفعل المركب الصحيح.",
      items: [
        { id: "v1", text: "Please ___ your shoes before you enter.", options: [{ id: "a", text: "take off" }, { id: "b", text: "look after" }, { id: "c", text: "give up" }], correct: "a" },
        { id: "v2", text: "I need to ___ early tomorrow for my flight.", options: [{ id: "a", text: "get up" }, { id: "b", text: "turn down" }, { id: "c", text: "find out" }], correct: "a" },
        { id: "v3", text: "Don't ___ now; you are almost finished.", options: [{ id: "a", text: "give up" }, { id: "b", text: "put on" }, { id: "c", text: "look up" }], correct: "a" },
        { id: "v4", text: "Can you ___ the children while I am out?", options: [{ id: "a", text: "look after" }, { id: "b", text: "take off" }, { id: "c", text: "run out" }], correct: "a" },
        { id: "v5", text: "I will ___ the meaning of this word in a dictionary.", options: [{ id: "a", text: "look up" }, { id: "b", text: "get on" }, { id: "c", text: "turn off" }], correct: "a" },
        { id: "v6", text: "We ___ of milk, so I went to the shop.", options: [{ id: "a", text: "ran out" }, { id: "b", text: "put off" }, { id: "c", text: "got up" }], correct: "a" },
      ],
    },
  },
  {
    type: "VOCABULARY", level: "B2",
    title: "Academic Word Choice", titleAr: "اختيار المفردات الأكاديمية",
    description: "Choose precise academic vocabulary.",
    descriptionAr: "اختر مفردات أكاديمية دقيقة.",
    estimatedMinutes: 10, pointsValue: 16, tags: ["vocabulary", "academic", "step"],
    content: {
      instructions: "Choose the most appropriate academic word.",
      instructionsAr: "اختر الكلمة الأكاديمية الأنسب.",
      items: [
        { id: "v1", text: "The research aims to ___ the causes of the problem.", options: [{ id: "a", text: "investigate" }, { id: "b", text: "look" }, { id: "c", text: "see" }], correct: "a" },
        { id: "v2", text: "The two results were almost ___.", options: [{ id: "a", text: "same-ish" }, { id: "b", text: "identical" }, { id: "c", text: "okay" }], correct: "b" },
        { id: "v3", text: "These factors had a significant ___ on the outcome.", options: [{ id: "a", text: "impact" }, { id: "b", text: "thing" }, { id: "c", text: "bit" }], correct: "a" },
        { id: "v4", text: "The data ___ a clear upward trend.", options: [{ id: "a", text: "shows" }, { id: "b", text: "demonstrates" }, { id: "c", text: "tells" }], correct: "b" },
        { id: "v5", text: "Further study is required to ___ these findings.", options: [{ id: "a", text: "confirm" }, { id: "b", text: "make sure-ish" }, { id: "c", text: "check out" }], correct: "a" },
        { id: "v6", text: "The author ___ that more funding is needed.", options: [{ id: "a", text: "argues" }, { id: "b", text: "says a bit" }, { id: "c", text: "talks" }], correct: "a" },
      ],
    },
  },
  {
    type: "VOCABULARY", level: "A2",
    title: "Opposites (Antonyms)", titleAr: "الأضداد",
    description: "Find words with opposite meanings.",
    descriptionAr: "ابحث عن كلمات بمعانٍ متضادة.",
    estimatedMinutes: 7, pointsValue: 12, tags: ["vocabulary", "antonyms"],
    content: {
      instructions: "Choose the opposite of the given word.",
      instructionsAr: "اختر عكس الكلمة المعطاة.",
      items: [
        { id: "v1", text: "hot", options: [{ id: "a", text: "cold" }, { id: "b", text: "warm" }, { id: "c", text: "wet" }], correct: "a" },
        { id: "v2", text: "open", options: [{ id: "a", text: "closed" }, { id: "b", text: "wide" }, { id: "c", text: "new" }], correct: "a" },
        { id: "v3", text: "old", options: [{ id: "a", text: "young" }, { id: "b", text: "tall" }, { id: "c", text: "long" }], correct: "a" },
        { id: "v4", text: "expensive", options: [{ id: "a", text: "cheap" }, { id: "b", text: "rich" }, { id: "c", text: "high" }], correct: "a" },
        { id: "v5", text: "empty", options: [{ id: "a", text: "full" }, { id: "b", text: "light" }, { id: "c", text: "clean" }], correct: "a" },
        { id: "v6", text: "early", options: [{ id: "a", text: "late" }, { id: "b", text: "fast" }, { id: "c", text: "soon" }], correct: "a" },
      ],
    },
  },
  {
    type: "VOCABULARY", level: "B1",
    title: "Word Formation: Nouns and Adjectives", titleAr: "اشتقاق الكلمات: الأسماء والصفات",
    description: "Choose the correct word form.",
    descriptionAr: "اختر الصيغة الصحيحة للكلمة.",
    estimatedMinutes: 9, pointsValue: 14, tags: ["vocabulary", "word-formation", "step"],
    content: {
      instructions: "Choose the correct form of the word.",
      instructionsAr: "اختر الصيغة الصحيحة للكلمة.",
      items: [
        { id: "v1", text: "Her ___ to succeed was very strong. (decide)", options: [{ id: "a", text: "decision" }, { id: "b", text: "decisive" }, { id: "c", text: "decide" }], correct: "a" },
        { id: "v2", text: "The film was extremely ___. (bore)", options: [{ id: "a", text: "boredom" }, { id: "b", text: "boring" }, { id: "c", text: "bore" }], correct: "b" },
        { id: "v3", text: "We need more ___ about the project. (inform)", options: [{ id: "a", text: "information" }, { id: "b", text: "informative" }, { id: "c", text: "inform" }], correct: "a" },
        { id: "v4", text: "He gave a very ___ speech. (power)", options: [{ id: "a", text: "powerful" }, { id: "b", text: "power" }, { id: "c", text: "powerfully" }], correct: "a" },
        { id: "v5", text: "Their ___ was a great achievement. (succeed)", options: [{ id: "a", text: "success" }, { id: "b", text: "successful" }, { id: "c", text: "succeed" }], correct: "a" },
        { id: "v6", text: "The weather was surprisingly ___. (pleasure)", options: [{ id: "a", text: "pleasant" }, { id: "b", text: "pleasure" }, { id: "c", text: "pleasantly" }], correct: "a" },
      ],
    },
  },
];

export const allExercises = [
  ...speakingExercises,
  ...listeningExercises,
  ...writingExercises,
  ...readingPassages,
  ...grammarExercises,
  ...vocabularyExercises,
];

// ──────────────────────────────────────────────────────────────
// STEP TEST BANK QUESTIONS
// ──────────────────────────────────────────────────────────────

type QSeed = {
  section: "READING" | "LISTENING" | "GRAMMAR" | "VOCABULARY" | "WRITING";
  difficulty: number;
  questionText: string;
  type: "MULTIPLE_CHOICE" | "FILL_BLANK" | "ESSAY";
  passage?: string;
  questionAudio?: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer?: unknown;
  explanation?: string;
  explanationAr?: string;
  topic: string;
  tags: string[];
};

function mc(
  section: QSeed["section"],
  difficulty: number,
  questionText: string,
  opts: string[],
  correctIdx: number,
  topic: string,
  explanation: string,
  explanationAr: string,
  extra: Partial<QSeed> = {}
): QSeed {
  return {
    section, difficulty, questionText, type: "MULTIPLE_CHOICE",
    options: opts.map((t, i) => ({ id: String.fromCharCode(97 + i), text: t, isCorrect: i === correctIdx })),
    correctAnswer: String.fromCharCode(97 + correctIdx),
    topic, explanation, explanationAr,
    tags: ["step", topic.toLowerCase().replace(/\s+/g, "-")],
    ...extra,
  };
}

// ─── GRAMMAR (40) ───
const grammarQuestions: QSeed[] = [
  mc("GRAMMAR", 3, "By the time the meeting ended, we ___ for three hours.", ["had been talking", "were talking", "have talked", "talk"], 0, "Verb tenses", "Past perfect continuous shows an action ongoing up to a point in the past.", "الماضي التام المستمر يدل على فعل استمر حتى لحظة في الماضي."),
  mc("GRAMMAR", 2, "She ___ to London twice this year.", ["has been", "was", "is", "had been"], 0, "Verb tenses", "Present perfect is used for experiences in a time period that is not finished.", "المضارع التام يُستخدم للخبرات في فترة لم تنتهِ بعد."),
  mc("GRAMMAR", 2, "If it rains tomorrow, we ___ the trip.", ["will cancel", "would cancel", "cancelled", "cancel"], 0, "Conditionals", "First conditional: 'if' + present simple, then 'will' + base verb.", "الشرط الأول: if + المضارع البسيط، ثم will + الفعل الأساسي."),
  mc("GRAMMAR", 3, "If I ___ you, I would study harder.", ["were", "am", "was", "will be"], 0, "Conditionals", "Second conditional uses 'were' for all persons in the if-clause.", "الشرط الثاني يستخدم were لجميع الضمائر في جملة الشرط."),
  mc("GRAMMAR", 2, "The book ___ by a famous author.", ["was written", "wrote", "is writing", "writes"], 0, "Passive voice", "Passive past: 'was/were' + past participle.", "المبني للمجهول في الماضي: was/were + التصريف الثالث."),
  mc("GRAMMAR", 1, "There ___ many people at the party.", ["were", "was", "is", "are"], 0, "Subject-verb agreement", "Plural subject 'people' takes 'were' in the past.", "الفاعل الجمع people يأخذ were في الماضي."),
  mc("GRAMMAR", 2, "I ___ TV when the lights went out.", ["was watching", "watched", "watch", "have watched"], 0, "Verb tenses", "Past continuous describes an action in progress when another action interrupts it.", "الماضي المستمر يصف فعلاً جارياً عند مقاطعته بفعل آخر."),
  mc("GRAMMAR", 3, "He asked me where I ___.", ["lived", "live", "do live", "am living"], 0, "Reported speech", "In reported speech, present simple shifts to past simple.", "في الكلام المنقول، يتحول المضارع البسيط إلى الماضي البسيط."),
  mc("GRAMMAR", 1, "She ___ not like coffee.", ["does", "do", "is", "are"], 0, "Present simple", "Third person negative present uses 'does not'.", "النفي في المضارع للمفرد الغائب يستخدم does not."),
  mc("GRAMMAR", 2, "This is the ___ film I have ever seen.", ["best", "better", "good", "well"], 0, "Comparatives", "Superlative 'best' is used with 'ever' for the highest degree.", "صيغة التفضيل best تُستخدم مع ever للدرجة الأعلى."),
  mc("GRAMMAR", 2, "You ___ smoke in the hospital. It is forbidden.", ["must not", "do not have to", "should", "can"], 0, "Modal verbs", "'Must not' expresses prohibition.", "must not تعبّر عن المنع."),
  mc("GRAMMAR", 3, "Hardly ___ when the rain started.", ["had we arrived", "we arrived", "we had arrived", "did we arrive"], 0, "Inversion", "After 'hardly', the subject and auxiliary are inverted.", "بعد hardly يتم عكس الفاعل والفعل المساعد."),
  mc("GRAMMAR", 1, "My brother is older ___ me.", ["than", "then", "as", "from"], 0, "Comparatives", "'Than' is used in comparisons.", "than تُستخدم في المقارنات."),
  mc("GRAMMAR", 2, "I look forward to ___ from you.", ["hearing", "hear", "heard", "be heard"], 0, "Gerunds", "After 'look forward to', use the -ing form.", "بعد look forward to نستخدم صيغة ing."),
  mc("GRAMMAR", 2, "Neither the teacher nor the students ___ ready.", ["were", "was", "is", "be"], 0, "Subject-verb agreement", "With 'neither...nor', the verb agrees with the nearest subject ('students').", "مع neither...nor يتفق الفعل مع أقرب فاعل."),
  mc("GRAMMAR", 3, "She suggested ___ a taxi.", ["taking", "to take", "take", "took"], 0, "Gerunds", "'Suggest' is followed by a gerund.", "الفعل suggest يتبعه صيغة ing."),
  mc("GRAMMAR", 1, "We ___ go to the beach yesterday.", ["did not", "do not", "are not", "have not"], 0, "Past simple", "Past negative uses 'did not' + base verb.", "النفي في الماضي يستخدم did not + الفعل الأساسي."),
  mc("GRAMMAR", 2, "The man ___ car was stolen called the police.", ["whose", "who", "which", "whom"], 0, "Relative clauses", "'Whose' shows possession in relative clauses.", "whose تدل على الملكية في جمل الوصل."),
  mc("GRAMMAR", 3, "By next year, I ___ here for a decade.", ["will have worked", "will work", "work", "have worked"], 0, "Verb tenses", "Future perfect describes an action completed before a future time.", "المستقبل التام يصف فعلاً يكتمل قبل وقت في المستقبل."),
  mc("GRAMMAR", 2, "I would rather you ___ smoke here.", ["did not", "do not", "will not", "are not"], 0, "Modal verbs", "'Would rather' + subject is followed by past simple.", "would rather + فاعل يتبعها الماضي البسيط."),
  mc("GRAMMAR", 1, "She can speak English ___.", ["fluently", "fluent", "fluence", "more fluent"], 0, "Adverbs", "An adverb 'fluently' describes how she speaks.", "الظرف fluently يصف كيفية تحدثها."),
  mc("GRAMMAR", 2, "If you had told me, I ___ helped you.", ["would have", "will have", "would", "had"], 0, "Conditionals", "Third conditional: 'would have' + past participle.", "الشرط الثالث: would have + التصريف الثالث."),
  mc("GRAMMAR", 2, "It is the first time I ___ sushi.", ["have eaten", "ate", "eat", "had eaten"], 0, "Verb tenses", "After 'it is the first time', present perfect is used.", "بعد it is the first time نستخدم المضارع التام."),
  mc("GRAMMAR", 1, "There is ___ milk in the fridge.", ["some", "many", "a", "few"], 0, "Quantifiers", "'Some' is used with uncountable nouns in positive sentences.", "some تُستخدم مع الأسماء غير المعدودة في الجمل المثبتة."),
  mc("GRAMMAR", 3, "Not only ___ late, but he also forgot the keys.", ["was he", "he was", "he is", "did he"], 0, "Inversion", "After 'not only', subject and verb are inverted.", "بعد not only يتم عكس الفاعل والفعل."),
  mc("GRAMMAR", 2, "He has lived here ___ 2010.", ["since", "for", "during", "from"], 0, "Prepositions of time", "'Since' is used with a point in time.", "since تُستخدم مع نقطة زمنية محددة."),
  mc("GRAMMAR", 2, "I have lived here ___ five years.", ["for", "since", "during", "ago"], 0, "Prepositions of time", "'For' is used with a period of time.", "for تُستخدم مع فترة زمنية."),
  mc("GRAMMAR", 1, "Look! It ___.", ["is raining", "rains", "rained", "rain"], 0, "Present continuous", "Present continuous describes an action happening now.", "المضارع المستمر يصف فعلاً يحدث الآن."),
  mc("GRAMMAR", 2, "She is used to ___ early.", ["waking up", "wake up", "woke up", "wakes up"], 0, "Gerunds", "'Be used to' is followed by the -ing form.", "be used to يتبعها صيغة ing."),
  mc("GRAMMAR", 3, "The more you practise, ___ you become.", ["the better", "better", "the best", "the good"], 0, "Comparatives", "Double comparative: 'the more..., the better...'.", "المقارنة المزدوجة: the more...، the better."),
  mc("GRAMMAR", 1, "Those ___ my books.", ["are", "is", "be", "was"], 0, "Subject-verb agreement", "Plural 'those' takes 'are'.", "those الجمع تأخذ are."),
  mc("GRAMMAR", 2, "He must ___ tired after the long trip.", ["be", "to be", "being", "been"], 0, "Modal verbs", "After modal 'must', use the base form 'be'.", "بعد الفعل الناقص must نستخدم الصيغة الأساسية be."),
  mc("GRAMMAR", 2, "The house ___ we bought is old.", ["which", "who", "whose", "where"], 0, "Relative clauses", "'Which' refers to things in relative clauses.", "which تشير إلى الأشياء في جمل الوصل."),
  mc("GRAMMAR", 3, "Were I rich, I ___ a big house.", ["would buy", "will buy", "buy", "bought"], 0, "Conditionals", "Inverted second conditional: 'Were I...' replaces 'If I were...'.", "الشرط الثاني المعكوس: Were I تحل محل If I were."),
  mc("GRAMMAR", 1, "I usually ___ to school by bus.", ["go", "going", "goes", "went"], 0, "Present simple", "Present simple with 'I' uses the base verb.", "المضارع البسيط مع I يستخدم الفعل الأساسي."),
  mc("GRAMMAR", 2, "We had ___ leave early.", ["to", "for", "of", "at"], 0, "Modal verbs", "'Had to' expresses past obligation.", "had to تعبّر عن الالتزام في الماضي."),
  mc("GRAMMAR", 2, "She speaks ___ than her brother.", ["more clearly", "clearer", "clear", "most clearly"], 0, "Comparatives", "Comparative of an adverb uses 'more + adverb'.", "صيغة المقارنة للظرف تستخدم more + الظرف."),
  mc("GRAMMAR", 1, "___ you like some tea?", ["Would", "Will", "Are", "Do"], 0, "Modal verbs", "'Would you like' is a polite offer.", "would you like عرض مهذب."),
  mc("GRAMMAR", 3, "It was such ___ that we stayed inside.", ["bad weather", "a bad weather", "bad a weather", "the bad weather"], 0, "Articles", "'Weather' is uncountable, so no article is used after 'such'.", "كلمة weather غير معدودة، لذا لا تُستخدم أداة بعد such."),
  mc("GRAMMAR", 2, "I wish I ___ taller.", ["were", "am", "was being", "will be"], 0, "Conditionals", "After 'wish', use 'were' to express an unreal present situation.", "بعد wish نستخدم were للتعبير عن حالة غير واقعية في الحاضر."),
];

// ─── VOCABULARY (40) ───
const vocabularyQuestions: QSeed[] = [
  mc("VOCABULARY", 2, "The scientist made an important ___ about the disease.", ["discovery", "invention", "decision", "description"], 0, "Word choice", "A 'discovery' is finding something that already existed.", "الاكتشاف discovery هو إيجاد شيء كان موجوداً بالفعل."),
  mc("VOCABULARY", 1, "Choose the synonym of 'begin'.", ["start", "stop", "end", "close"], 0, "Synonyms", "'Start' has the same meaning as 'begin'.", "start لها نفس معنى begin."),
  mc("VOCABULARY", 1, "Choose the antonym of 'increase'.", ["decrease", "grow", "rise", "expand"], 0, "Antonyms", "'Decrease' is the opposite of 'increase'.", "decrease عكس increase."),
  mc("VOCABULARY", 2, "He was ___ for the position because of his experience.", ["suitable", "comfortable", "available", "reasonable"], 0, "Word choice", "'Suitable' means right or appropriate for something.", "suitable تعني مناسب لشيء ما."),
  mc("VOCABULARY", 3, "The report gave a ___ analysis of the economy.", ["thorough", "thoughtful", "thankful", "thoughtless"], 0, "Word choice", "'Thorough' means complete and detailed.", "thorough تعني شامل ومفصّل."),
  mc("VOCABULARY", 2, "She has a positive ___ towards her work.", ["attitude", "altitude", "aptitude", "latitude"], 0, "Word choice", "'Attitude' is a way of thinking or feeling.", "attitude هي طريقة التفكير أو الشعور."),
  mc("VOCABULARY", 1, "Choose the synonym of 'happy'.", ["pleased", "angry", "sad", "tired"], 0, "Synonyms", "'Pleased' means happy or satisfied.", "pleased تعني سعيد أو راضٍ."),
  mc("VOCABULARY", 2, "The medicine had a strong ___ on the patient.", ["effect", "affect", "effort", "offer"], 0, "Word choice", "'Effect' (noun) is a result; 'affect' is the verb.", "effect (اسم) هي النتيجة، وaffect هي الفعل."),
  mc("VOCABULARY", 3, "His argument was ___; nobody could disagree.", ["convincing", "confusing", "concerning", "consuming"], 0, "Word choice", "'Convincing' means able to make someone believe.", "convincing تعني قادر على إقناع شخص."),
  mc("VOCABULARY", 1, "Choose the antonym of 'ancient'.", ["modern", "old", "historic", "past"], 0, "Antonyms", "'Modern' is the opposite of 'ancient'.", "modern عكس ancient."),
  mc("VOCABULARY", 2, "We need to ___ the problem before it gets worse.", ["address", "dress", "press", "guess"], 0, "Word choice", "To 'address' a problem means to deal with it.", "address a problem تعني التعامل مع مشكلة."),
  mc("VOCABULARY", 2, "The two countries signed a peace ___.", ["agreement", "argument", "amusement", "achievement"], 0, "Word choice", "An 'agreement' is an arrangement accepted by all.", "agreement هو ترتيب يقبله الجميع."),
  mc("VOCABULARY", 3, "Her explanation was ___ and easy to follow.", ["coherent", "incoherent", "inherent", "inconsistent"], 0, "Word choice", "'Coherent' means clear and logical.", "coherent تعني واضح ومنطقي."),
  mc("VOCABULARY", 1, "Choose the synonym of 'big'.", ["large", "small", "tiny", "narrow"], 0, "Synonyms", "'Large' means big.", "large تعني كبير."),
  mc("VOCABULARY", 2, "The company will ___ a new product next month.", ["launch", "lunch", "lounge", "lend"], 0, "Word choice", "To 'launch' means to introduce a new product.", "launch تعني إطلاق منتج جديد."),
  mc("VOCABULARY", 2, "Reading regularly can ___ your vocabulary.", ["improve", "improvise", "impress", "imprint"], 0, "Word choice", "To 'improve' means to make better.", "improve تعني تحسين."),
  mc("VOCABULARY", 3, "The witness gave a ___ account of the accident.", ["detailed", "detained", "detected", "delayed"], 0, "Word choice", "'Detailed' means including many specific points.", "detailed تعني يتضمن نقاطاً محددة كثيرة."),
  mc("VOCABULARY", 1, "Choose the antonym of 'difficult'.", ["easy", "hard", "tough", "complex"], 0, "Antonyms", "'Easy' is the opposite of 'difficult'.", "easy عكس difficult."),
  mc("VOCABULARY", 2, "He felt ___ after running the marathon.", ["exhausted", "excited", "exact", "expensive"], 0, "Word choice", "'Exhausted' means extremely tired.", "exhausted تعني متعب جداً."),
  mc("VOCABULARY", 2, "The teacher asked the students to ___ their answers.", ["review", "preview", "viewer", "renew"], 0, "Word choice", "To 'review' means to look at again carefully.", "review تعني المراجعة بعناية."),
  mc("VOCABULARY", 3, "The instructions were ___, so we got lost.", ["ambiguous", "obvious", "precise", "definite"], 0, "Word choice", "'Ambiguous' means having more than one possible meaning.", "ambiguous تعني له أكثر من معنى ممكن."),
  mc("VOCABULARY", 1, "Choose the synonym of 'fast'.", ["quick", "slow", "calm", "late"], 0, "Synonyms", "'Quick' means fast.", "quick تعني سريع."),
  mc("VOCABULARY", 2, "The new policy will ___ many employees.", ["benefit", "benefactor", "beneficial", "benefited"], 0, "Word choice", "'Benefit' (verb) means to help or be useful to.", "benefit (فعل) تعني يساعد أو يفيد."),
  mc("VOCABULARY", 2, "She made a ___ decision to change careers.", ["brave", "brake", "broad", "bright"], 0, "Word choice", "'Brave' means showing courage.", "brave تعني شجاع."),
  mc("VOCABULARY", 3, "The data was ___ enough to support the theory.", ["sufficient", "superficial", "suspicious", "subsequent"], 0, "Word choice", "'Sufficient' means as much as is needed.", "sufficient تعني بقدر الحاجة."),
  mc("VOCABULARY", 1, "Choose the antonym of 'rich'.", ["poor", "wealthy", "expensive", "valuable"], 0, "Antonyms", "'Poor' is the opposite of 'rich'.", "poor عكس rich."),
  mc("VOCABULARY", 2, "We must ___ energy to protect the environment.", ["conserve", "converse", "convert", "concern"], 0, "Word choice", "To 'conserve' means to use carefully and avoid waste.", "conserve تعني الاستخدام بحذر وتجنب الهدر."),
  mc("VOCABULARY", 2, "His handwriting is difficult to ___.", ["read", "red", "ready", "reed"], 0, "Word choice", "To 'read' means to look at and understand written words.", "read تعني النظر إلى الكلمات المكتوبة وفهمها."),
  mc("VOCABULARY", 3, "The lecture was very ___ and gave us new ideas.", ["stimulating", "stimulated", "stimulus", "stimulant"], 0, "Word choice", "'Stimulating' means interesting and full of ideas.", "stimulating تعني مثير ومليء بالأفكار."),
  mc("VOCABULARY", 1, "Choose the synonym of 'small'.", ["tiny", "huge", "wide", "long"], 0, "Synonyms", "'Tiny' means very small.", "tiny تعني صغير جداً."),
  mc("VOCABULARY", 2, "The doctor gave him ___ on how to stay healthy.", ["advice", "advise", "adverb", "adventure"], 0, "Word choice", "'Advice' (noun) is a recommendation; 'advise' is the verb.", "advice (اسم) توصية، وadvise هي الفعل."),
  mc("VOCABULARY", 2, "Our trip was ___ because of the bad weather.", ["cancelled", "celebrated", "calculated", "collected"], 0, "Word choice", "To 'cancel' means to decide something will not happen.", "cancel تعني قرار بعدم حدوث شيء."),
  mc("VOCABULARY", 3, "She is a ___ reader and finishes a book every week.", ["keen", "kind", "kept", "keeper"], 0, "Word choice", "'Keen' means very enthusiastic.", "keen تعني متحمس جداً."),
  mc("VOCABULARY", 1, "Choose the antonym of 'fast'.", ["slow", "quick", "rapid", "swift"], 0, "Antonyms", "'Slow' is the opposite of 'fast'.", "slow عكس fast."),
  mc("VOCABULARY", 2, "The museum has a large ___ of paintings.", ["collection", "correction", "connection", "construction"], 0, "Word choice", "A 'collection' is a group of similar things kept together.", "collection مجموعة من أشياء متشابهة."),
  mc("VOCABULARY", 2, "He gave a clear ___ of the new rules.", ["explanation", "exploration", "expectation", "examination"], 0, "Word choice", "An 'explanation' makes something clear or understandable.", "explanation تجعل الشيء واضحاً ومفهوماً."),
  mc("VOCABULARY", 3, "The evidence was ___ and could not be doubted.", ["compelling", "compiling", "competing", "complaining"], 0, "Word choice", "'Compelling' means very convincing.", "compelling تعني مقنع جداً."),
  mc("VOCABULARY", 1, "Choose the synonym of 'smart'.", ["clever", "lazy", "weak", "rude"], 0, "Synonyms", "'Clever' means intelligent.", "clever تعني ذكي."),
  mc("VOCABULARY", 2, "We should ___ our differences and work together.", ["overcome", "oversee", "overhear", "overflow"], 0, "Word choice", "To 'overcome' means to deal with and defeat a difficulty.", "overcome تعني التغلب على صعوبة."),
  mc("VOCABULARY", 3, "The author's style is ___ and pleasant to read.", ["elegant", "eloquent", "elephant", "element"], 0, "Word choice", "'Elegant' means graceful and stylish.", "elegant تعني أنيق ورشيق."),
];

// ─── READING (60: 12 passages x 5 questions) ───
const readingTopics = [
  {
    topic: "Reading comprehension - main idea",
    passage: "The internet has transformed the way people learn. In the past, students relied mainly on textbooks and teachers. Today, a learner can watch a video lesson from a university on the other side of the world, join an online discussion, or use an app that adapts to their level. This access to knowledge is one of the great achievements of the digital age. However, experts warn that information alone is not the same as education. Learners still need guidance to know which sources are reliable and how to think critically about what they read.",
    questions: [
      { q: "What is the main idea of the passage?", opts: ["The internet has changed how people learn", "Textbooks are no longer printed", "Universities are closing", "Apps are expensive"], correct: 0 },
      { q: "How did students mainly learn in the past?", opts: ["Through textbooks and teachers", "Through video lessons", "Through apps", "Through discussions abroad"], correct: 0 },
      { q: "What can a learner do today, according to the passage?", opts: ["Watch a university lesson from far away", "Travel for free", "Avoid all teachers", "Stop reading"], correct: 0 },
      { q: "What do experts warn about?", opts: ["Information alone is not education", "The internet is too slow", "Apps are boring", "Videos are too long"], correct: 0 },
      { q: "What do learners still need?", opts: ["Guidance and critical thinking", "More textbooks only", "Faster internet only", "Longer holidays"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - inference",
    passage: "When Mariam opened the door, the room was completely dark. She reached for the light switch, but nothing happened. From the window, she could see that the streetlights outside were also off, and the houses across the road were dark too. She remembered that her neighbour had mentioned something about maintenance work earlier that day. Sighing, she found a candle in the kitchen drawer and lit it. At least she had finished her homework before dinner.",
    questions: [
      { q: "Why did the light not turn on?", opts: ["There was a power cut", "The bulb was new", "Mariam was asleep", "The switch was broken forever"], correct: 0 },
      { q: "How do we know the problem was not only in Mariam's house?", opts: ["The streetlights and other houses were also dark", "Her phone rang", "The door was open", "It was raining"], correct: 0 },
      { q: "What had the neighbour mentioned?", opts: ["Maintenance work", "A party", "A new shop", "A holiday"], correct: 0 },
      { q: "How did Mariam react to the situation?", opts: ["She found and lit a candle", "She left the house", "She called the police", "She went to sleep immediately"], correct: 0 },
      { q: "Why was Mariam not worried about her homework?", opts: ["She had already finished it", "It was cancelled", "She had no homework", "Her teacher was absent"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - detail",
    passage: "The Arabian oryx is a type of antelope that lives in desert regions. It is well adapted to harsh environments. Its white coat reflects sunlight, helping it stay cool, while its wide hooves make it easier to walk on sand. By the early 1970s, the Arabian oryx had almost disappeared from the wild because of hunting. Fortunately, conservation programmes were started. Animals kept in zoos were carefully bred and later released back into protected areas. Today, thanks to these efforts, the Arabian oryx population has recovered, and it is no longer considered to be in immediate danger of extinction.",
    questions: [
      { q: "What kind of animal is the Arabian oryx?", opts: ["A type of antelope", "A type of camel", "A type of bird", "A type of cat"], correct: 0 },
      { q: "How does its white coat help it?", opts: ["It reflects sunlight and keeps it cool", "It makes it run faster", "It hides it from rain", "It keeps it warm at night"], correct: 0 },
      { q: "Why did the Arabian oryx almost disappear?", opts: ["Because of hunting", "Because of disease", "Because of floods", "Because of cold weather"], correct: 0 },
      { q: "How were the animals saved?", opts: ["They were bred in zoos and released", "They were moved to another country", "They were left alone", "They were fed by tourists"], correct: 0 },
      { q: "What is the situation of the Arabian oryx today?", opts: ["Its population has recovered", "It is extinct", "It lives only in zoos", "It is still disappearing fast"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - main idea",
    passage: "Volunteering is becoming increasingly popular among young people. Many students now give some of their free time to help others, whether by teaching children, cleaning public spaces, or supporting elderly people in their community. Volunteering brings benefits to everyone involved. The community receives valuable help, while the volunteers themselves gain new skills and experience. Studies also show that people who volunteer often feel happier and more connected to those around them. For students, volunteering can also be useful when applying to universities, as it shows responsibility and commitment.",
    questions: [
      { q: "What is the passage mainly about?", opts: ["The benefits of volunteering for young people", "How to find a job", "Why students dislike free time", "The cost of education"], correct: 0 },
      { q: "Which activity is given as an example of volunteering?", opts: ["Teaching children", "Watching films", "Playing video games", "Shopping"], correct: 0 },
      { q: "What do volunteers gain?", opts: ["New skills and experience", "Money only", "Free holidays", "Nothing"], correct: 0 },
      { q: "What do studies show about people who volunteer?", opts: ["They often feel happier and more connected", "They become tired and bored", "They earn more money", "They study less"], correct: 0 },
      { q: "Why can volunteering help with university applications?", opts: ["It shows responsibility and commitment", "It replaces exams", "It guarantees acceptance", "It is required by law"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - detail",
    passage: "Honey has been used by humans for thousands of years. Ancient peoples valued it not only as a sweet food but also as a medicine. Honey is produced by bees, which collect nectar from flowers and turn it into honey inside the hive. The taste and colour of honey depend on the type of flowers the bees visit. For example, honey from one kind of flower may be light and mild, while honey from another may be dark and strong. Besides its use in cooking, honey has natural properties that can help soothe a sore throat. This is one reason it remains popular today.",
    questions: [
      { q: "How long have humans used honey?", opts: ["For thousands of years", "For about ten years", "For one century", "Only recently"], correct: 0 },
      { q: "How did ancient peoples value honey?", opts: ["As food and medicine", "As money", "As a building material", "As clothing"], correct: 0 },
      { q: "How do bees make honey?", opts: ["They collect nectar from flowers", "They collect water", "They collect leaves", "They collect sand"], correct: 0 },
      { q: "What does the taste of honey depend on?", opts: ["The type of flowers the bees visit", "The colour of the hive", "The size of the bees", "The weather only"], correct: 0 },
      { q: "What can honey help soothe?", opts: ["A sore throat", "A broken leg", "A headache only", "Tired eyes"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - inference",
    passage: "Khalid had been looking forward to the football match all week. On Saturday morning, he packed his boots and water bottle and checked the time again. But as he stepped outside, he noticed dark clouds gathering quickly. By the time he reached the field, the rain was heavy and the ground was covered with large pools of water. The other players were already standing under a shelter, looking disappointed. The coach walked over and spoke briefly to the group. A few minutes later, everyone began to walk back home.",
    questions: [
      { q: "What can we infer happened to the match?", opts: ["It was cancelled because of the rain", "It was won by Khalid's team", "It started early", "It lasted two hours"], correct: 0 },
      { q: "How was Khalid feeling at the start of the day?", opts: ["Excited about the match", "Angry with the coach", "Bored", "Ill"], correct: 0 },
      { q: "What was the weather like when Khalid stepped outside?", opts: ["Dark clouds were gathering", "It was bright and sunny", "It was snowing", "It was foggy"], correct: 0 },
      { q: "How did the other players look?", opts: ["Disappointed", "Excited", "Surprised and happy", "Confused about the rules"], correct: 0 },
      { q: "What did everyone do at the end?", opts: ["They walked back home", "They played anyway", "They waited all day", "They went to a cafe"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - main idea",
    passage: "Deserts are often thought of as empty, lifeless places, but this is far from the truth. A surprising variety of plants and animals have learned to survive in these dry regions. Many desert animals are active at night, when the temperature is cooler, and rest in the shade during the hottest hours. Some plants store water in their thick stems or leaves, allowing them to survive long periods without rain. Others have very deep roots that can reach water far below the surface. These remarkable adaptations show that life can succeed even in the most difficult environments.",
    questions: [
      { q: "What is the main message of the passage?", opts: ["Deserts contain a variety of life despite being dry", "Deserts are completely empty", "Deserts are getting larger", "Deserts have no plants"], correct: 0 },
      { q: "When are many desert animals active?", opts: ["At night", "At midday", "Only in winter", "Only after rain"], correct: 0 },
      { q: "How do some desert plants survive without rain?", opts: ["They store water in stems or leaves", "They move to wetter areas", "They stop growing forever", "They drink from rivers"], correct: 0 },
      { q: "What do other plants use to reach water?", opts: ["Very deep roots", "Wide leaves only", "Tall stems only", "Their flowers"], correct: 0 },
      { q: "What do these adaptations show?", opts: ["Life can succeed in difficult environments", "Deserts are dangerous for everyone", "Plants cannot live in deserts", "Animals avoid deserts"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - detail",
    passage: "The first modern Olympic Games were held in Athens in 1896. The idea was to revive an ancient tradition and to bring together athletes from different countries in peaceful competition. At the first Games, only a few hundred athletes took part, and they came from just fourteen nations. All of the competitors were men. Over the following decades, the Olympic Games grew enormously. Women were allowed to compete from 1900 onwards, and the number of sports and participating countries increased steadily. Today, the Olympic Games are one of the largest sporting events in the world, watched by millions of people.",
    questions: [
      { q: "Where were the first modern Olympic Games held?", opts: ["Athens", "Paris", "London", "Rome"], correct: 0 },
      { q: "In what year were they held?", opts: ["1896", "1900", "1924", "1948"], correct: 0 },
      { q: "How many nations took part in the first Games?", opts: ["Fourteen", "Forty", "Two", "One hundred"], correct: 0 },
      { q: "From what year were women allowed to compete?", opts: ["1900", "1896", "1936", "1980"], correct: 0 },
      { q: "What are the Olympic Games today?", opts: ["One of the largest sporting events in the world", "A small local event", "A competition for one country", "No longer held"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - inference",
    passage: "The small bookshop on the corner had been part of the neighbourhood for over forty years. Its owner, Mr Salem, knew most of his customers by name and could always recommend the right book. Recently, however, fewer people had been visiting. Many now bought their books online, where prices were lower and delivery was quick. One morning, a handwritten sign appeared in the window. Neighbours stopped to read it, and some looked sad. By the end of the month, the shelves were empty and the lights were switched off for the last time.",
    questions: [
      { q: "What can we infer the sign in the window said?", opts: ["The shop was closing down", "The shop had new opening hours", "The shop was hiring staff", "The shop had moved upstairs"], correct: 0 },
      { q: "How long had the bookshop been in the neighbourhood?", opts: ["Over forty years", "About four years", "One year", "Six months"], correct: 0 },
      { q: "Why were fewer people visiting the shop?", opts: ["They bought books online instead", "The shop had moved", "Mr Salem was unfriendly", "Books were no longer popular at all"], correct: 0 },
      { q: "How did some neighbours feel when they read the sign?", opts: ["Sad", "Excited", "Angry", "Confused"], correct: 0 },
      { q: "What happened by the end of the month?", opts: ["The shop closed for the last time", "The shop became bigger", "More customers arrived", "The shop changed its name"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - main idea",
    passage: "Recycling is a simple but powerful way to protect the environment. When we recycle materials such as paper, glass, and metal, we reduce the need to take new raw materials from nature. This saves energy and lowers pollution. Recycling also reduces the amount of rubbish sent to landfill sites, which can harm the land and water around them. Although recycling requires some effort, such as separating waste into different bins, the benefits are clear. Many cities now make recycling easier by providing collection services. Small actions by individuals, when added together, can make a real difference.",
    questions: [
      { q: "What is the main idea of the passage?", opts: ["Recycling helps protect the environment", "Recycling is impossible", "Landfill sites are useful", "New materials are always better"], correct: 0 },
      { q: "What does recycling reduce the need for?", opts: ["New raw materials from nature", "Electricity at home", "Public transport", "Education"], correct: 0 },
      { q: "Why are landfill sites a problem?", opts: ["They can harm the land and water", "They are too small", "They are too clean", "They cost nothing"], correct: 0 },
      { q: "What effort does recycling require?", opts: ["Separating waste into different bins", "Travelling far away", "Buying special machines", "Paying high fees"], correct: 0 },
      { q: "What message does the passage give about individuals?", opts: ["Small actions added together make a difference", "Individuals cannot help", "Only governments matter", "Recycling is a waste of time"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - detail",
    passage: "The camel has played an essential role in the history of Arabia. Often called the 'ship of the desert', the camel made long journeys across vast areas of sand possible. Camels can travel for many days without drinking water, and they can carry heavy loads of goods and people. Their bodies are well suited to desert life: they have thick eyelashes to protect their eyes from sand, and their feet are broad to prevent them from sinking. For centuries, camels were central to trade, transport, and daily life. Even today, camels remain an important part of the cultural heritage of the region.",
    questions: [
      { q: "What is the camel often called?", opts: ["The ship of the desert", "The king of the sea", "The runner of the sand", "The bird of Arabia"], correct: 0 },
      { q: "What can camels do without drinking water?", opts: ["Travel for many days", "Run very fast for hours", "Swim long distances", "Fly short distances"], correct: 0 },
      { q: "How are camels' eyes protected from sand?", opts: ["By thick eyelashes", "By special glasses", "By their ears", "By their tails"], correct: 0 },
      { q: "Why do camels not sink in the sand?", opts: ["Their feet are broad", "They are very light", "They walk only on roads", "They have wings"], correct: 0 },
      { q: "What role do camels play today?", opts: ["An important part of cultural heritage", "No role at all", "Only a role in sports", "A role only in cities"], correct: 0 },
    ],
  },
  {
    topic: "Reading comprehension - inference",
    passage: "Nora had spent three months preparing for the science competition. On the day of the event, she carefully set up her project and waited nervously for the judges. They asked her many questions, and she answered each one calmly and clearly. Hours later, the results were announced in the main hall. When Nora heard her name, she could hardly believe it. Her parents, who were sitting in the audience, stood up and clapped loudly. That evening, Nora placed a small golden trophy on the shelf in her room and smiled.",
    questions: [
      { q: "What can we infer about Nora's result in the competition?", opts: ["She won a prize", "She did not take part", "She arrived late", "She forgot her project"], correct: 0 },
      { q: "How long had Nora prepared for the competition?", opts: ["Three months", "Three days", "One week", "One year"], correct: 0 },
      { q: "How did Nora answer the judges' questions?", opts: ["Calmly and clearly", "Quickly and nervously", "She refused to answer", "With another question"], correct: 0 },
      { q: "How did Nora's parents react to the result?", opts: ["They stood up and clapped loudly", "They left the hall", "They looked disappointed", "They did not attend"], correct: 0 },
      { q: "What did Nora place on her shelf that evening?", opts: ["A small golden trophy", "Her science book", "A photograph", "A medal from school"], correct: 0 },
    ],
  },
];

const readingQuestions: QSeed[] = [];
for (const rt of readingTopics) {
  for (let i = 0; i < rt.questions.length; i++) {
    const qq = rt.questions[i];
    readingQuestions.push(
      mc("READING", i < 2 ? 2 : i < 4 ? 3 : 4, qq.q, qq.opts, qq.correct, rt.topic,
        "The answer is found by reading the passage carefully.",
        "تُوجد الإجابة بقراءة النص بعناية.",
        { passage: rt.passage })
    );
  }
}

// ─── LISTENING (60: 20 clips x 3 questions) ───
const listeningClips = [
  { ctx: "A short announcement at an airport", q: ["The flight to Dubai is delayed.", "Passengers should go to gate 12.", "Boarding will begin in thirty minutes."] },
  { ctx: "A conversation about weekend plans", q: ["They plan to visit a museum.", "The museum is free on Saturdays.", "They will meet at ten o'clock."] },
  { ctx: "A phone call to a doctor's clinic", q: ["The caller wants an appointment.", "The clinic is closed on Friday.", "The appointment is on Monday morning."] },
  { ctx: "A teacher giving instructions", q: ["Students must finish the task at home.", "The work is due next week.", "Students should work in pairs."] },
  { ctx: "A shopping conversation", q: ["The customer is looking for a jacket.", "The jacket is too expensive.", "The shop has a smaller size."] },
  { ctx: "A radio traffic report", q: ["There is heavy traffic on the main road.", "Drivers should use another route.", "The problem is caused by roadworks."] },
  { ctx: "A hotel check-in", q: ["The guest booked a room for two nights.", "Breakfast is included in the price.", "The room is on the third floor."] },
  { ctx: "A conversation about a lost item", q: ["The woman lost her phone.", "She last saw it in the cafe.", "Someone found it and returned it."] },
  { ctx: "An announcement at a train station", q: ["The train to Riyadh is on platform two.", "The train leaves in ten minutes.", "Passengers must keep their tickets."] },
  { ctx: "A discussion about a school trip", q: ["The trip is to a science centre.", "Students need to bring lunch.", "The bus leaves at eight o'clock."] },
  { ctx: "A conversation in a restaurant", q: ["The customer orders a vegetable soup.", "The customer does not want dessert.", "The customer asks for the bill."] },
  { ctx: "A weather forecast", q: ["Tomorrow will be cloudy.", "There may be rain in the evening.", "The temperature will be lower than today."] },
  { ctx: "A library announcement", q: ["The library will close early today.", "Books must be returned by Thursday.", "A new study room has opened."] },
  { ctx: "A conversation about a job", q: ["The man has an interview tomorrow.", "He is nervous about the interview.", "His friend gives him advice."] },
  { ctx: "A tour guide speaking", q: ["The tour will last two hours.", "Visitors can take photographs.", "The next stop is the old market."] },
  { ctx: "A conversation about homework", q: ["The student does not understand the maths task.", "She decides to ask the teacher.", "The homework is due tomorrow."] },
  { ctx: "An announcement in a shopping mall", q: ["The mall will close at ten o'clock.", "A child is waiting at the information desk.", "There is a special sale on the first floor."] },
  { ctx: "A conversation about transport", q: ["The woman usually takes the bus to work.", "The bus is cheaper than a taxi.", "Today the bus was late."] },
  { ctx: "A short news report", q: ["A new park has opened in the city.", "The park has a children's playground.", "Entry to the park is free."] },
  { ctx: "A conversation about studying English", q: ["The student wants to improve his speaking.", "He practises by watching English videos.", "His teacher suggests joining a club."] },
];

const listeningQuestions: QSeed[] = [];
for (const clip of listeningClips) {
  for (let i = 0; i < clip.q.length; i++) {
    listeningQuestions.push(
      mc("LISTENING", 3, `(${clip.ctx}) — Choose the statement that matches what you hear.`,
        [clip.q[i], "The speaker talks about a different topic.", "No information is given about this."],
        0, "Listening comprehension",
        "Listen carefully for the specific detail mentioned.",
        "استمع جيداً للتفصيل المحدد المذكور.",
        { questionAudio: PLACEHOLDER_AUDIO })
    );
  }
}

// ─── WRITING (5 essay prompts) ───
const writingQuestions: QSeed[] = [
  {
    section: "WRITING", difficulty: 3, type: "ESSAY",
    questionText: "Some people think that students should study subjects they enjoy, while others believe they should study subjects that are useful for their future careers. Discuss both views and give your own opinion. Write 180-250 words.",
    topic: "Argumentative essay", tags: ["step", "essay", "opinion"],
    explanation: "A strong response addresses both views, gives a clear opinion, and uses linking words.",
    explanationAr: "الإجابة القوية تتناول كلا الرأيين، وتعطي رأياً واضحاً، وتستخدم أدوات الربط.",
  },
  {
    section: "WRITING", difficulty: 3, type: "ESSAY",
    questionText: "Technology has changed the way we communicate with each other. Do you think these changes are mostly positive or mostly negative? Give reasons and examples. Write 180-250 words.",
    topic: "Opinion essay", tags: ["step", "essay", "technology"],
    explanation: "A strong response states a clear position and supports it with specific examples.",
    explanationAr: "الإجابة القوية تحدد موقفاً واضحاً وتدعمه بأمثلة محددة.",
  },
  {
    section: "WRITING", difficulty: 4, type: "ESSAY",
    questionText: "Many young people today want to live in large cities rather than in small towns or villages. What are the advantages and disadvantages of this trend? Write 200-280 words.",
    topic: "Advantages and disadvantages essay", tags: ["step", "essay"],
    explanation: "A strong response presents balanced advantages and disadvantages with a clear structure.",
    explanationAr: "الإجابة القوية تقدّم مزايا وعيوباً متوازنة ببنية واضحة.",
  },
  {
    section: "WRITING", difficulty: 3, type: "ESSAY",
    questionText: "Some schools require students to wear a uniform, while others allow students to wear their own clothes. Which system do you think is better, and why? Write 180-250 words.",
    topic: "Opinion essay", tags: ["step", "essay", "education"],
    explanation: "A strong response chooses one system and justifies the choice with clear reasons.",
    explanationAr: "الإجابة القوية تختار نظاماً واحداً وتبرر الاختيار بأسباب واضحة.",
  },
  {
    section: "WRITING", difficulty: 4, type: "ESSAY",
    questionText: "Protecting the environment is the responsibility of governments, not individuals. To what extent do you agree or disagree? Give reasons for your answer. Write 200-280 words.",
    topic: "Agree or disagree essay", tags: ["step", "essay", "environment"],
    explanation: "A strong response takes a clear stance and develops it with reasoned argument.",
    explanationAr: "الإجابة القوية تتخذ موقفاً واضحاً وتطوّره بحجة مُسبّبة.",
  },
];

const allQuestions = [
  ...grammarQuestions,
  ...vocabularyQuestions,
  ...readingQuestions,
  ...listeningQuestions,
  ...writingQuestions,
];

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Phase 6 — English Lab + STEP Test Bank...");

  // ─── Lab exercises ───
  const existingLab = await prisma.labExercise.count();
  if (existingLab > 0) {
    console.log(`  ⚠ ${existingLab} lab exercises already exist — skipping lab seed.`);
  } else {
    for (const ex of allExercises) {
      await prisma.labExercise.create({
        data: {
          type: ex.type,
          level: ex.level,
          title: ex.title,
          titleAr: ex.titleAr,
          description: ex.description,
          descriptionAr: ex.descriptionAr,
          content: ex.content as object,
          estimatedMinutes: ex.estimatedMinutes,
          pointsValue: ex.pointsValue,
          tags: ex.tags,
          isPublished: true,
        },
      });
    }
    const byType: Record<string, number> = {};
    for (const e of allExercises) byType[e.type] = (byType[e.type] ?? 0) + 1;
    console.log(`  ✓ ${allExercises.length} lab exercises seeded:`, byType);
  }

  // ─── Test questions ───
  const existingQ = await prisma.testQuestion.count();
  let questionIds: { id: string; section: string }[] = [];
  if (existingQ > 0) {
    console.log(`  ⚠ ${existingQ} test questions already exist — skipping question seed.`);
    questionIds = (await prisma.testQuestion.findMany({ select: { id: true, section: true } })).map(
      (q) => ({ id: q.id, section: q.section })
    );
  } else {
    for (const q of allQuestions) {
      const created = await prisma.testQuestion.create({
        data: {
          testType: "STEP",
          section: q.section,
          difficulty: q.difficulty,
          questionText: q.questionText,
          questionAudio: q.questionAudio ?? null,
          passage: q.passage ?? null,
          type: q.type,
          options: (q.options ?? null) as object | undefined,
          correctAnswer: (q.correctAnswer ?? null) as object | undefined,
          explanation: q.explanation ?? null,
          explanationAr: q.explanationAr ?? null,
          topic: q.topic,
          tags: q.tags,
          isActive: true,
        },
      });
      questionIds.push({ id: created.id, section: q.section });
    }
    const bySection: Record<string, number> = {};
    for (const q of allQuestions) bySection[q.section] = (bySection[q.section] ?? 0) + 1;
    console.log(`  ✓ ${allQuestions.length} STEP questions seeded:`, bySection);
  }

  // ─── Mock exams ───
  const existingExams = await prisma.testExam.count();
  if (existingExams > 0) {
    console.log(`  ⚠ ${existingExams} exams already exist — skipping exam seed.`);
  } else {
    const pick = (section: string, n: number) =>
      questionIds.filter((q) => q.section === section).slice(0, n);

    // Exam 1: Full STEP Practice Exam
    const fullSections = [
      { section: "READING", questionCount: 30, minutes: 12 },
      { section: "LISTENING", questionCount: 30, minutes: 10 },
      { section: "GRAMMAR", questionCount: 20, minutes: 8 },
      { section: "VOCABULARY", questionCount: 20, minutes: 10 },
    ];
    const fullExamQ = [
      ...pick("READING", 30),
      ...pick("LISTENING", 30),
      ...pick("GRAMMAR", 20),
      ...pick("VOCABULARY", 20),
    ];
    const fullExam = await prisma.testExam.create({
      data: {
        type: "FULL_MOCK", testType: "STEP",
        title: "STEP Practice Exam 1", titleAr: "اختبار ستيب التجريبي 1",
        description: "A full-length STEP simulation covering all sections.",
        totalQuestions: fullExamQ.length, totalMinutes: 40, passingScore: 60,
        sectionStructure: fullSections, difficulty: 3, isPublished: true,
      },
    });
    let order = 0;
    let secOrder = 0;
    let lastSection = "";
    for (const q of fullExamQ) {
      if (q.section !== lastSection) { secOrder++; lastSection = q.section; }
      await prisma.examQuestion.create({
        data: { examId: fullExam.id, questionId: q.id, orderIndex: order++, sectionOrder: secOrder },
      });
    }
    console.log(`  ✓ Mock exam "STEP Practice Exam 1" — ${fullExamQ.length} questions`);

    // Exam 2: Grammar Drill
    const grammarDrillQ = pick("GRAMMAR", 20);
    const grammarExam = await prisma.testExam.create({
      data: {
        type: "SECTION_DRILL", testType: "STEP",
        title: "STEP Grammar Drill", titleAr: "تدريب القواعد لاختبار ستيب",
        description: "A focused 20-question drill on STEP grammar.",
        totalQuestions: grammarDrillQ.length, totalMinutes: 15, passingScore: 60,
        sectionStructure: [{ section: "GRAMMAR", questionCount: grammarDrillQ.length, minutes: 15 }],
        difficulty: 3, isPublished: true,
      },
    });
    let go = 0;
    for (const q of grammarDrillQ) {
      await prisma.examQuestion.create({
        data: { examId: grammarExam.id, questionId: q.id, orderIndex: go++, sectionOrder: 1 },
      });
    }
    console.log(`  ✓ Mock exam "STEP Grammar Drill" — ${grammarDrillQ.length} questions`);

    // Exam 3: Reading Drill
    const readingDrillQ = pick("READING", 30);
    const readingExam = await prisma.testExam.create({
      data: {
        type: "SECTION_DRILL", testType: "STEP",
        title: "STEP Reading Drill", titleAr: "تدريب القراءة لاختبار ستيب",
        description: "A focused 30-question drill on STEP reading comprehension.",
        totalQuestions: readingDrillQ.length, totalMinutes: 20, passingScore: 60,
        sectionStructure: [{ section: "READING", questionCount: readingDrillQ.length, minutes: 20 }],
        difficulty: 3, isPublished: true,
      },
    });
    let ro = 0;
    for (const q of readingDrillQ) {
      await prisma.examQuestion.create({
        data: { examId: readingExam.id, questionId: q.id, orderIndex: ro++, sectionOrder: 1 },
      });
    }
    console.log(`  ✓ Mock exam "STEP Reading Drill" — ${readingDrillQ.length} questions`);
  }

  console.log("✅ Phase 6 seed complete.");
}

// ──────────────────────────────────────────────────────────────
// SQL EMITTER — produces an idempotent .sql file for the questions
// and exams, applied via Supabase MCP when the pooler is unreliable.
// ──────────────────────────────────────────────────────────────

function sqlStr(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlJson(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}

function sqlArr(v: string[]): string {
  if (!v || v.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${v.map((s) => sqlStr(s)).join(",")}]`;
}

/**
 * Emit a stable id for a question by index, so exam-question links can
 * reference questions deterministically inside one SQL file.
 */
function questionUuid(idx: number): string {
  const h = (idx + 1).toString(16).padStart(12, "0");
  return `a6000000-0000-4000-8000-${h}`;
}

function emitSql(): string {
  const lines: string[] = [];
  lines.push("-- Phase 6 seed — STEP questions + mock exams (idempotent)");
  lines.push("BEGIN;");
  lines.push("");
  lines.push("-- Clear any partial Phase 6 test data first");
  lines.push('DELETE FROM "ExamAnswer";');
  lines.push('DELETE FROM "ExamQuestion";');
  lines.push('DELETE FROM "ExamAttempt";');
  lines.push('DELETE FROM "TestExam";');
  lines.push('DELETE FROM "TestQuestion";');
  lines.push("");

  // Questions — ON CONFLICT DO NOTHING makes every chunk safely re-runnable.
  allQuestions.forEach((q, i) => {
    const id = questionUuid(i);
    lines.push(
      `INSERT INTO "TestQuestion" ("id","testType","section","difficulty","questionText","questionAudio","passage","type","options","correctAnswer","explanation","explanationAr","topic","tags","isActive","updatedAt") VALUES (` +
        `${sqlStr(id)},'STEP','${q.section}',${q.difficulty},${sqlStr(q.questionText)},` +
        `${sqlStr(q.questionAudio ?? null)},${sqlStr(q.passage ?? null)},'${q.type}',` +
        `${sqlJson(q.options ?? null)},${sqlJson(q.correctAnswer ?? null)},` +
        `${sqlStr(q.explanation ?? null)},${sqlStr(q.explanationAr ?? null)},` +
        `${sqlStr(q.topic)},${sqlArr(q.tags)},true,now()) ON CONFLICT (id) DO NOTHING;`
    );
  });
  lines.push("");

  // Exams + exam-question links
  const idsBySection = (section: string) =>
    allQuestions
      .map((q, i) => ({ q, id: questionUuid(i) }))
      .filter((x) => x.q.section === section)
      .map((x) => x.id);

  type ExamDef = {
    examId: string;
    type: string;
    title: string;
    titleAr: string;
    description: string;
    totalMinutes: number;
    sectionStructure: unknown;
    sections: { section: string; count: number }[];
  };

  const exams: ExamDef[] = [
    {
      examId: "b6000000-0000-4000-8000-000000000001",
      type: "FULL_MOCK",
      title: "STEP Practice Exam 1",
      titleAr: "اختبار ستيب التجريبي 1",
      description: "A full-length STEP simulation covering all sections.",
      totalMinutes: 40,
      sectionStructure: [
        { section: "READING", questionCount: 30, minutes: 12 },
        { section: "LISTENING", questionCount: 30, minutes: 10 },
        { section: "GRAMMAR", questionCount: 20, minutes: 8 },
        { section: "VOCABULARY", questionCount: 20, minutes: 10 },
      ],
      sections: [
        { section: "READING", count: 30 },
        { section: "LISTENING", count: 30 },
        { section: "GRAMMAR", count: 20 },
        { section: "VOCABULARY", count: 20 },
      ],
    },
    {
      examId: "b6000000-0000-4000-8000-000000000002",
      type: "SECTION_DRILL",
      title: "STEP Grammar Drill",
      titleAr: "تدريب القواعد لاختبار ستيب",
      description: "A focused 20-question drill on STEP grammar.",
      totalMinutes: 15,
      sectionStructure: [{ section: "GRAMMAR", questionCount: 20, minutes: 15 }],
      sections: [{ section: "GRAMMAR", count: 20 }],
    },
    {
      examId: "b6000000-0000-4000-8000-000000000003",
      type: "SECTION_DRILL",
      title: "STEP Reading Drill",
      titleAr: "تدريب القراءة لاختبار ستيب",
      description: "A focused 30-question drill on STEP reading comprehension.",
      totalMinutes: 20,
      sectionStructure: [{ section: "READING", questionCount: 30, minutes: 20 }],
      sections: [{ section: "READING", count: 30 }],
    },
  ];

  for (const ex of exams) {
    const pickedIds: { id: string; section: string }[] = [];
    for (const s of ex.sections) {
      for (const id of idsBySection(s.section).slice(0, s.count)) {
        pickedIds.push({ id, section: s.section });
      }
    }
    lines.push(
      `INSERT INTO "TestExam" ("id","type","testType","title","titleAr","description","totalQuestions","totalMinutes","passingScore","sectionStructure","difficulty","isPublished","isAdaptive","updatedAt") VALUES (` +
        `${sqlStr(ex.examId)},'${ex.type}','STEP',${sqlStr(ex.title)},${sqlStr(ex.titleAr)},` +
        `${sqlStr(ex.description)},${pickedIds.length},${ex.totalMinutes},60,` +
        `${sqlJson(ex.sectionStructure)},3,true,false,now()) ON CONFLICT (id) DO NOTHING;`
    );
    let order = 0;
    let secOrder = 0;
    let lastSection = "";
    for (const p of pickedIds) {
      if (p.section !== lastSection) {
        secOrder++;
        lastSection = p.section;
      }
      const eqId = `b6${order.toString(16).padStart(6, "0")}-0000-4000-8000-${ex.examId.slice(-12)}`;
      lines.push(
        `INSERT INTO "ExamQuestion" ("id","examId","questionId","orderIndex","sectionOrder") VALUES (` +
          `${sqlStr(eqId)},${sqlStr(ex.examId)},${sqlStr(p.id)},${order},${secOrder}) ON CONFLICT (id) DO NOTHING;`
      );
      order++;
    }
    lines.push("");
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

const mode = process.argv[2];

if (mode === "--emit-sql") {
  // Write the SQL file synchronously; no DB connection needed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  const out = emitSql();
  fs.writeFileSync(__dirname + "/seed-phase-6.sql", out, "utf8");
  console.log(`✓ Wrote seed-phase-6.sql (${allQuestions.length} questions, 3 exams)`);
  process.exit(0);
} else if (mode === "--emit-chunks") {
  // Emit the seed SQL as numbered chunk files, each small enough to apply
  // via Supabase MCP (the pgbouncer pooler drops long-running jobs).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  const all = emitSql().split("\n");
  const inserts = all.filter((l) => l.startsWith("INSERT INTO"));
  const questionInserts = inserts.filter((l) => l.includes('INTO "TestQuestion"'));
  const examInserts = inserts.filter(
    (l) => l.includes('INTO "TestExam"') || l.includes('INTO "ExamQuestion"')
  );

  const CHUNK = 10;
  const chunks: string[] = [];
  // Chunk 0: clear tables.
  chunks.push(
    [
      'DELETE FROM "ExamAnswer";',
      'DELETE FROM "ExamQuestion";',
      'DELETE FROM "ExamAttempt";',
      'DELETE FROM "TestExam";',
      'DELETE FROM "TestQuestion";',
    ].join("\n")
  );
  // Question chunks.
  for (let i = 0; i < questionInserts.length; i += CHUNK) {
    chunks.push(questionInserts.slice(i, i + CHUNK).join("\n"));
  }
  // Exam chunks (links depend on questions existing — emit after).
  for (let i = 0; i < examInserts.length; i += CHUNK) {
    chunks.push(examInserts.slice(i, i + CHUNK).join("\n"));
  }

  chunks.forEach((c, i) => {
    fs.writeFileSync(
      `${__dirname}/seed-p6-chunk-${String(i).padStart(2, "0")}.sql`,
      c,
      "utf8"
    );
  });
  console.log(`✓ Wrote ${chunks.length} chunk files (seed-p6-chunk-NN.sql)`);
  process.exit(0);
} else {
  main()
    .catch((e) => {
      console.error("❌ Phase 6 seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
