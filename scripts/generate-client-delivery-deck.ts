/**
 * Client Delivery Deck — generates TWO PowerPoint files (AR + EN).
 * Focus: every teacher-feedback item with status + a clickable link
 *        the owner can open during the call.
 *
 * Run:    npx tsx scripts/generate-client-delivery-deck.ts
 * Output: C:\Users\WIN11-24H2GPT\hajar aca\HAJR_DELIVERY_AR.pptx
 *         C:\Users\WIN11-24H2GPT\hajar aca\HAJR_DELIVERY_EN.pptx
 */
import pptxgen from "pptxgenjs";
import path from "path";

// ───────────── Brand v3 (LOCKED) ─────────────
const C = {
  navy: "1E2A36",
  charcoal: "2C3E50",
  ivory: "FAF6EE",
  rose: "B86E7B",
  mint: "B5E5D8",
  charcoalLight: "6B7A8A",
  doneGreen: "4A7C59",
  pendingAmber: "B98A4E",
} as const;

const BASE = "https://hajr-academy.vercel.app";

// ───────────── Feature catalog ─────────────
// One entry per teacher-feedback item. Status: "done" (مُنفّذ) or "pending" (قيد التطوير).
type Status = "done" | "pending";
type Item = {
  ar: { title: string; ask: string; built: string };
  en: { title: string; ask: string; built: string };
  status: Status;
  links: { ar: string; en: string; label_ar: string; label_en: string }[];
};

const ITEMS: Item[] = [
  {
    ar: {
      title: "صفحة المسوّقين",
      ask: "العمولات، حالتها، تاريخ الاستحقاق، الطلاب المسجّلين، والتواصل مع الإدارة.",
      built:
        "لوحة مسوّق كاملة: عمولات معلّقة/معتمدة/مدفوعة، كود إحالة قابل للنسخ ومشاركته على واتساب، قائمة الطلاب المُحالين، وقناة تواصل مع الإدارة.",
    },
    en: {
      title: "Marketer Page",
      ask: "Commissions, status, due dates, referred students, and direct line to admin.",
      built:
        "Full marketer dashboard: pending / approved / paid commissions, copy-and-share referral code (WhatsApp), referred-students list, admin chat channel.",
    },
    status: "done",
    links: [
      { ar: "/ar/marketer", en: "/en/marketer", label_ar: "لوحة المسوّق", label_en: "Marketer Dashboard" },
      {
        ar: "/ar/marketer/commissions",
        en: "/en/marketer/commissions",
        label_ar: "العمولات",
        label_en: "Commissions",
      },
      {
        ar: "/ar/admin/marketers",
        en: "/en/admin/marketers",
        label_ar: "إدارة المسوّقين (مدير)",
        label_en: "Admin · Marketers",
      },
    ],
  },
  {
    ar: {
      title: "التقويم الدراسي والإداري",
      ask: "تقويم خاص بالمعلم، الطالب، الإدارة، والموظفين — يشمل الدراسة، الإجازات، الدفع، الاجتماعات.",
      built:
        "تقويم موحّد لكل الأدوار. يعرض الحصص، الاختبارات، الإجازات الرسمية السعودية، الاجتماعات، تواريخ الدفع، ونادي المحادثة — كلٌّ يرى ما يخصّه فقط.",
    },
    en: {
      title: "Unified Academic & Admin Calendar",
      ask: "Calendars for teacher, student, admin, staff — covering classes, holidays, payments, meetings.",
      built:
        "One universal calendar for every role. Shows classes, exams, Saudi holidays, meetings, payment dates, and Speaking Club — filtered per user automatically.",
    },
    status: "done",
    links: [
      { ar: "/ar/calendar", en: "/en/calendar", label_ar: "التقويم الموحّد", label_en: "Universal Calendar" },
    ],
  },
  {
    ar: {
      title: "داشبورد المعلمين الشامل",
      ask: "كل المعلمين، بياناتهم، التخصص، الجداول، عدد الطلاب، التفعيل، التقييمات، الملفات، العقود، الحضور، الجاهزية.",
      built:
        "لوحة إدارة شاملة لكل معلم + ملف عام شبيه بـ Preply لكل معلم (فيديو تعريفي، تخصص، تقييم، شارة \"معتمد\"). نظام الجاهزية التقنية مفعّل.",
    },
    en: {
      title: "Comprehensive Teacher Dashboard",
      ask: "All teachers: personal data, specialization, schedules, students, activation, ratings, files, contracts, attendance, readiness.",
      built:
        "Admin command center per teacher + a Preply-style public profile (intro video, specialization, rating, “Verified” badge). Technical readiness system live.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/admin/teachers",
        en: "/en/admin/teachers",
        label_ar: "إدارة المعلمين",
        label_en: "Admin · Teachers",
      },
      {
        ar: "/ar/teachers",
        en: "/en/teachers",
        label_ar: "ملفات المعلمين العامة",
        label_en: "Public Teacher Profiles",
      },
      {
        ar: "/ar/teacher/readiness",
        en: "/en/teacher/readiness",
        label_ar: "نموذج الجاهزية",
        label_en: "Readiness Form",
      },
    ],
  },
  {
    ar: {
      title: "داشبورد الطلاب والطالبات",
      ask: "اشتراك في نادي اللغة، اللقاءات الأسبوعية، الأنشطة والمسابقات — بلغتين عربي/إنجليزي.",
      built:
        "لوحة طالب ثنائية اللغة، نادي محادثة بحجز فوري، حصص قادمة، تقدّم المستوى، شهادات، وملخّصات الدروس المدعومة بالذكاء الاصطناعي.",
    },
    en: {
      title: "Student Dashboard",
      ask: "Sign-up for English club, weekly meetings, activities and contests — Arabic + English.",
      built:
        "Bilingual student dashboard, Speaking Club with one-tap RSVP, upcoming classes, level progress, certificates, AI lesson summaries.",
    },
    status: "done",
    links: [
      { ar: "/ar/student", en: "/en/student", label_ar: "لوحة الطالب", label_en: "Student Dashboard" },
      {
        ar: "/ar/student/speaking-club",
        en: "/en/student/speaking-club",
        label_ar: "نادي المحادثة",
        label_en: "Speaking Club",
      },
      {
        ar: "/ar/student/progress",
        en: "/en/student/progress",
        label_ar: "تقدّم المستوى",
        label_en: "Level Progress",
      },
    ],
  },
  {
    ar: {
      title: "اختبار تحديد المستوى",
      ask: "اختبار قراءة وقواعد ومفردات + استماع + محادثة عبر Zoom (اختياري) + تحديد تلقائي + تقرير مفصّل + اقتراح برنامج + حفظ في الحساب.",
      built:
        "اختبار CEFR كامل (A1 إلى C2)، مفتوح للضيوف بدون تسجيل دخول، يصدر تقرير PDF بهوية الأكاديمية ويُرسَل بالبريد. التحديد تلقائي ويُحفظ في حساب الطالب فور التسجيل.",
    },
    en: {
      title: "Placement Test System",
      ask: "Reading + Grammar + Vocab + Listening + optional Zoom speaking, auto-level, detailed report, program recommendation, saved to account.",
      built:
        "Full CEFR test (A1–C2), open to guests with no login. Generates branded PDF report and emails it. Auto-leveling + auto-linking to the student's account on signup.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/placement-test",
        en: "/en/placement-test",
        label_ar: "صفحة الاختبار (للجمهور)",
        label_en: "Public Placement Test",
      },
      {
        ar: "/ar/admin/placement-tests",
        en: "/en/admin/placement-tests",
        label_ar: "نتائج الاختبارات (مدير)",
        label_en: "Admin · Placement Results",
      },
    ],
  },
  {
    ar: {
      title: "ملف الهوية البصرية",
      ask: "شعار، ألوان رسمية، خطوط، قوالب عروض ودروس، وعناصر الهوية.",
      built:
        "صفحة Brand Kit داخل النظام + كتيّب هوية PDF من 10 صفحات (قواعد الاستخدام، الألوان HEX/RGB/CMYK، الخطوط، قوالب). جاهز للتنزيل والإرسال للمصمم.",
    },
    en: {
      title: "Brand Identity Kit",
      ask: "Logo, official colors, fonts, presentation/lesson templates, brand elements.",
      built:
        "In-product Brand Kit page + a 10-page PDF Brand Book (usage rules, HEX/RGB/CMYK colors, fonts, templates). Downloadable and ready to hand to any designer.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/admin/brand-kit",
        en: "/en/admin/brand-kit",
        label_ar: "ملف الهوية (مدير)",
        label_en: "Admin · Brand Kit",
      },
      { ar: "/ar/brand", en: "/en/brand", label_ar: "الهوية (صفحة عامة)", label_en: "Brand (Public)" },
    ],
  },
  {
    ar: {
      title: "الجاهزية التقنية والتعليمية للمعلم",
      ask: "قياس الجاهزية التعليمية، المهارات التقنية، إدارة Zoom، الأدوات التفاعلية، المهارات التربوية.",
      built:
        "قائمة تحقّق ذاتيّة للمعلم (Zoom، الأدوات الرقمية، حصة تجريبية، تقييم ذاتي) + اعتماد إداري + شارة \"معتمد\" تظهر للأهالي قبل الحجز.",
    },
    en: {
      title: "Teacher Readiness & Tech Literacy",
      ask: "Measure teaching readiness, technical skill, Zoom mastery, interactive tools, pedagogy.",
      built:
        "Self-assessed teacher checklist (Zoom, digital tools, mock class, self-rating) + admin verification + a “Verified” badge shown to parents before booking.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/teacher/readiness",
        en: "/en/teacher/readiness",
        label_ar: "صفحة الجاهزية (معلم)",
        label_en: "Teacher · Readiness",
      },
    ],
  },
  {
    ar: {
      title: "اجتماعات المعلمين الشهرية",
      ask: "مواعيد، حضور، محاور، توصيات، ومهام.",
      built:
        "جدول اجتماعات شهري + جدول أعمال + تسجيل حضور + محضر اجتماع قابل للتحرير + قائمة مهام مع المسؤول وحالة الإنجاز.",
    },
    en: {
      title: "Monthly Teacher Meetings",
      ask: "Schedules, attendance, agenda, recommendations, action items.",
      built:
        "Monthly meeting scheduler + agenda + attendance tracking + editable minutes + action-item list with owners and status.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/admin/teacher-meetings",
        en: "/en/admin/teacher-meetings",
        label_ar: "اجتماعات المعلمين (مدير)",
        label_en: "Admin · Teacher Meetings",
      },
      {
        ar: "/ar/teacher/meetings",
        en: "/en/teacher/meetings",
        label_ar: "اجتماعاتي (معلم)",
        label_en: "Teacher · My Meetings",
      },
    ],
  },
  {
    ar: {
      title: "طلبات الدفع",
      ask: "طلب بتاريخ محدّد، متابعة الحالة، تذكيرات، سجل المدفوعات.",
      built:
        "صفحة طلب دفع للمعلم والمسوّق + لوحة اعتماد للإدارة + تنبيهات تلقائية عند كل تغيّر في الحالة + سجل كامل ومدفوعات سابقة.",
    },
    en: {
      title: "Payment Requests",
      ask: "Date-based requests, status tracking, reminders, payment history.",
      built:
        "Payment-request page for teachers + marketers, admin approval flow, automatic notifications on every status change, full audit log.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/teacher/payment-requests",
        en: "/en/teacher/payment-requests",
        label_ar: "طلبات الدفع (معلم)",
        label_en: "Teacher · Payment Requests",
      },
      {
        ar: "/ar/marketer/payment-requests",
        en: "/en/marketer/payment-requests",
        label_ar: "طلبات الدفع (مسوّق)",
        label_en: "Marketer · Payment Requests",
      },
      {
        ar: "/ar/admin/payment-requests",
        en: "/en/admin/payment-requests",
        label_ar: "اعتماد المدفوعات (مدير)",
        label_en: "Admin · Approvals",
      },
    ],
  },
  {
    ar: {
      title: "نظام التذاكر الداخلي",
      ask: "شكاوى، مقترحات، دعم فني/إداري، متابعة الحالة، رد، تصنيف حسب النوع والأولوية.",
      built:
        "تذاكر لكل دور + تصنيف ذكي بالذكاء الاصطناعي (مالي/تقني/تربوي/اقتراح) + لوحة كانبان للإدارة بالسحب والإفلات + إشعارات لحظية.",
    },
    en: {
      title: "Internal Ticket System",
      ask: "Complaints, suggestions, tech/admin support, status tracking, replies, categorization by type and priority.",
      built:
        "Tickets for every role + AI auto-categorization (financial / technical / pedagogical / suggestion) + drag-and-drop kanban board for admin + real-time updates.",
    },
    status: "done",
    links: [
      { ar: "/ar/tickets", en: "/en/tickets", label_ar: "تذاكري", label_en: "My Tickets" },
      {
        ar: "/ar/admin/tickets",
        en: "/en/admin/tickets",
        label_ar: "لوحة التذاكر (مدير)",
        label_en: "Admin · Tickets",
      },
    ],
  },
  {
    ar: {
      title: "زر الدخول والتسجيل في الأعلى",
      ask: "نقل أيقونة الدخول/التسجيل إلى أعلى الصفحة الرئيسية لتكون أوضح وأسهل وصولًا.",
      built:
        "زرّان بارزان في أعلى الصفحة الرئيسية: \"تسجيل الدخول\" + \"إنشاء حساب\" بحجم تَلَمُّس ≥ 44 بكسل، يعملان على الجوال واللوحي والديسكتوب.",
    },
    en: {
      title: "Prominent Sign-In / Register",
      ask: "Move Sign-In / Register to the top of the landing page for easier access.",
      built:
        "Two highly visible buttons at the very top: “Sign In” + “Create Account”, ≥ 44px tap-targets, work flawlessly on mobile, tablet, and desktop.",
    },
    status: "done",
    links: [
      { ar: "/ar", en: "/en", label_ar: "الصفحة الرئيسية", label_en: "Landing Page" },
    ],
  },
  {
    ar: {
      title: "تقرير ولي الأمر الشهري",
      ask: "تقرير شهري شامل: حضور، تسجيلات، دروس مكتملة، ملاحظات المعلم، تقدّم المستوى، حالة الدفع.",
      built:
        "تقرير PDF يُولَّد تلقائيًا في اليوم الأول من كل شهر ويُرسَل بريدًا لولي الأمر، مع صورة قابلة للمشاركة عبر واتساب وروابط آخر 4 تسجيلات.",
    },
    en: {
      title: "Monthly Parent Report",
      ask: "Full monthly report: attendance, recordings, completed lessons, teacher notes, level progress, payment status.",
      built:
        "PDF report auto-generated on the 1st of each month, emailed to parent, with a WhatsApp-shareable image and links to the last 4 class recordings.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/parent/reports",
        en: "/en/parent/reports",
        label_ar: "تقارير ولي الأمر",
        label_en: "Parent · Reports",
      },
    ],
  },
  {
    ar: {
      title: "الشهادات بكود QR قابل للتحقّق",
      ask: "(إضافة من الاستشارة) — شهادات إتمام مستوى موثوقة.",
      built:
        "كل شهادة تحمل رمز QR يقود إلى صفحة تحقّق علنية تعرض اسم الطالب، المستوى، التاريخ، وختم الأكاديمية. لا يمكن تزويرها.",
    },
    en: {
      title: "QR-Verified Certificates",
      ask: "(Consultancy addition) — trustworthy level-completion certificates.",
      built:
        "Every certificate carries a QR code linking to a public verification page (student name, level, date, academy seal). Forgery-proof.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/student/certificates",
        en: "/en/student/certificates",
        label_ar: "شهاداتي (طالب)",
        label_en: "Student · Certificates",
      },
      {
        ar: "/ar/admin/certificates",
        en: "/en/admin/certificates",
        label_ar: "إصدار الشهادات (مدير)",
        label_en: "Admin · Issue Certificates",
      },
      { ar: "/ar/verify", en: "/en/verify", label_ar: "صفحة التحقّق", label_en: "Verify Page" },
    ],
  },
  {
    ar: {
      title: "ملخّصات الدروس بالذكاء الاصطناعي",
      ask: "(تطوير إضافي) — ملاحظات بعد كل حصة.",
      built:
        "بعد كل حصة Zoom، يولّد Claude Haiku ملخصًا ثنائي اللغة + بطاقات مفردات + واجب بيتي. يصل للطالب وولي الأمر تلقائيًا.",
    },
    en: {
      title: "AI Lesson Summaries",
      ask: "(Beyond expectation) — post-class learning notes.",
      built:
        "After every Zoom class, Claude Haiku generates a bilingual summary + vocab cards + homework. Auto-delivered to student and parent.",
    },
    status: "done",
    links: [
      {
        ar: "/ar/student/sessions",
        en: "/en/student/sessions",
        label_ar: "ملخّصات الدروس (طالب)",
        label_en: "Student · Sessions",
      },
      {
        ar: "/ar/teacher/sessions",
        en: "/en/teacher/sessions",
        label_ar: "ملخّصات الدروس (معلم)",
        label_en: "Teacher · Sessions",
      },
    ],
  },
];

// ───────────── PPT builder ─────────────
const FONT_AR = "Cairo";
const FONT_EN = "Inter";

const W = 13.333;
const H = 7.5;

type Lang = "ar" | "en";

function build(lang: Lang) {
  const isAr = lang === "ar";
  const FONT = isAr ? FONT_AR : FONT_EN;
  const RTL = isAr;
  const align = (a: "start" | "center" | "end" = "start"): "left" | "right" | "center" =>
    a === "center" ? "center" : a === "start" ? (RTL ? "right" : "left") : RTL ? "left" : "right";

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = isAr ? "هجر أكاديمي — تسليم التطويرات" : "HAJR Academy — Delivery Report";
  pptx.author = "HAJR A°";
  pptx.company = "HAJR A° English Academy";
  pptx.rtlMode = isAr;

  // strings
  const S = {
    coverTitle: isAr ? "تسليم التطويرات" : "Delivery Report",
    coverSub: isAr ? "كل ما طلبتموه — جاهز للاستخدام" : "Everything You Asked For — Live & Ready",
    coverFooter: isAr ? "هجر أكاديمي · مايو 2026" : "HAJR A° · May 2026",
    askLabel: isAr ? "ما طلبتم" : "What You Asked For",
    builtLabel: isAr ? "ما تم تنفيذه" : "What Was Delivered",
    linksLabel: isAr ? "اضغط للمعاينة المباشرة" : "Click to Open Live",
    statusDone: isAr ? "مُنفّذ" : "DELIVERED",
    statusPending: isAr ? "قيد التطوير" : "IN PROGRESS",
    overviewTitle: isAr ? "الملخص" : "At a Glance",
    overviewSub: isAr
      ? "كل بند من قائمتكم له رابط مباشر يمكنكم فتحه الآن."
      : "Every item from your feedback has a clickable live link.",
    nextTitle: isAr ? "الخطوات القادمة" : "Next Steps",
    nextLines: isAr
      ? [
          "اجتماع مع المعلمين لمراجعة كل بند معهم.",
          "اعتماد الميزات وفتحها للطلاب الفعليين.",
          "تفعيل أكواد الإحالة للمسوّقين.",
        ]
      : [
          "Walk-through with teachers to validate each item.",
          "Sign-off and open features to real students.",
          "Activate marketer referral codes.",
        ],
    closingLine: isAr
      ? "كل خاصية حية. كل رابط يعمل. النظام جاهز للعمل اليومي."
      : "Every feature is live. Every link works. The platform is ready for daily operation.",
    footerEvery: isAr ? "هجر أكاديمي · تسليم رسمي · مايو 2026" : "HAJR A° · Delivery · May 2026",
  };

  // helpers ----------------------------------------------------
  const accentStrip = (s: pptxgen.Slide) => {
    s.addShape(pptx.ShapeType.rect, {
      x: RTL ? W - 1.6 : 0.4,
      y: 0.4,
      w: 1.2,
      h: 0.055,
      fill: { color: C.rose },
      line: { type: "none" },
    });
  };

  const pageNum = (s: pptxgen.Slide, n: number, total: number, onDark: boolean) => {
    s.addText(`${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, {
      x: RTL ? 0.4 : W - 1.4,
      y: H - 0.5,
      w: 1.0,
      h: 0.3,
      fontSize: 10,
      fontFace: FONT,
      color: C.charcoalLight,
      align: RTL ? "left" : "right",
      valign: "middle",
    });
  };

  const footer = (s: pptxgen.Slide, onDark: boolean) => {
    s.addText(S.footerEvery, {
      x: RTL ? W - 6.5 : 0.5,
      y: H - 0.5,
      w: 6,
      h: 0.3,
      fontSize: 10,
      fontFace: FONT,
      color: C.charcoalLight,
      italic: true,
      align: align("start"),
      valign: "middle",
    });
  };

  const statusBadge = (s: pptxgen.Slide, status: Status, x: number, y: number) => {
    const w = 1.3;
    const h = 0.42;
    s.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      fill: { color: status === "done" ? C.doneGreen : C.pendingAmber },
      line: { type: "none" },
      rectRadius: 0.08,
    });
    s.addText(status === "done" ? S.statusDone : S.statusPending, {
      x,
      y,
      w,
      h,
      fontSize: 11,
      fontFace: FONT,
      bold: true,
      color: C.ivory,
      align: "center",
      valign: "middle",
    });
  };

  // ───────────── COVER ─────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.navy };
    accentStrip(s);

    s.addText(S.coverTitle, {
      x: 0.6,
      y: 2.0,
      w: 12.1,
      h: 1.5,
      fontSize: 72,
      fontFace: FONT,
      bold: true,
      color: C.ivory,
      align: "center",
      valign: "middle",
    });

    s.addText(S.coverSub, {
      x: 0.6,
      y: 3.6,
      w: 12.1,
      h: 0.8,
      fontSize: 26,
      fontFace: FONT,
      color: C.rose,
      align: "center",
      valign: "middle",
    });

    // count line
    const doneCount = ITEMS.filter((i) => i.status === "done").length;
    const totalCount = ITEMS.length;
    s.addText(
      isAr
        ? `${doneCount} من ${totalCount} بنود مُنفّذة وحيّة`
        : `${doneCount} of ${totalCount} items live and operational`,
      {
        x: 0.6,
        y: 4.7,
        w: 12.1,
        h: 0.6,
        fontSize: 18,
        fontFace: FONT,
        color: C.ivory,
        italic: true,
        align: "center",
        valign: "middle",
      },
    );

    s.addText(S.coverFooter, {
      x: 0.5,
      y: H - 0.55,
      w: 12.3,
      h: 0.4,
      fontSize: 12,
      fontFace: FONT,
      color: C.charcoalLight,
      align: "center",
      valign: "middle",
    });
  }

  // ───────────── OVERVIEW ─────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.ivory };
    accentStrip(s);

    s.addText(S.overviewTitle, {
      x: 0.6,
      y: 0.6,
      w: 12.1,
      h: 0.8,
      fontSize: 34,
      fontFace: FONT,
      bold: true,
      color: C.charcoal,
      align: align("start"),
      valign: "middle",
    });

    s.addText(S.overviewSub, {
      x: 0.6,
      y: 1.35,
      w: 12.1,
      h: 0.4,
      fontSize: 14,
      fontFace: FONT,
      color: C.rose,
      italic: true,
      align: align("start"),
      valign: "middle",
    });

    // grid 5 × 3
    const cols = 5;
    const rows = 3;
    const startX = 0.5;
    const startY = 2.0;
    const cellW = (W - 1.0) / cols;
    const cellH = 1.45;
    const gap = 0.1;

    ITEMS.slice(0, cols * rows).forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW + gap / 2;
      const y = startY + row * cellH + gap / 2;
      const cw = cellW - gap;
      const ch = cellH - gap;

      // card
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: cw,
        h: ch,
        fill: { color: C.ivory },
        line: { color: C.charcoalLight, width: 0.5 },
        rectRadius: 0.06,
      });

      // status dot
      s.addShape(pptx.ShapeType.ellipse, {
        x: RTL ? x + cw - 0.3 : x + 0.1,
        y: y + 0.1,
        w: 0.18,
        h: 0.18,
        fill: { color: item.status === "done" ? C.doneGreen : C.pendingAmber },
        line: { type: "none" },
      });

      // title
      s.addText((isAr ? item.ar.title : item.en.title), {
        x: x + 0.1,
        y: y + 0.3,
        w: cw - 0.2,
        h: ch - 0.4,
        fontSize: 11,
        fontFace: FONT,
        bold: true,
        color: C.charcoal,
        align: align("start"),
        valign: "top",
      });
    });

    footer(s, false);
    pageNum(s, 2, ITEMS.length + 3, false);
  }

  // ───────────── ONE SLIDE PER ITEM ─────────────
  ITEMS.forEach((item, idx) => {
    const onDark = idx % 2 === 0;
    const s = pptx.addSlide();
    s.background = { color: onDark ? C.navy : C.ivory };
    accentStrip(s);

    const titleColor = onDark ? C.ivory : C.charcoal;
    const bodyColor = onDark ? C.ivory : C.charcoal;
    const labelColor = onDark ? C.mint : C.rose;
    const subtle = onDark ? C.charcoalLight : C.charcoalLight;

    const title = isAr ? item.ar.title : item.en.title;
    const ask = isAr ? item.ar.ask : item.en.ask;
    const built = isAr ? item.ar.built : item.en.built;

    // index chip
    s.addText(String(idx + 1).padStart(2, "0"), {
      x: RTL ? W - 1.5 : 0.6,
      y: 0.6,
      w: 1.0,
      h: 0.4,
      fontSize: 16,
      fontFace: FONT,
      bold: true,
      color: C.rose,
      align: align("start"),
      valign: "middle",
      charSpacing: 4,
    });

    // title
    s.addText(title, {
      x: 0.6,
      y: 1.0,
      w: 9.5,
      h: 0.9,
      fontSize: 30,
      fontFace: FONT,
      bold: true,
      color: titleColor,
      align: align("start"),
      valign: "middle",
    });

    // status badge top-right (or top-left in RTL)
    statusBadge(s, item.status, RTL ? 0.6 : W - 1.9, 1.1);

    // separator
    s.addShape(pptx.ShapeType.rect, {
      x: 0.6,
      y: 2.0,
      w: W - 1.2,
      h: 0.03,
      fill: { color: C.rose },
      line: { type: "none" },
    });

    // 2 columns
    const colY = 2.3;
    const colH = 2.7;
    const leftX = 0.6;
    const leftW = (W - 1.4) / 2;
    const rightX = leftX + leftW + 0.2;

    // labels
    s.addText(S.askLabel, {
      x: leftX,
      y: colY,
      w: leftW,
      h: 0.4,
      fontSize: 13,
      fontFace: FONT,
      bold: true,
      color: labelColor,
      align: align("start"),
      valign: "middle",
      charSpacing: 4,
    });

    s.addText(S.builtLabel, {
      x: rightX,
      y: colY,
      w: leftW,
      h: 0.4,
      fontSize: 13,
      fontFace: FONT,
      bold: true,
      color: labelColor,
      align: align("start"),
      valign: "middle",
      charSpacing: 4,
    });

    // body texts
    s.addText(ask, {
      x: leftX,
      y: colY + 0.45,
      w: leftW,
      h: colH - 0.45,
      fontSize: 14,
      fontFace: FONT,
      color: bodyColor,
      align: align("start"),
      valign: "top",
      paraSpaceAfter: 6,
    });

    s.addText(built, {
      x: rightX,
      y: colY + 0.45,
      w: leftW,
      h: colH - 0.45,
      fontSize: 14,
      fontFace: FONT,
      color: bodyColor,
      align: align("start"),
      valign: "top",
      paraSpaceAfter: 6,
    });

    // LINKS strip
    const linksY = 5.4;
    s.addText(S.linksLabel, {
      x: 0.6,
      y: linksY,
      w: W - 1.2,
      h: 0.35,
      fontSize: 12,
      fontFace: FONT,
      bold: true,
      color: labelColor,
      italic: true,
      align: align("start"),
      valign: "middle",
      charSpacing: 4,
    });

    // up to 3 link buttons
    const linkBoxY = linksY + 0.45;
    const linkBoxH = 0.6;
    const linksCount = Math.min(item.links.length, 3);
    const totalLinksW = W - 1.2;
    const linkW = (totalLinksW - 0.3 * (linksCount - 1)) / linksCount;

    item.links.slice(0, 3).forEach((lk, i) => {
      const baseX = 0.6;
      const x = baseX + i * (linkW + 0.3);
      const url = `${BASE}${isAr ? lk.ar : lk.en}`;
      const label = isAr ? lk.label_ar : lk.label_en;

      // pill
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: linkBoxY,
        w: linkW,
        h: linkBoxH,
        fill: { color: C.rose },
        line: { type: "none" },
        rectRadius: 0.12,
      });

      // clickable text on top — pptxgenjs supports hyperlink on text
      s.addText(label, {
        x,
        y: linkBoxY,
        w: linkW,
        h: linkBoxH,
        fontSize: 14,
        fontFace: FONT,
        bold: true,
        color: C.ivory,
        align: "center",
        valign: "middle",
        hyperlink: { url, tooltip: url },
      });

      // url under pill (small)
      s.addText(url.replace("https://", ""), {
        x,
        y: linkBoxY + linkBoxH + 0.05,
        w: linkW,
        h: 0.3,
        fontSize: 9,
        fontFace: FONT,
        color: subtle,
        align: "center",
        valign: "top",
        hyperlink: { url, tooltip: url },
      });
    });

    footer(s, onDark);
    pageNum(s, idx + 3, ITEMS.length + 3, onDark);
  });

  // ───────────── NEXT STEPS / CLOSING ─────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.ivory };
    accentStrip(s);

    s.addText(S.nextTitle, {
      x: 0.6,
      y: 0.6,
      w: 12.1,
      h: 0.8,
      fontSize: 34,
      fontFace: FONT,
      bold: true,
      color: C.charcoal,
      align: align("start"),
      valign: "middle",
    });

    // three steps as cards
    const phases = S.nextLines.map((line, i) => ({ n: i + 1, text: line }));
    const startX = 0.6;
    const startY = 2.0;
    const cardW = (W - 1.6) / 3;
    const cardH = 2.8;
    const gap = 0.2;

    phases.forEach((p, i) => {
      const x = startX + i * (cardW + gap);
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: startY,
        w: cardW,
        h: cardH,
        fill: { color: C.ivory },
        line: { color: C.charcoal, width: 1 },
        rectRadius: 0.08,
      });
      s.addShape(pptx.ShapeType.rect, {
        x,
        y: startY,
        w: cardW,
        h: 0.12,
        fill: { color: C.rose },
        line: { type: "none" },
      });

      s.addText(String(p.n).padStart(2, "0"), {
        x: x + 0.2,
        y: startY + 0.4,
        w: cardW - 0.4,
        h: 0.8,
        fontSize: 42,
        fontFace: FONT,
        bold: true,
        color: C.rose,
        align: align("start"),
        valign: "middle",
      });

      s.addText(p.text, {
        x: x + 0.2,
        y: startY + 1.3,
        w: cardW - 0.4,
        h: cardH - 1.5,
        fontSize: 16,
        fontFace: FONT,
        color: C.charcoal,
        align: align("start"),
        valign: "top",
      });
    });

    s.addText(S.closingLine, {
      x: 0.6,
      y: 5.4,
      w: W - 1.2,
      h: 0.7,
      fontSize: 20,
      fontFace: FONT,
      italic: true,
      bold: true,
      color: C.rose,
      align: "center",
      valign: "middle",
    });

    footer(s, false);
    pageNum(s, ITEMS.length + 3, ITEMS.length + 3, false);
  }

  return pptx;
}

// ───────────── WRITE BOTH ─────────────
const outAr = path.resolve("C:\\Users\\WIN11-24H2GPT\\hajar aca\\HAJR_DELIVERY_AR.pptx");
const outEn = path.resolve("C:\\Users\\WIN11-24H2GPT\\hajar aca\\HAJR_DELIVERY_EN.pptx");

(async () => {
  const ar = build("ar");
  const en = build("en");
  const f1 = await ar.writeFile({ fileName: outAr });
  const f2 = await en.writeFile({ fileName: outEn });
  // eslint-disable-next-line no-console
  console.log(`[OK] AR: ${f1}`);
  // eslint-disable-next-line no-console
  console.log(`[OK] EN: ${f2}`);
})();
