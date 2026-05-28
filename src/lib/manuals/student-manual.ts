/**
 * Student manual — 11 chapters + appendix. Bilingual.
 */
import { renderManualHtml, shotPath, type ManualDoc, type ManualChapter, type ManualAppendix, type Lang } from "./layout";

function studentChapters(lang: Lang): ManualChapter[] {
  const ar = lang === "ar";
  return [
    {
      number: 1,
      title: ar ? "أهلاً بك" : "Welcome",
      sections: [
        {
          title: ar ? "أهلاً في هجر A°" : "Welcome to HAJR A°",
          body: ar
            ? `<p>أهلاً بك في أكاديمية هجر A°. أنت الآن جزء من مجتمع تعليمي يجمع بين معلمين سعوديين معتمدين وأدوات تعلم ذكية. هذا الدليل سيرافقك في خطواتك الأولى.</p>
            <p>اقرأه في 15 دقيقة — وستعرف كل ما تحتاج لتبدأ التعلم بثقة.</p>`
            : `<p>Welcome to HAJR A° Academy. You're now part of a learning community combining certified Saudi teachers with smart learning tools. This guide walks you through your first steps.</p>
            <p>Read it in 15 minutes — and you'll know everything you need to start learning with confidence.</p>`,
        },
        {
          title: ar ? "أول تسجيل دخول" : "First login",
          body: ar
            ? `<ol>
              <li>افتح رابط الترحيب الذي وصلك بالبريد</li>
              <li>عيّن كلمة مرور قوية (8 أحرف على الأقل)</li>
              <li>سجل الدخول من <code>/login</code></li>
              <li>ستنتقل تلقائياً إلى لوحتك الرئيسية</li>
            </ol>`
            : `<ol>
              <li>Open the welcome link in your email</li>
              <li>Set a strong password (min 8 chars)</li>
              <li>Sign in at <code>/login</code></li>
              <li>You land automatically on your dashboard</li>
            </ol>`,
          screenshot: shotPath("student", "01-login"),
        },
        {
          title: ar ? "ملفك الشخصي" : "Your profile",
          body: ar
            ? `<p>من <b>ملفي</b>، أضف:</p>
            <ul>
              <li>صورة شخصية (مربعة، تساعد المعلم يتعرف عليك)</li>
              <li>صفك الدراسي</li>
              <li>هدفك من التعلم (محادثة عامة، STEP، IELTS…)</li>
              <li>اللغة المفضلة (تبدأ المنصة بها)</li>
            </ul>`
            : `<p>From <b>My Profile</b>, add:</p>
            <ul>
              <li>Profile photo (square — helps your teacher recognize you)</li>
              <li>Grade level</li>
              <li>Learning goal (general conversation, STEP, IELTS…)</li>
              <li>Preferred language (the platform starts in this)</li>
            </ul>`,
        },
      ],
    },
    {
      number: 2,
      title: ar ? "لوحة التحكم" : "Your Dashboard",
      sections: [
        {
          title: ar ? "جولة في اللوحة" : "Dashboard tour",
          body: ar
            ? `<p>اللوحة عرض موحد لكل شيء يهمك:</p>
            <ul>
              <li>بطاقة الحصة القادمة (مع زر دخول)</li>
              <li>معلموك الحاليون</li>
              <li>التقدم في برنامجك</li>
              <li>الواجبات المعلقة</li>
              <li>إجراءات سريعة</li>
            </ul>`
            : `<p>Your dashboard is a single view of everything that matters:</p>
            <ul>
              <li>Next-class card (with join button)</li>
              <li>Your current teachers</li>
              <li>Program progress</li>
              <li>Pending assignments</li>
              <li>Quick actions</li>
            </ul>`,
          screenshot: shotPath("student", "02-dashboard"),
        },
        {
          title: ar ? "بطاقة الحصة القادمة" : "Next class card",
          body: ar
            ? `<p>تعرض: اسم الحصة، المعلم، الوقت المتبقي، زر "دخول الحصة". اضغطه قبل الوقت بـ 5 دقائق ليفتح Zoom.</p>`
            : `<p>Shows: class name, teacher, time remaining, "Enter Class" button. Click 5 minutes early to open Zoom.</p>`,
          tip: ar
            ? "احرص على الدخول قبل بدء الحصة بـ 5 دقائق على الأقل."
            : "Always enter at least 5 minutes before the class starts.",
        },
        {
          title: ar ? "معلموك" : "Your teachers widget",
          body: ar
            ? `<p>يعرض صور وأسماء معلميك مع زر مراسلة سريع لكل واحد. اضغط الاسم لزيارة ملفه العام.</p>`
            : `<p>Shows photos and names of your teachers with a quick "Message" button next to each. Click the name to visit their public profile.</p>`,
        },
        {
          title: ar ? "الإجراءات السريعة" : "Quick actions",
          body: ar
            ? `<ul>
              <li>دخول الحصة القادمة</li>
              <li>فتح المحادثات</li>
              <li>عرض الواجبات</li>
              <li>حجز اختبار تحديدي جديد</li>
            </ul>`
            : `<ul>
              <li>Join next class</li>
              <li>Open messages</li>
              <li>View assignments</li>
              <li>Book a new placement test</li>
            </ul>`,
        },
      ],
    },
    {
      number: 3,
      title: ar ? "فصولك" : "Your Classes",
      sections: [
        {
          title: ar ? "عرض الفصول" : "Viewing classes",
          body: ar
            ? `<p><b>الفصول</b>: قائمة بكل فصولك (الجماعية والخاصة). لكل فصل: الاسم، المعلم، عدد الحصص الباقية، الحصة القادمة.</p>`
            : `<p><b>Classes</b>: a list of all your classes (group and private). Each shows: name, teacher, sessions left, next session.</p>`,
          screenshot: shotPath("student", "03-classes"),
        },
        {
          title: ar ? "الدخول لحصة Zoom" : "Entering a Zoom class",
          body: ar
            ? `<ol>
              <li>اضغط <b>دخول الحصة</b> من اللوحة أو من قائمة الفصول</li>
              <li>يفتح Zoom في تبويب جديد</li>
              <li>المعلم يقبلك تلقائياً</li>
              <li>عند انتهاء الحصة، أغلق Zoom</li>
            </ol>`
            : `<ol>
              <li>Click <b>Enter Class</b> from the dashboard or class list</li>
              <li>Zoom opens in a new tab</li>
              <li>Your teacher admits you automatically</li>
              <li>When the class ends, close Zoom</li>
            </ol>`,
          warning: ar
            ? "إذا لم تستطع الدخول، تحقق من تثبيت Zoom على جهازك. ليس مطلوب حساب Zoom."
            : "If you can't join, check that Zoom is installed on your device. A Zoom account is not required.",
        },
        {
          title: ar ? "سجل الحصص السابقة" : "Class history",
          body: ar
            ? `<p>كل حصة سابقة لها صفحة تفصيلية: التسجيل (إن وُجد)، الملخص الآلي، الواجب، حالة حضورك.</p>`
            : `<p>Every past session has a detail page: the recording (if available), AI summary, homework, your attendance status.</p>`,
        },
      ],
    },
    {
      number: 4,
      title: ar ? "الواجبات" : "Assignments",
      sections: [
        {
          title: ar ? "تبويب الواجبات" : "Assignments tab",
          body: ar
            ? `<p><b>الواجبات</b>: كل ما يطلبه منك معلمك. كل واجب: عنوان، تاريخ التسليم، الحالة (جديد، قيد الإنجاز، مسلَّم، مصحَّح).</p>`
            : `<p><b>Assignments</b>: everything your teacher asks of you. Each shows: title, due date, status (New, In Progress, Submitted, Graded).</p>`,
          screenshot: shotPath("student", "04-assignments"),
        },
        {
          title: ar ? "تمارين المعمل" : "Lab exercises tab",
          body: ar
            ? `<p>تمارين قصيرة (5-15 دقيقة) موجهة لمهارة معينة: قواعد، استماع، قراءة، محادثة. ابدأ أي تمرين بضغطة واحدة. النتيجة فورية.</p>`
            : `<p>Short exercises (5-15 min) targeting a specific skill: grammar, listening, reading, conversation. Start any with one click. Score is instant.</p>`,
          screenshot: shotPath("student", "05-lab"),
        },
        {
          title: ar ? "تبويب الامتحانات" : "Mock exams tab",
          body: ar
            ? `<p>الامتحانات النموذجية (STEP، IELTS، اختبارات مستوى). كل امتحان: مدة محددة، عدد أسئلة، علامة كاملة. النتيجة + التحليل التفصيلي يظهران فوراً بعد التسليم.</p>`
            : `<p>Mock exams (STEP, IELTS, level tests). Each has: fixed duration, question count, total marks. Score + detailed analysis appear immediately after submission.</p>`,
          screenshot: shotPath("student", "06-exams"),
        },
        {
          title: ar ? "تسليم الإجابات" : "Submitting answers",
          body: ar
            ? `<p>للأسئلة الموضوعية: اختر/اكتب الإجابة، انتقل للسؤال التالي. النظام يحفظ تلقائياً كل 10 ثوان. اضغط <b>تسليم نهائي</b> عند الانتهاء.</p>`
            : `<p>For objective questions: select/type the answer, move to the next. The system auto-saves every 10 seconds. Click <b>Final Submit</b> when done.</p>`,
          tip: ar
            ? "لا تغلق التبويب أثناء امتحان — الحفظ تلقائي لكن التسليم النهائي مطلوب."
            : "Don't close the tab during an exam — auto-save runs but a final submit is required.",
        },
      ],
    },
    {
      number: 5,
      title: ar ? "ملخصات الحصص بالذكاء الاصطناعي" : "AI Lesson Summaries",
      sections: [
        {
          title: ar ? "أين تجدها" : "Where to find them",
          body: ar
            ? `<p>بعد كل حصة، يتولد ملخص آلي. تجده في:</p>
            <ul>
              <li>صفحة الحصة المنفردة</li>
              <li>إشعار بالبريد الإلكتروني</li>
              <li>سجل الحصص في ملف الفصل</li>
            </ul>`
            : `<p>After every class an AI summary is generated. Find it in:</p>
            <ul>
              <li>The single-session page</li>
              <li>An email notification</li>
              <li>The session history on your class detail</li>
            </ul>`,
        },
        {
          title: ar ? "بطاقات المفردات" : "Vocabulary flashcards",
          body: ar
            ? `<p>كل ملخص يحوي بطاقات مفردات: الكلمة، الترجمة، مثال، نطق صوتي. ادرسها كل يوم 5 دقائق — هذه أفضل طريقة لبناء مخزون لغوي.</p>`
            : `<p>Every summary has vocab flashcards: word, translation, example, audio pronunciation. Study 5 min daily — the single best way to build vocabulary.</p>`,
        },
        {
          title: ar ? "إنجاز الواجب" : "Doing the homework",
          body: ar
            ? `<p>قسم "الواجب" في الملخص يخبرك بالضبط ما يجب فعله قبل الحصة القادمة. علّمه مكتملاً عند الانتهاء — يظهر للمعلم.</p>`
            : `<p>The "Homework" section tells you exactly what to do before next class. Mark complete when done — your teacher sees it.</p>`,
        },
      ],
    },
    {
      number: 6,
      title: ar ? "المحادثات" : "Messages",
      sections: [
        {
          title: ar ? "مراسلة المعلمين" : "Messaging your teachers",
          body: ar
            ? `<p>من <code>/messages</code> أو من ملف المعلم، اضغط <b>إرسال رسالة</b>. الرسائل فورية ولها تأكيدات قراءة.</p>`
            : `<p>From <code>/messages</code> or from a teacher's profile, click <b>Send Message</b>. Messages are instant with read receipts.</p>`,
          screenshot: shotPath("student", "07-messages"),
        },
        {
          title: ar ? "المحادثة الفورية" : "Realtime chat",
          body: ar
            ? `<p>الرسائل تصل في الثانية. إذا كان المعلم متصلاً، ستراه يكتب. إن لم يكن، تصل عند فتحه التطبيق + يستلم بريداً.</p>`
            : `<p>Messages arrive in seconds. If your teacher is online you'll see "typing…". If not, they arrive when they open the app + they get an email.</p>`,
        },
        {
          title: ar ? "المرفقات" : "Attachments",
          body: ar
            ? `<p>أرفق ملفاً (PDF، صورة، صوت) من رمز المشبك. مفيد لإرسال صور لكتاب أو تسجيل صوتك للمحادثة.</p>`
            : `<p>Attach a file (PDF, image, audio) from the paperclip icon. Useful for sending photos of a book or a voice recording for conversation practice.</p>`,
        },
      ],
    },
    {
      number: 7,
      title: ar ? "الاختبار التحديدي" : "Placement Test",
      sections: [
        {
          title: ar ? "خوض اختبار" : "Taking a placement test",
          body: ar
            ? `<p>من <b>الاختبار التحديدي</b> اختر النوع:</p>
            <ul>
              <li><b>عام:</b> 25 سؤالاً، 30 دقيقة → نتيجة CEFR</li>
              <li><b>STEP:</b> محاكاة كاملة لاختبار STEP السعودي</li>
              <li><b>IELTS:</b> أربعة أقسام: قراءة، استماع، كتابة، محادثة</li>
            </ul>
            <p>اضغط <b>ابدأ</b> ولا تغلق التبويب أثناء الاختبار.</p>`
            : `<p>From <b>Placement</b> pick a type:</p>
            <ul>
              <li><b>General:</b> 25 questions, 30 minutes → CEFR result</li>
              <li><b>STEP:</b> a full simulation of the Saudi STEP exam</li>
              <li><b>IELTS:</b> four sections — reading, listening, writing, speaking</li>
            </ul>
            <p>Click <b>Start</b> and don't close the tab during the test.</p>`,
          screenshot: shotPath("student", "08-placement"),
        },
        {
          title: ar ? "قراءة نتيجتك" : "Reading your CEFR result",
          body: ar
            ? `<p>النتيجة تأتي على شكل: مستوى عام (A1، A2، B1، B2، C1، C2) + تفصيل لكل مهارة (استماع، قراءة، كتابة، محادثة). تحت كل مستوى تجد توصيات للبرنامج المناسب لك.</p>`
            : `<p>Your result shows: overall level (A1, A2, B1, B2, C1, C2) + a breakdown per skill (listening, reading, writing, speaking). Below each level you find program recommendations.</p>`,
        },
        {
          title: ar ? "تحميل التقرير PDF" : "Downloading your PDF report",
          body: ar
            ? `<p>اضغط <b>تحميل PDF</b> — يصلك ملف رسمي بالنتيجة وشعار الأكاديمية. تستخدمه للتقديم للجامعات أو لمشاركته مع ولي الأمر.</p>`
            : `<p>Click <b>Download PDF</b> — an official report with the result and academy logo. Use for university applications or to share with parents.</p>`,
        },
      ],
    },
    {
      number: 8,
      title: ar ? "نادي المحادثة" : "Speaking Club",
      sections: [
        {
          title: ar ? "تسجيل الحضور (RSVP)" : "RSVPing to events",
          body: ar
            ? `<p>من <b>نادي المحادثة</b>: قائمة بالفعاليات القادمة. كل فعالية: العنوان، المضيف، التاريخ، المستوى المستهدف، عدد المقاعد. اضغط <b>سجل الآن</b>.</p>`
            : `<p>From <b>Speaking Club</b>: a list of upcoming events. Each shows: title, host, date, target level, seats left. Click <b>Register</b>.</p>`,
          screenshot: shotPath("student", "09-speaking-club"),
        },
        {
          title: ar ? "الحضور المباشر" : "Joining live",
          body: ar
            ? `<p>قبل الفعالية بـ 5 دقائق، تجد زر <b>دخول مباشر</b> في صفحة الفعالية + إشعار. اضغطه → يفتح Zoom.</p>`
            : `<p>5 minutes before, you'll see a <b>Join Live</b> button on the event page + a notification. Click it → Zoom opens.</p>`,
        },
        {
          title: ar ? "مشاهدة التسجيلات" : "Watching recordings",
          body: ar
            ? `<p>بعد الفعالية، التسجيل يُرفَع لصفحتها. إذا فاتك الحضور المباشر، شاهده لاحقاً.</p>`
            : `<p>After the event, the recording is posted to the event page. If you missed it live, watch later.</p>`,
        },
      ],
    },
    {
      number: 9,
      title: ar ? "الشهادات" : "Certificates",
      sections: [
        {
          title: ar ? "كيف تستحق شهادة" : "How to earn certificates",
          body: ar
            ? `<p>ثلاث طرق:</p>
            <ul>
              <li><b>إكمال مستوى:</b> اجتياز اختبار النهاية لمستوى CEFR</li>
              <li><b>إتمام دورة:</b> حضور 80% من حصص برنامج</li>
              <li><b>اختبار تحديدي:</b> أي محاولة لاختبار</li>
            </ul>`
            : `<p>Three paths:</p>
            <ul>
              <li><b>Level Achievement:</b> pass an end-of-level exam</li>
              <li><b>Course Completion:</b> attend 80% of a program's sessions</li>
              <li><b>Placement:</b> any test attempt</li>
            </ul>`,
          screenshot: shotPath("student", "10-certificates"),
        },
        {
          title: ar ? "التحميل والمشاركة" : "Downloading & sharing",
          body: ar
            ? `<p>من <b>شهاداتي</b>: حمّل PDF بضغطة. اشارك الرابط مع جامعة، صاحب عمل، أو على LinkedIn — كل من يفتحه يرى نسخة رسمية مع QR للتحقق.</p>`
            : `<p>From <b>My Certificates</b>: download PDF with one click. Share the link with a university, employer, or on LinkedIn — anyone who opens it sees the official copy plus a verification QR.</p>`,
        },
        {
          title: ar ? "التحقق العام" : "Verifying online",
          body: ar
            ? `<p>QR على كل شهادة يؤدي لرابط عام (مثلاً <code>/verify/abc123</code>) يفتح بدون تسجيل دخول. الجامعات وأصحاب العمل يستخدمونه للتأكد من صحة شهادتك.</p>`
            : `<p>A QR on each certificate links to a public URL (e.g. <code>/verify/abc123</code>) that opens without login. Universities and employers use it to confirm authenticity.</p>`,
        },
      ],
    },
    {
      number: 10,
      title: ar ? "الفواتير والدفع" : "Billing",
      sections: [
        {
          title: ar ? "فواتيرك" : "Your invoices",
          body: ar
            ? `<p>من <b>الفواتير</b>: قائمة بكل فواتيرك. كل فاتورة: التاريخ، الباقة، المبلغ، الحالة (مدفوعة، مستحقة، متأخرة). اضغط لتفتح PDF (بصيغة ZATCA الرسمية).</p>`
            : `<p>From <b>Billing</b>: every invoice. Each row: date, package, amount, status (Paid, Due, Overdue). Click to open PDF (in official ZATCA format).</p>`,
          screenshot: shotPath("student", "11-billing"),
        },
        {
          title: ar ? "الدفع عبر Moyasar" : "Paying via Moyasar",
          body: ar
            ? `<p>افتح فاتورة مستحقة، اضغط <b>ادفع الآن</b>. يفتح نموذج Moyasar الآمن. أدخل بيانات البطاقة (مدى، فيزا، ماستركارد، Apple Pay) واضغط دفع. الفاتورة تتحول لـ "مدفوعة" فوراً.</p>`
            : `<p>Open a due invoice, click <b>Pay Now</b>. The secure Moyasar form opens. Enter card details (mada, Visa, Mastercard, Apple Pay) and submit. The invoice flips to "Paid" instantly.</p>`,
        },
        {
          title: ar ? "أكواد الخصم" : "Promo codes",
          body: ar
            ? `<p>إذا كان لديك كود خصم، أدخله عند الدفع في حقل "كود خصم". الخصم يُحتسَب فوراً قبل الدفع النهائي.</p>`
            : `<p>If you have a promo code, enter it at checkout in the "Promo Code" field. The discount applies instantly before final payment.</p>`,
        },
        {
          title: ar ? "إدارة الاشتراك" : "Subscription management",
          body: ar
            ? `<p>من <b>الفواتير → الاشتراك</b> تقدر:</p>
            <ul>
              <li>ترقية الباقة</li>
              <li>تخفيض الباقة</li>
              <li>إيقاف الاشتراك مؤقتاً</li>
              <li>إلغاء الاشتراك</li>
            </ul>
            <p>كل تغيير له فترة 7 أيام كـ "فترة سماح".</p>`
            : `<p>From <b>Billing → Subscription</b> you can:</p>
            <ul>
              <li>Upgrade your package</li>
              <li>Downgrade</li>
              <li>Pause</li>
              <li>Cancel</li>
            </ul>
            <p>Every change has a 7-day "grace period".</p>`,
        },
      ],
    },
    {
      number: 11,
      title: ar ? "التقويم" : "Calendar",
      sections: [
        {
          title: ar ? "التقويم الموحد" : "Your unified calendar",
          body: ar
            ? `<p><b>التقويم</b> يجمع: حصصك، فعاليات نادي المحادثة، تواريخ الامتحانات، الإجازات الرسمية. عرض شهري، أسبوعي، يومي.</p>`
            : `<p>The <b>Calendar</b> consolidates: your classes, speaking-club events, exam dates, official holidays. Month / week / day views.</p>`,
          screenshot: shotPath("student", "12-calendar"),
        },
        {
          title: ar ? "جدول الحصص" : "Class schedule",
          body: ar
            ? `<p>كل حصص أسبوعك في صورة واحدة. الرسائل والمعلومات تظهر على البطاقة (الاسم، المعلم، الوقت، الحالة).</p>`
            : `<p>Every class this week in one view. Card content shows name, teacher, time, status.</p>`,
        },
        {
          title: ar ? "فعاليات نادي المحادثة" : "Speaking Club events",
          body: ar
            ? `<p>تظهر بلون نعناعي. اضغطها للتسجيل أو لمشاهدة التفاصيل.</p>`
            : `<p>Shown in mint color. Click to RSVP or see details.</p>`,
        },
        {
          title: ar ? "تذكيرات الامتحانات" : "Exam reminders",
          body: ar
            ? `<p>قبل كل امتحان بـ 24 ساعة، تذكير بالبريد + إشعار جوال. اضغط الفعالية في التقويم لمراجعة المنهج.</p>`
            : `<p>24 hours before each exam, an email reminder + mobile push. Click the calendar event to review the syllabus.</p>`,
        },
      ],
    },
  ];
}

function studentAppendix(lang: Lang): ManualAppendix[] {
  const ar = lang === "ar";
  return [
    {
      title: ar ? "ملحق — نصائح للدراسة" : "Appendix — Study Tips",
      body: ar
        ? `<ul>
          <li><b>احضر في الوقت</b> — ادخل قبل الحصة بـ 5 دقائق</li>
          <li><b>دوّن ملاحظاتك</b> — استخدم دفتراً ورقياً، اكتب باليد، يساعد على الحفظ</li>
          <li><b>راجع الملخص الآلي</b> — تمرّن على المفردات الجديدة 5 دقائق يومياً</li>
          <li><b>شارك في نادي المحادثة</b> — حضور مرة شهرياً = تقدم كبير</li>
          <li><b>اطلب المساعدة مبكراً</b> — راسل معلمك بدلاً من الإحباط</li>
          <li><b>كن صبوراً</b> — تعلم اللغة ماراثون لا سباق</li>
        </ul>`
        : `<ul>
          <li><b>Show up on time</b> — enter 5 minutes before class</li>
          <li><b>Take notes</b> — use a paper notebook, write by hand, helps retention</li>
          <li><b>Review the AI summary</b> — drill new vocab 5 min daily</li>
          <li><b>Join speaking-club events</b> — once a month = serious progress</li>
          <li><b>Ask for help early</b> — message your teacher instead of getting stuck</li>
          <li><b>Be patient</b> — language learning is a marathon, not a sprint</li>
        </ul>`,
    },
  ];
}

export function buildStudentManual(lang: Lang): string {
  const ar = lang === "ar";
  const chapters = studentChapters(lang);
  const doc: ManualDoc = {
    role: "student",
    lang,
    cover: {
      eyebrow: ar ? "كُتيّب الطالب" : "STUDENT MANUAL",
      title: ar ? "دليل الطالب" : "Student Manual",
      subtitle: ar
        ? "كل ما يحتاجه الطالب للنجاح في هجر A°"
        : "Everything a student needs to succeed at HAJR A°",
      version: ar ? "الإصدار 2.0" : "Version 2.0",
    },
    toc: [
      ...chapters.map((c) => ({
        num: `${c.number}.`,
        title: c.title,
        page: c.number + 2,
      })),
      { num: ar ? "أ." : "A.", title: ar ? "نصائح للدراسة" : "Study Tips", page: chapters.length + 3 },
    ],
    chapters,
    appendix: studentAppendix(lang),
  };
  return renderManualHtml(doc);
}
