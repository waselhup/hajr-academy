/**
 * Copy and structure for the Early Registration 2026 campaign page.
 *
 * The design handoff shipped the English as a runtime dictionary that swapped
 * text nodes in the browser. That is fine for a preview and wrong for
 * production: search engines and social crawlers only ever see the Arabic,
 * and the English is invisible until JavaScript runs. Here both languages are
 * real content on real routes (/ar/early-registration, /en/early-registration)
 * and each is server-rendered with its own metadata.
 *
 * PRICES ARE NOT IN THIS FILE. Every plan carries a catalogue `slug`; the page
 * reads the number from CatalogProduct so the price advertised and the price
 * charged cannot drift apart.
 */

import { BRAND } from "@/lib/brand";

/** Early-registration pricing closes at the end of this day, KSA time. */
export const OFFER_ENDS_ISO = "2026-08-23T23:59:59+03:00";

export const UTM = "utm_source=landing_page&utm_medium=website&utm_campaign=early_registration_2026";

/**
 * Where a plan button goes.
 *
 * The handoff pointed every button at /register. That is the signup form —
 * it takes no money and knows nothing about which plan was clicked, so the
 * buyer would land on an empty page and the campaign would be unattributable.
 * /checkout?product=<slug> is the route that actually charges, and it
 * pre-selects the plan. UTMs ride along for analytics; checkout ignores them.
 */
export function buyHref(locale: string, slug: string): string {
  return `/${locale}/checkout?product=${encodeURIComponent(slug)}&${UTM}`;
}

export function waHref(isAr: boolean): string {
  const msg = isAr
    ? "أرغب بالمساعدة في اختيار البرنامج"
    : "I would like help choosing the right programme.";
  return `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(msg)}`;
}

export interface PlanCopy {
  slug: string;
  discount: string;
  kicker: string;
  title: string;
  bullets: string[];
  cta: string;
  best?: boolean;
}

export interface ProgramCopy {
  slug: string;
  tag: string;
  title: string;
  titleLatin?: boolean;
  desc: string;
  /** Overrides the catalogue unit label when the design words it differently. */
  unit?: string;
  features: string[];
  cta: string;
  rose?: boolean;
}

export interface TabCopy {
  id: string;
  label: string;
  heading: string;
  sub: string;
  wide?: boolean;
  cards: ProgramCopy[];
}

export function getContent(locale: string) {
  const isAr = locale === "ar";

  return {
    isAr,
    meta: {
      title: isAr
        ? "التسجيل المبكر 2026 | أكاديمية هجر"
        : "Early Registration 2026 | HAJR Academy",
      description: isAr
        ? "سجّل مبكرًا في برنامج التقوية والتطوير الشامل بأكاديمية هجر. خصم يصل إلى 24% حتى 23 أغسطس 2026، وحصص مباشرة وEnglish Lab وواجبات عبر المنصة."
        : "Register early for HAJR Academy's complete English programme. Save up to 24% until 23 August 2026, with live classes, English Lab and platform homework.",
      ogTitle: isAr
        ? "ابدأ العام متقدّمًا | أكاديمية هجر"
        : "Start the year ahead | HAJR Academy",
      ogDescription: isAr
        ? "خصم التسجيل المبكر يصل إلى 24% حتى 23 أغسطس 2026."
        : "Early-registration savings of up to 24% until 23 August 2026.",
    },

    offer: {
      save: isAr ? "خصم يصل إلى" : "Save up to",
      pct: "24%",
      ends: isAr ? "التسجيل المبكر ينتهي في 23 أغسطس" : "Early registration ends 23 August",
      claim: isAr ? "اغتنم العرض" : "Claim the offer",
      ended: isAr ? "انتهى العرض" : "Offer ended",
      dayWord: isAr ? "يوم" : "days",
      hourWord: isAr ? "ساعة" : "hrs",
    },

    nav: {
      aria: isAr ? "التنقل الرئيسي" : "Primary navigation",
      brandAria: isAr ? "أكاديمية هجر" : "HAJR Academy",
      menuAria: isAr ? "فتح القائمة" : "Open menu",
      enroll: isAr ? "اشترك الآن" : "Enroll now",
      links: [
        { href: "#why", label: isAr ? "ماذا يشمل؟" : "What's included?" },
        { href: "#stages", label: isAr ? "المراحل" : "Learning stages" },
        { href: "#early-pricing", label: isAr ? "التسجيل المبكر" : "Early registration" },
        { href: "#all-programs", label: isAr ? "جميع البرامج" : "All programmes" },
        { href: "#faq", label: isAr ? "الأسئلة الشائعة" : "FAQs" },
      ],
    },

    hero: {
      kicker: isAr
        ? "بدأ التسجيل للعام الدراسي 2026"
        : "Enrollment is open for the 2026 school year",
      titleStart: isAr ? "ابدأ العام " : "Start the year ",
      titleAccent: isAr ? "متقدّمًا" : "ahead",
      lead: isAr
        ? "برنامج واحد يجمع تقوية المنهج السعودي وتطوير مهارات الإنجليزية، مع حصص مباشرة وEnglish Lab وتدريب مستمر قبل الحصة وبعدها."
        : "One programme combines Saudi curriculum support with practical English skills, live classes, English Lab and guided practice before and after every class.",
      ctaPrimary: isAr ? "اشترك بسعر التسجيل المبكر" : "Get early-registration pricing",
      ctaSecondary: isAr ? "استعرض جميع البرامج" : "Explore all programmes",
      notes: isAr
        ? ["دفع إلكتروني آمن", "حساب خاص لكل طالب", "فاتورة إلكترونية"]
        : ["Secure online payment", "A personal student account", "Electronic invoice"],
      offerLabel: isAr ? "الشهر الأول" : "First month",
      currency: isAr ? "ريال" : "SAR",
      was: isAr ? "بدل" : "was",
      badge: isAr ? "لجميع المراحل الدراسية" : "For every school stage",
      portraits: [
        { src: "/landing/primary-girl.webp", alt: isAr ? "طالبة من المرحلة الابتدائية" : "Primary school student" },
        { src: "/landing/middle-boy.webp", alt: isAr ? "طالب من المرحلة المتوسطة" : "Intermediate school student" },
        { src: "/landing/high-girl.webp", alt: isAr ? "طالبة من المرحلة الثانوية" : "Secondary school student" },
      ],
    },

    proof: {
      aria: isAr ? "أرقام الأكاديمية" : "Academy at a glance",
      items: [
        { value: "1,200+", label: isAr ? "طالب نشط" : "active students" },
        { value: "45", label: isAr ? "مدرّبًا معتمدًا" : "qualified instructors" },
        { value: "98%", label: isAr ? "نسبة الرضا" : "student satisfaction" },
        { value: "60K+", label: isAr ? "ساعة تدريس" : "teaching hours" },
      ],
    },

    why: {
      eyebrow: isAr ? "أكثر من حصة مباشرة" : "More than a live class",
      title: isAr ? "تعلّم يستمر طوال الأسبوع" : "Learning that continues all week",
      sub: isAr
        ? "داخل الحصة يتفاعل الطالب، وبين الحصص يتدرّب ويطبّق ويتابع تقدمه من حساب واحد."
        : "Students engage during class, then practise, apply and track their progress between sessions from one account.",
      cards: [
        {
          icon: "8",
          title: isAr ? "8 حصص مباشرة شهريًا" : "8 live classes every month",
          desc: isAr
            ? "حصتان أسبوعيًا في مجموعات تفاعلية مع متابعة منتظمة."
            : "Two interactive group classes each week with consistent follow-up.",
        },
        {
          icon: "A°",
          title: isAr ? "المنهج + مهارات اللغة" : "Curriculum + English skills",
          desc: isAr
            ? "نتيجة قريبة في المدرسة ولغة أقوى تخدم مستقبل الطالب."
            : "Stronger school performance and English skills that support the student's future.",
        },
        {
          icon: "EL",
          title: "English Lab",
          latin: true,
          desc: isAr
            ? "واجبات وتمارين تفاعلية يستفيد منها الطالب قبل الحصة وبعدها."
            : "Interactive homework and practice before and after every class.",
        },
        {
          icon: "Hi",
          title: isAr ? "محادثات شهرية" : "Monthly conversations",
          desc: isAr
            ? "فرصة حقيقية لممارسة اللغة في لقاءات مع طلاب أجانب."
            : "Real opportunities to practise English with international students.",
        },
      ],
    },

    stages: {
      eyebrow: isAr ? "لكل مرحلة هدفها" : "A clear goal for every stage",
      title: isAr ? "برنامج يتطور مع رحلة الطالب" : "A programme that grows with every student",
      sub: isAr
        ? "من تأسيس اللغة وحبها، إلى الثقة، ثم الاستعداد للجامعة والاختبارات والفرص."
        : "From strong foundations and confidence to university, exams and future opportunities.",
      cards: [
        {
          label: isAr ? "الابتدائي" : "Primary",
          title: isAr ? "تأسيس ومنهج" : "Strong foundations",
          desc: isAr
            ? "يفهم المنهج ويبني أساسًا لغويًا صحيحًا من البداية."
            : "Understand the curriculum while building accurate English from the start.",
          points: isAr
            ? ["شرح مبسط", "نطق ومفردات", "تعلم ممتع"]
            : ["Clear explanations", "Pronunciation and vocabulary", "Enjoyable learning"],
          img: "/landing/primary-girl.webp",
          alt: isAr ? "طالبة ابتدائية" : "Primary school student",
        },
        {
          label: isAr ? "المتوسط" : "Intermediate",
          title: isAr ? "ثقة واستعداد" : "Confidence and readiness",
          desc: isAr
            ? "يكسر التردد، يقرأ بصورة أوسع، ويستعد للمرحلة التالية."
            : "Build confidence, read more widely and prepare for the next stage.",
          points: isAr
            ? ["تقوية المنهج", "تحدث مستمر", "قراءة أوسع"]
            : ["Curriculum support", "Regular speaking", "Wider reading"],
          img: "/landing/middle-boy.webp",
          alt: isAr ? "طالب متوسط" : "Intermediate school student",
        },
        {
          label: isAr ? "الثانوي" : "Secondary",
          title: isAr ? "جامعة واختبارات" : "University and exams",
          desc: isAr
            ? "لغة أقوى وتأسيس مبكر للاختبارات والفرص القادمة."
            : "Stronger English and an early start on exams and future opportunities.",
          points: isAr
            ? ["STEP وIELTS", "CPC وITC", "محادثات شهرية"]
            : ["STEP and IELTS", "CPC and ITC", "Monthly conversations"],
          img: "/landing/high-girl.webp",
          alt: isAr ? "طالبة ثانوية" : "Secondary school student",
        },
      ],
    },

    pricing: {
      eyebrow: isAr ? "أسعار التسجيل المبكر" : "Early-registration pricing",
      title: isAr ? "اختر البداية الأنسب لك" : "Choose the plan that fits you",
      sub: isAr
        ? "نفس البرنامج لجميع المراحل، وقيمة أفضل كلما التزمت بمدة أطول."
        : "The same complete programme for every stage, with better value on longer plans.",
      summaryTitle: isAr ? "اغتنم الفرصة وابدأ العام أقوى" : "Start the school year stronger",
      summaryBody: isAr
        ? "يدفع سعر باقتي 4 أشهر والعام الدراسي مقدمًا للاستفادة من الخصم."
        : "The 4-month and school-year plans are paid upfront to secure the discounted price.",
      endsLabel: isAr ? "ينتهي 23 أغسطس 2026" : "Ends 23 August 2026",
      currency: isAr ? "ريال" : "SAR",
      was: isAr ? "بدل" : "was",
      secure: isAr ? "دفع آمن عبر" : "Secure payment via",
      invoice: isAr ? "+ فاتورة إلكترونية" : "+ electronic invoice",
      chips: [isAr ? "مدى" : "mada", "VISA", "Mastercard", "Apple Pay", "STC Pay"],
      plans: [
        {
          slug: "early-first-month",
          discount: isAr ? "خصم 14%" : "Save 14%",
          kicker: isAr ? "بداية مرنة" : "Flexible start",
          title: isAr ? "الشهر الأول" : "First month",
          bullets: isAr
            ? ["8 حصص مباشرة", "حساب الطالب وEnglish Lab", "ثم 350 ريالًا شهريًا"]
            : ["8 live classes", "Student account and English Lab", "Then SAR 350 per month"],
          cta: isAr ? "اشترك بالشهر الأول" : "Start with the first month",
        },
        {
          slug: "early-4-months",
          discount: isAr ? "خصم 19%" : "Save 19%",
          kicker: isAr ? "التزام أوفر" : "Better long-term value",
          title: isAr ? "باقة 4 أشهر" : "4-month plan",
          bullets: isAr
            ? ["32 حصة مباشرة", "285 ريالًا شهريًا", "جميع مزايا المنصة"]
            : ["32 live classes", "SAR 285 per month", "All platform benefits"],
          cta: isAr ? "اشترك لمدة 4 أشهر" : "Choose the 4-month plan",
        },
        {
          slug: "early-academic-year",
          discount: isAr ? "خصم 24%" : "Save 24%",
          kicker: isAr ? "أفضل قيمة" : "Best value",
          title: isAr ? "العام الدراسي" : "School-year plan",
          bullets: isAr
            ? ["9 أشهر تعليمية", "نحو 267 ريالًا شهريًا", "استمرارية طوال العام"]
            : ["9 learning months", "About SAR 267 per month", "Consistent learning all year"],
          cta: isAr ? "احجز أفضل قيمة" : "Secure the best value",
          best: true,
        },
      ] as PlanCopy[],
    },

    programs: {
      eyebrow: isAr ? "جميع برامج أكاديمية هجر" : "All HAJR Academy programmes",
      title: isAr ? "لكل هدف مساره الواضح" : "A clear path for every goal",
      sub: isAr
        ? "اختر البرنامج الأقرب لاحتياجك، ثم أنشئ حسابك وأكمل الدفع مباشرة من الموقع."
        : "Choose the programme that matches your goal, create your account and complete payment securely online.",
      tablistAria: isAr ? "تصنيفات البرامج" : "Programme categories",
      tabs: [
        {
          id: "program-language",
          label: isAr ? "برامج اللغة" : "English programmes",
          heading: isAr ? "اللغة حسب العمر والهدف" : "English for every age and goal",
          sub: isAr
            ? "برامج شهرية مباشرة مع تدريب إضافي عبر المنصة."
            : "Monthly live programmes with additional guided practice on the platform.",
          cards: [
            {
              slug: "english-for-kids",
              tag: isAr ? "إثرائي للأطفال" : "Enrichment for children",
              title: "English for Kids",
              titleLatin: true,
              desc: isAr
                ? "محادثة ونطق وقصص وألعاب؛ برنامج مختلف عن تقوية المنهج."
                : "Speaking, pronunciation, stories and games — distinct from school curriculum support.",
              features: isAr ? ["مجموعات صغيرة", "English Lab"] : ["Small groups", "English Lab"],
              cta: isAr ? "اشترك في البرنامج" : "Join the programme",
            },
            {
              slug: "general-english",
              tag: isAr ? "للبالغين والجامعيين" : "For adults and university students",
              title: "General English",
              titleLatin: true,
              desc: isAr
                ? "قراءة واستماع وتحدث وكتابة بصورة متوازنة."
                : "Balanced development across reading, listening, speaking and writing.",
              features: isAr
                ? ["8 حصص شهرية", "حساب الطالب وEnglish Lab"]
                : ["8 classes per month", "Student account and English Lab"],
              cta: isAr ? "اشترك في البرنامج" : "Join the programme",
            },
            {
              slug: "business-english",
              tag: isAr ? "للموظفين والباحثين عن عمل" : "For professionals and job seekers",
              title: "Business English",
              titleLatin: true,
              desc: isAr
                ? "اجتماعات وعروض وبريد مهني ومقابلات."
                : "Practical English for meetings, presentations, professional email and interviews.",
              features: isAr
                ? ["مواقف عمل عملية", "تدريب عبر المنصة"]
                : ["Real workplace scenarios", "Platform-based practice"],
              cta: isAr ? "اشترك في البرنامج" : "Join the programme",
            },
          ],
        },
        {
          id: "program-exams",
          label: isAr ? "الاختبارات والقبول" : "Exams and admissions",
          heading: isAr ? "الاختبارات والقبول" : "Exams and admissions",
          sub: isAr
            ? "تحضير منظم على نمط الاختبار، دون وعود بنتيجة مضمونة."
            : "Structured preparation for the test format, without unrealistic score guarantees.",
          wide: true,
          cards: [
            {
              slug: "step-course",
              tag: isAr ? "اختبار STEP" : "STEP test",
              title: isAr ? "دورة STEP التحضيرية" : "STEP preparation course",
              desc: isAr
                ? "تدريب مركز بدل المذاكرة العشوائية."
                : "Focused preparation instead of unstructured study.",
              features: isAr
                ? ["تدريب على النمط", "خطة واضحة"]
                : ["Test-format practice", "A clear study plan"],
              cta: isAr ? "اشترك في STEP" : "Join STEP preparation",
            },
            {
              slug: "ielts-toefl-course",
              tag: isAr ? "اختبارات دولية" : "International exams",
              title: "IELTS / TOEFL",
              titleLatin: true,
              desc: isAr
                ? "استعداد شامل للمهارات المطلوبة للقبول."
                : "Complete preparation across the skills required for admission.",
              features: isAr
                ? ["المهارات الأربع", "تدريب مرتبط بهدفك"]
                : ["All four skills", "Goal-based preparation"],
              cta: isAr ? "اشترك في الدورة" : "Join the course",
            },
            {
              slug: "cpc-prep",
              tag: isAr ? "مسار CPC" : "CPC track",
              title: isAr ? "تحضير الإنجليزية لـCPC" : "English preparation for CPC",
              desc: isAr ? "3 أسابيع و12 حصة مباشرة." : "3 weeks and 12 live classes.",
              features: isAr ? ["اختباران محاكيان", "إنجليزي فقط"] : ["2 mock tests", "English only"],
              cta: isAr ? "اشترك في CPC" : "Join CPC preparation",
            },
            {
              slug: "itc-prep",
              tag: isAr ? "مسار ITC" : "ITC track",
              title: isAr ? "تحضير الإنجليزية لـITC" : "English preparation for ITC",
              desc: isAr ? "3 أسابيع و12 حصة مباشرة." : "3 weeks and 12 live classes.",
              features: isAr ? ["اختباران محاكيان", "إنجليزي فقط"] : ["2 mock tests", "English only"],
              cta: isAr ? "اشترك في ITC" : "Join ITC preparation",
            },
          ],
        },
        {
          id: "program-private",
          label: isAr ? "فردي 1:1" : "Private 1:1",
          heading: isAr ? "تعلم فردي 1:1" : "Private 1:1 learning",
          sub: isAr
            ? "موعد مرن، خطة شخصية، وتركيز كامل على هدفك."
            : "Flexible scheduling, a personal plan and complete focus on your goal.",
          wide: true,
          cards: [
            {
              slug: "private-intl-8",
              tag: isAr ? "معلم دولي" : "International tutor",
              title: isAr ? "8 حصص فردية" : "8 private classes",
              desc: isAr ? "25 دقيقة من التركيز الكامل." : "25 focused minutes per class.",
              features: isAr ? ["38 ريالًا للحصة", "خطة شخصية"] : ["SAR 38 per class", "Personal plan"],
              cta: isAr ? "اشترك في 8 حصص" : "Choose 8 classes",
            },
            {
              slug: "private-intl-12",
              tag: isAr ? "أفضل قيمة · معلم دولي" : "Best value · International tutor",
              title: isAr ? "12 حصة فردية" : "12 private classes",
              desc: isAr ? "الخيار الأقل في سعر الحصة." : "Our lowest price per private class.",
              features: isAr
                ? ["35 ريالًا للحصة", "25 دقيقة للحصة"]
                : ["SAR 35 per class", "25 minutes per class"],
              cta: isAr ? "اشترك في 12 حصة" : "Choose 12 classes",
              rose: true,
            },
            {
              slug: "private-native-8",
              tag: isAr ? "متحدث أصلي" : "Native speaker",
              title: isAr ? "8 حصص مع Native" : "8 classes with a native speaker",
              desc: isAr ? "نطق وطلاقة وتفاعل طبيعي." : "Natural pronunciation, fluency and real conversation.",
              features: isAr ? ["متحدث أصلي", "25 دقيقة للحصة"] : ["Native speaker", "25 minutes per class"],
              cta: isAr ? "اختر باقة Native" : "Choose this plan",
            },
            {
              slug: "private-native-12",
              tag: isAr ? "متحدث أصلي" : "Native speaker",
              title: isAr ? "12 حصة مع Native" : "12 classes with a native speaker",
              desc: isAr ? "أكبر قدر من الممارسة مع متحدث أصلي." : "The most practice with a native speaker.",
              features: isAr ? ["متحدث أصلي", "25 دقيقة للحصة"] : ["Native speaker", "25 minutes per class"],
              cta: isAr ? "اختر باقة Native" : "Choose this plan",
            },
          ],
        },
      ] as TabCopy[],
    },

    lab: {
      eyebrow: isAr ? "منصة الطالب · English Lab" : "Student platform · English Lab",
      title: isAr ? "التعلّم ما يوقف بعد الحصة" : "Learning continues beyond the class",
      sub: isAr
        ? "حساب خاص يجمع الواجبات والتدريب والتقدم في مكان واحد، قبل الحصة وبعدها."
        : "A personal account that brings homework, practice and progress together before and after class.",
      points: [
        { t: isAr ? "قبل الحصة" : "Before class", d: isAr ? "تهيئة ومراجعة." : "Prepare and review." },
        { t: isAr ? "بعد الحصة" : "After class", d: isAr ? "تطبيق وتثبيت." : "Practise and reinforce." },
        { t: isAr ? "واجبات المنصة" : "Platform homework", d: isAr ? "تنفيذ ومتابعة." : "Complete and track." },
        { t: isAr ? "تغذية راجعة" : "Feedback", d: isAr ? "تقدم بصورة أوضح." : "See progress clearly." },
      ],
      stepsAria: isAr ? "خطوات التسجيل" : "Enrollment steps",
      steps: isAr
        ? ["أنشئ حسابك", "اختر برنامجك", "ادفع وابدأ"]
        : ["Create your account", "Choose your programme", "Pay and start"],
      screen: {
        progressLabel: isAr ? "تقدمك هذا الأسبوع" : "Your progress this week",
        progressTitle: isAr ? "استمر… أنت أقرب لهدفك" : "Keep going — you're closer to your goal",
        tasks: [
          { t: isAr ? "مفردات الأسبوع" : "Weekly vocabulary", s: isAr ? "8 من 10 مكتملة" : "8 of 10 completed" },
          { t: isAr ? "تدريب الاستماع" : "Listening practice", s: isAr ? "جاهز للبدء" : "Ready to start" },
          { t: isAr ? "واجب الحصة" : "Class homework", s: isAr ? "تم التسليم" : "Submitted" },
          { t: isAr ? "محادثة قصيرة" : "Quick conversation", s: isAr ? "نشاط اليوم" : "Today's activity" },
        ],
      },
    },

    faq: {
      eyebrow: isAr ? "الأسئلة الشائعة" : "FAQs",
      title: isAr ? "قبل ما تشترك" : "Before you enroll",
      sub: isAr
        ? "إجابات واضحة لأهم الأسئلة قبل الدفع."
        : "Clear answers to the most important questions before payment.",
      items: [
        {
          q: isAr ? "هل سعر 300 ريال يستمر كل شهر؟" : "Does the SAR 300 price continue every month?",
          a: isAr
            ? "سعر 300 ريال خاص بالشهر الأول ضمن التسجيل المبكر، ثم يعود الاشتراك الشهري إلى 350 ريالًا."
            : "SAR 300 is the early-registration price for the first month. The monthly fee then returns to SAR 350.",
        },
        {
          q: isAr ? "ما مدة باقة العام الدراسي؟" : "How long is the school-year plan?",
          a: isAr
            ? "تغطي 9 أشهر تعليمية بسعر 2,400 ريال بدلًا من 3,150 ريالًا، وتدفع مقدمًا للاستفادة من الخصم."
            : "It covers 9 learning months for SAR 2,400 instead of SAR 3,150 and is paid upfront to secure the discount.",
        },
        {
          q: isAr ? "هل الحصص مباشرة أم مسجلة؟" : "Are the classes live or recorded?",
          a: isAr
            ? "الحصص مباشرة وتفاعلية عبر الإنترنت، ويرافقها حساب الطالب وEnglish Lab للتدريب المستمر."
            : "Classes are live and interactive online, supported by a student account and English Lab for continuous practice.",
        },
        {
          q: isAr ? "كيف يتم الدفع؟" : "How can I pay?",
          a: isAr
            ? "من خلال الموقع عبر مدى وفيزا وماستركارد وأبل باي وSTC Pay، مع فاتورة إلكترونية لكل عملية."
            : "Pay securely on the website using mada, Visa, Mastercard, Apple Pay or STC Pay, with an electronic invoice for every transaction.",
        },
      ],
    },

    finalCta: {
      title: isAr ? "مستعد تبدأ العام متقدّمًا؟" : "Ready to start the year ahead?",
      sub: isAr
        ? "اختر باقتك الآن قبل انتهاء أسعار التسجيل المبكر في 23 أغسطس."
        : "Choose your plan before early-registration pricing ends on 23 August.",
      primary: isAr ? "اشترك وادفع عبر الموقع" : "Enroll and pay online",
      secondary: isAr ? "اسأل خدمة العملاء" : "Ask customer support",
    },

    footer: {
      about: isAr
        ? "أكاديمية سعودية لتعليم الإنجليزية مباشرة عبر الإنترنت، من الأحساء إلى كل المملكة."
        : "A Saudi online English academy serving learners across the Kingdom from Al Ahsa.",
      earlyTitle: isAr ? "التسجيل المبكر" : "Early registration",
      earlyLinks: isAr
        ? ["الشهر الأول", "4 أشهر", "العام الدراسي"]
        : ["First month", "4 months", "School year"],
      programsTitle: isAr ? "البرامج" : "Programmes",
      programsLinks: isAr
        ? ["برامج اللغة", "تحضير الاختبارات", "تعلم فردي 1:1"]
        : ["English programmes", "Exam preparation", "Private 1:1"],
      contactTitle: isAr ? "تواصل معنا" : "Contact us",
      whatsappLabel: isAr ? "واتساب:" : "WhatsApp:",
      copyright: isAr
        ? "© 2026 HAJR A° Academy · الأحساء، المملكة العربية السعودية"
        : "© 2026 HAJR A° Academy · Al Ahsa, Saudi Arabia",

      // The homepage is now the only entry point for the whole site, so every
      // route a visitor might need has to be reachable from this footer.
      academyTitle: isAr ? "الأكاديمية" : "The academy",
      academyLinks: [
        { href: "/trial", label: isAr ? "حصة تجريبية مجانية" : "Free trial lesson" },
        { href: "/checkout", label: isAr ? "الاشتراك والدفع" : "Enroll and pay" },
        { href: "/login", label: isAr ? "تسجيل الدخول" : "Sign in" },
        { href: "/register", label: isAr ? "إنشاء حساب" : "Create an account" },
        { href: "/apply-to-teach", label: isAr ? "انضم كمعلّم" : "Teach with us" },
        { href: "/conversation-partner", label: isAr ? "كن شريك محادثة" : "Become a conversation partner" },
        { href: "/partners/apply", label: isAr ? "شراكات النجاح" : "Success partnerships" },
      ],

      legalTitle: isAr ? "السياسات والأحكام" : "Policies and terms",
      legalLinks: [
        { href: "/policies/terms", label: isAr ? "الشروط والأحكام" : "Terms & Conditions" },
        { href: "/policies/privacy", label: isAr ? "سياسة الخصوصية" : "Privacy Policy" },
        { href: "/policies/refund", label: isAr ? "سياسة الاسترجاع" : "Refund Policy" },
        { href: "/policies/payment", label: isAr ? "سياسة الدفع" : "Payment Policy" },
      ],

      crLabel: isAr ? "السجل التجاري" : "CR",
      vatLabel: isAr ? "الرقم الضريبي" : "VAT",
      vatIncluded: isAr
        ? "جميع الأسعار بالريال السعودي وشاملة ضريبة القيمة المضافة 15%."
        : "All prices are in Saudi Riyals and include 15% VAT.",
    },

    whatsappAria: isAr
      ? "تواصل مع خدمة العملاء على واتساب"
      : "Contact customer support on WhatsApp",
  };
}

export type Content = ReturnType<typeof getContent>;
