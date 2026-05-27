/**
 * Teacher feedback / requests catalog — used by the Validation Mode page.
 *
 * Each entry maps one piece of original teacher feedback (verbatim from
 * WhatsApp) to the sprint that shipped it, the deliverables list, and
 * the deep-link URLs the owner can click to demo it in the meeting.
 */
export interface ValidationCategory {
  key: string;
  sprint: number;
  title: string;
  titleAr: string;
  originalRequest: string;
  originalRequestAr: string;
  deliveredAs: string[];
  deliveredAsAr: string[];
  links: { label: string; labelAr: string; href: string }[];
}

export const VALIDATION_CATEGORIES: ValidationCategory[] = [
  {
    key: "marketing",
    sprint: 2,
    title: "Marketing / Affiliate System",
    titleAr: "نظام التسويق والإحالة",
    originalRequest:
      "We need a marketer role with a referral code, leads pipeline, commission tracking, and payouts.",
    originalRequestAr:
      "نحتاج إلى دور مسوّق برمز إحالة، خط أنابيب للعملاء المحتملين، تتبّع للعمولات، ودفعات.",
    deliveredAs: [
      "MarketerProfile + referral code (unique, copyable)",
      "Leads pipeline (NEW → CONTACTED → CONVERTED) with full CRUD",
      "Commission engine: 15% configurable, PENDING → APPROVED → PAID",
      "Payouts via PaymentRequest (admin approval workflow)",
      "Public landing /apply?ref=CODE that attributes back to marketer",
    ],
    deliveredAsAr: [
      "ملف المسوّق + رمز إحالة (فريد وقابل للنسخ)",
      "خط أنابيب للعملاء (جديد → تواصل → محوّل) مع كامل الإدارة",
      "محرك العمولات: ١٥٪ قابلة للتعديل، معلّقة → معتمدة → مدفوعة",
      "الدفعات عبر طلب دفع (سير عمل اعتماد المسؤول)",
      "صفحة تسجيل عامة /apply?ref=CODE تنسب العميل للمسوّق",
    ],
    links: [
      { label: "Marketer dashboard", labelAr: "لوحة المسوّق", href: "/marketer" },
      { label: "Admin marketers", labelAr: "المسوّقون (إداري)", href: "/admin/marketers" },
      { label: "Commissions", labelAr: "العمولات", href: "/admin/marketers/commissions" },
    ],
  },
  {
    key: "placement",
    sprint: 2,
    title: "Placement Test",
    titleAr: "اختبار تحديد المستوى",
    originalRequest:
      "Students should take a placement test before they're put in a class — auto-scored, CEFR mapped.",
    originalRequestAr:
      "يجب على الطلاب اجتياز اختبار تحديد المستوى قبل وضعهم في الصف — تصحيح آلي مع تصنيف CEFR.",
    deliveredAs: [
      "Placement test variants (A1–C1), seeded item bank",
      "Auto-scored attempt flow with timing + result page",
      "Auto-tagging of student's englishLevel on completion",
      "Public results sharable to parents",
    ],
    deliveredAsAr: [
      "نسخ اختبار تحديد المستوى (A1–C1) مع بنك أسئلة جاهز",
      "تصحيح آلي مع توقيت وصفحة نتيجة",
      "تعيين المستوى تلقائياً بعد الانتهاء",
      "نتائج قابلة للمشاركة مع الوالدين",
    ],
    links: [
      { label: "Take the test", labelAr: "ابدأ الاختبار", href: "/placement-test" },
      { label: "Admin attempts", labelAr: "محاولات الاختبار (إداري)", href: "/admin/placement-tests" },
    ],
  },
  {
    key: "calendar",
    sprint: 1,
    title: "Calendar System",
    titleAr: "نظام التقويم",
    originalRequest:
      "We need a real calendar — everyone (admin, teacher, student, parent) should see relevant events with their own role view.",
    originalRequestAr:
      "نريد تقويماً حقيقياً — يرى الجميع (الإدارة والمعلم والطالب والوالد) الأحداث بحسب الدور.",
    deliveredAs: [
      "CalendarEvent model unified across class sessions, meetings, exams, holidays",
      "Role-scoped /calendar view (admin / teacher / student / parent)",
      "Sync from ClassSession on schedule changes",
      "24h + 1h reminder cron with parent fan-out (Sprint 5 polish)",
    ],
    deliveredAsAr: [
      "نموذج CalendarEvent موحّد للحصص واللقاءات والاختبارات والإجازات",
      "عرض /calendar حسب الدور (إدارة / معلم / طالب / والد)",
      "مزامنة من حصص الفصل عند أي تعديل",
      "تذكيرات ٢٤ ساعة + ساعة عبر cron مع شمول الوالدين (Sprint 5)",
    ],
    links: [
      { label: "Open calendar", labelAr: "افتح التقويم", href: "/calendar" },
    ],
  },
  {
    key: "tickets",
    sprint: 3,
    title: "Tickets / Support",
    titleAr: "التذاكر والدعم",
    originalRequest:
      "Every role needs a support inbox — students, teachers, parents — with SLA tracking and assignment.",
    originalRequestAr:
      "كل دور يحتاج صندوق دعم — للطلاب والمعلمين والأولياء — مع تتبع SLA وإسناد.",
    deliveredAs: [
      "Ticket model with category, priority, status, SLA timestamps",
      "Triage queue (admin) with assign + reassign + reply",
      "Auto-classification using Claude for incoming messages",
      "Email + in-app notifications on status changes",
    ],
    deliveredAsAr: [
      "نموذج التذاكر بفئة وأولوية وحالة وأوقات SLA",
      "قائمة الفرز (إدارة) مع الإسناد وإعادة الإسناد والرد",
      "تصنيف آلي بـ Claude للرسائل الواردة",
      "إشعارات بريدية ومضمنة عند تغيير الحالة",
    ],
    links: [
      { label: "Tickets inbox", labelAr: "صندوق التذاكر", href: "/tickets" },
      { label: "Admin triage", labelAr: "فرز الإدارة", href: "/admin/tickets" },
    ],
  },
  {
    key: "teacher-profiles",
    sprint: 3,
    title: "Public Teacher Profiles",
    titleAr: "صفحات المعلمين العامة",
    originalRequest:
      "Each teacher should have a public profile a student can browse before booking.",
    originalRequestAr:
      "كل معلم يجب أن يكون لديه صفحة عامة يطّلع عليها الطالب قبل الحجز.",
    deliveredAs: [
      "/teachers public index with cards + filters",
      "/teachers/[slug] profile with bio, specialties, rating, sample lessons",
      "Booking CTA wired into the apply / private-lesson flow",
      "Rating + review aggregation",
    ],
    deliveredAsAr: [
      "/teachers صفحة عامة بالبطاقات والمرشحات",
      "/teachers/[slug] السيرة والاختصاصات والتقييم والدروس النموذجية",
      "زر حجز موصول بمسار التسجيل/الدروس الخاصة",
      "تجميع التقييمات والمراجعات",
    ],
    links: [
      { label: "Browse teachers", labelAr: "تصفح المعلمين", href: "/teachers" },
    ],
  },
  {
    key: "monthly-meetings",
    sprint: 3,
    title: "Monthly Teacher Meetings",
    titleAr: "اللقاءات الشهرية للمعلمين",
    originalRequest:
      "We need a way to schedule, send agendas, and track attendance for monthly teacher meetings.",
    originalRequestAr:
      "نحتاج طريقة لجدولة اللقاءات الشهرية للمعلمين، إرسال جدول الأعمال، ومتابعة الحضور.",
    deliveredAs: [
      "TeacherMeeting model with agenda, time, Zoom link",
      "RSVP flow (ATTENDING / DECLINED / TENTATIVE)",
      "Admin scheduler /admin/teacher-meetings",
      "Email + in-app notifications + reminder cron",
    ],
    deliveredAsAr: [
      "نموذج TeacherMeeting بجدول الأعمال والوقت ورابط Zoom",
      "تأكيد الحضور (حاضر / معتذر / محتمل)",
      "جدولة الإدارة /admin/teacher-meetings",
      "إشعارات بريدية ومضمنة + تذكير عبر cron",
    ],
    links: [
      { label: "Teacher meetings", labelAr: "اللقاءات", href: "/teacher/meetings" },
      { label: "Admin scheduler", labelAr: "جدولة الإدارة", href: "/admin/teacher-meetings" },
    ],
  },
  {
    key: "parent-reports",
    sprint: 4,
    title: "Parent Monthly Reports",
    titleAr: "التقارير الشهرية لأولياء الأمور",
    originalRequest:
      "Each parent should get a monthly PDF report — attendance, grades, recordings, payment status.",
    originalRequestAr:
      "كل ولي أمر يجب أن يحصل على تقرير شهري PDF — الحضور، الدرجات، التسجيلات، حالة الدفع.",
    deliveredAs: [
      "ParentReport schema with attendance, lessons, homework, grades, payment",
      "Monthly cron /api/cron/monthly-reports generating PDFs into Supabase",
      "Email delivery + share-image variant for WhatsApp forwards",
      "Sprint 5: teacher notes auto-fill with last 4 AI lesson summaries",
    ],
    deliveredAsAr: [
      "نموذج تقرير الوالد بكل المؤشرات",
      "Cron شهري /api/cron/monthly-reports يولّد PDF ويرفعه إلى Supabase",
      "إرسال بريدي + صورة قابلة للمشاركة عبر واتساب",
      "Sprint 5: ملاحظات المعلم تُعبّأ تلقائياً من آخر ٤ ملخصات حصص بالذكاء الاصطناعي",
    ],
    links: [
      { label: "Parent reports", labelAr: "تقارير الوالد", href: "/parent/reports" },
      { label: "Admin reports", labelAr: "تقارير الإدارة", href: "/admin/parent-reports" },
    ],
  },
  {
    key: "speaking-club",
    sprint: 4,
    title: "Speaking Club",
    titleAr: "نادي المحادثة",
    originalRequest:
      "We need a way to run weekly speaking clubs with RSVP, capacity caps, and reminders.",
    originalRequestAr:
      "نحتاج طريقة لتشغيل نوادي المحادثة الأسبوعية مع تأكيد الحضور والسعة المحدودة والتذكيرات.",
    deliveredAs: [
      "SpeakingClubSession model with capacity + waitlist",
      "RSVP flow with attendance follow-up",
      "Admin scheduler + 15-min reminder cron",
      "Public registration link",
    ],
    deliveredAsAr: [
      "نموذج جلسة نادي المحادثة بالسعة وقائمة الانتظار",
      "تأكيد الحضور ومتابعته",
      "جدولة الإدارة + تذكير قبل ١٥ دقيقة عبر cron",
      "رابط تسجيل عام",
    ],
    links: [
      { label: "Speaking club", labelAr: "نادي المحادثة", href: "/speaking-club" },
      { label: "Admin clubs", labelAr: "إدارة النوادي", href: "/admin/speaking-club" },
    ],
  },
  {
    key: "certificates",
    sprint: 4,
    title: "Certificates",
    titleAr: "الشهادات",
    originalRequest:
      "Students should get a verifiable PDF certificate at the end of a level — with QR code we can scan.",
    originalRequestAr:
      "يجب أن يحصل الطالب على شهادة PDF قابلة للتحقق عند نهاية المستوى — مع رمز QR قابل للمسح.",
    deliveredAs: [
      "Certificate model with serial number, issuedAt, revokedAt",
      "QR code that resolves to /verify/[serial]",
      "Bilingual PDF with student name, course, level, signatures",
      "Admin issue + revoke flow",
    ],
    deliveredAsAr: [
      "نموذج شهادة برقم تسلسلي وتاريخ الإصدار والإلغاء",
      "رمز QR يحوّل إلى /verify/[serial]",
      "شهادة PDF ثنائية اللغة باسم الطالب والمساق والمستوى والتوقيعات",
      "إصدار وإلغاء من الإدارة",
    ],
    links: [
      { label: "Admin certificates", labelAr: "إدارة الشهادات", href: "/admin/certificates" },
    ],
  },
  {
    key: "payment-requests",
    sprint: 4,
    title: "Payment Requests",
    titleAr: "طلبات الدفع",
    originalRequest:
      "Teachers and marketers need to request their payouts in-app — admin approves and marks paid.",
    originalRequestAr:
      "المعلمون والمسوّقون يحتاجون لطلب دفعاتهم داخل التطبيق — والإدارة تعتمد وتؤشر دفع.",
    deliveredAs: [
      "PaymentRequest model with periodStart/End, amount, status",
      "Teacher + marketer self-service forms",
      "Admin approval + paid-status flow + notifications",
      "PDF export per request",
    ],
    deliveredAsAr: [
      "نموذج طلب دفع بفترة ومبلغ وحالة",
      "نموذج طلب ذاتي للمعلم والمسوّق",
      "اعتماد الإدارة + تعليم الدفع + إشعارات",
      "تصدير PDF لكل طلب",
    ],
    links: [
      { label: "Teacher payouts", labelAr: "دفعات المعلم", href: "/teacher/payment-requests" },
      { label: "Admin queue", labelAr: "قائمة الإدارة", href: "/admin/payment-requests" },
    ],
  },
  {
    key: "ai-feedback",
    sprint: 5,
    title: "AI Lesson Feedback",
    titleAr: "التغذية الراجعة الذكية للحصص",
    originalRequest:
      "After every class we want an automatic summary the student/parent/teacher can read — vocab, grammar, homework.",
    originalRequestAr:
      "بعد كل حصة نريد ملخصاً تلقائياً يقرأه الطالب/الوالد/المعلم — مفردات وقواعد وواجب.",
    deliveredAs: [
      "Claude Haiku engine generates bilingual summary per session",
      "Auto-triggered from Zoom meeting.ended webhook",
      "Teacher edit UI for homework / action items",
      "Student + parent read-only views, admin bulk regenerate",
    ],
    deliveredAsAr: [
      "محرك Claude Haiku يولّد ملخصاً ثنائي اللغة لكل حصة",
      "تشغيل تلقائي من Zoom عند انتهاء الحصة",
      "واجهة تحرير الواجب وبنود المعلم",
      "عرض للقراءة فقط للطالب والوالد، وإعادة توليد جماعية للإدارة",
    ],
    links: [
      { label: "Admin recordings", labelAr: "تسجيلات الإدارة", href: "/admin/recordings" },
    ],
  },
  {
    key: "brand-kit",
    sprint: 5,
    title: "Brand Kit",
    titleAr: "هوية العلامة",
    originalRequest:
      "Give us a downloadable brand book we can hand to any designer — logos, colors, fonts, social templates.",
    originalRequestAr:
      "أعطنا دليل علامة قابلاً للتحميل نسلّمه لأي مصمم — شعارات وألوان وخطوط وقوالب اجتماعية.",
    deliveredAs: [
      "10-page brand book PDF generator (bilingual)",
      "Asset library page with categorized downloads",
      "Send-to-designer email with the book attached",
      "Locked brand v3 constants in /lib/brand.ts",
    ],
    deliveredAsAr: [
      "مولّد دليل علامة PDF من ١٠ صفحات (ثنائي اللغة)",
      "صفحة مكتبة الأصول بفئات قابلة للتحميل",
      "إرسال إلى المصمم بالبريد مع إرفاق الدليل",
      "ثوابت العلامة v3 المقفلة في /lib/brand.ts",
    ],
    links: [
      { label: "Brand kit", labelAr: "هوية العلامة", href: "/admin/brand-kit" },
      { label: "Download book", labelAr: "تحميل الدليل", href: "/api/admin/brand-kit/book" },
    ],
  },
];
