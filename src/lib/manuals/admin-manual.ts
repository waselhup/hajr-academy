/**
 * Admin manual — 14 chapters + 2 appendices. Bilingual.
 * Mirrors the structure laid out in the task brief (Part B).
 */
import { renderManualHtml, shotPath, type ManualDoc, type ManualChapter, type ManualAppendix, type Lang } from "./layout";

function adminChapters(lang: Lang): ManualChapter[] {
  const ar = lang === "ar";
  return [
    {
      number: 1,
      title: ar ? "البدء" : "Getting Started",
      sections: [
        {
          title: ar ? "ما هي أكاديمية هجر" : "What is Hajr Academy",
          body: ar
            ? `<p>أكاديمية هجر A° منصة سعودية رقمية لتعليم اللغة الإنجليزية تجمع بين معلمين بشريين معتمدين وأدوات ذكية مدعومة بالذكاء الاصطناعي. تخدم الأكاديمية الطلاب من المرحلة الابتدائية حتى المستوى المهني، مع مسارات متخصصة لاختبارات STEP و IELTS وبرامج محادثة عامة.</p>
            <p>المنصة بُنيت لتعمل بسلاسة بالعربية والإنجليزية، مع دعم كامل للاتجاه من اليمين إلى اليسار، وتكامل عميق مع Zoom والمدفوعات السعودية (Moyasar) والامتثال الضريبي (ZATCA).</p>`
            : `<p>HAJR A° Academy is a Saudi digital English-learning platform combining certified human teachers with AI-assisted study tools. We serve learners from elementary school through professional fluency, with dedicated tracks for the STEP and IELTS exams plus general conversation programs.</p>
            <p>The platform runs natively in Arabic and English with full RTL support, and integrates deeply with Zoom, Saudi payments (Moyasar), and tax compliance (ZATCA).</p>`,
        },
        {
          title: ar ? "دورك كمشرف" : "Your role as Admin",
          body: ar
            ? `<p>المشرف هو العمود الفقري للعمليات اليومية في الأكاديمية. مسؤولياتك تشمل:</p>
            <ul>
              <li>إدارة الحسابات: إضافة وتعديل الطلاب والمعلمين وأولياء الأمور</li>
              <li>إنشاء البرامج والفصول والجداول</li>
              <li>الإشراف على الفواتير والمدفوعات والعمولات</li>
              <li>مراقبة جودة المحتوى الأكاديمي (بنوك الأسئلة، الامتحانات، التمارين)</li>
              <li>متابعة الاختبارات التحديدية للعملاء المحتملين</li>
              <li>التواصل مع المعلمين عبر الاجتماعات الشهرية</li>
              <li>إصدار الشهادات والتقارير</li>
              <li>إدارة تذاكر الدعم الفني</li>
            </ul>
            <p>كل ما تفعله يُسجَّل في سجل التدقيق — فلا داعي للقلق من فقدان أي معلومة.</p>`
            : `<p>The Admin is the operational backbone of the academy. Your responsibilities include:</p>
            <ul>
              <li>People management: add and edit students, teachers, and parents</li>
              <li>Build programs, classes, and schedules</li>
              <li>Oversee invoices, payments, and commissions</li>
              <li>Quality-control academic content (test banks, exams, exercises)</li>
              <li>Follow up on placement leads</li>
              <li>Coordinate with teachers via monthly meetings</li>
              <li>Issue certificates and reports</li>
              <li>Manage support tickets</li>
            </ul>
            <p>Every action you take is recorded in the audit log — nothing is lost.</p>`,
          tip: ar
            ? "إذا انضممت حديثاً، اقرأ الفصل الأول كاملاً ثم فصل سجل التدقيق (13.5) — يعلمانك كيف تعمل المنصة من الداخل."
            : "If you're new, read all of Chapter 1 plus the Audit Log section (13.5) — they teach you how the platform works inside.",
        },
        {
          title: ar ? "تسجيل الدخول" : "Logging in",
          body: ar
            ? `<p>افتح المتصفح واذهب إلى عنوان الأكاديمية. أدخل بريدك الإلكتروني وكلمة المرور. سيوجهك النظام إلى لوحة المشرف تلقائياً.</p>
            <ol>
              <li>اضغط زر "تسجيل الدخول" في الزاوية العليا</li>
              <li>أدخل بريدك الإلكتروني</li>
              <li>أدخل كلمة المرور</li>
              <li>اضغط دخول — ستنتقل إلى /admin مباشرة</li>
            </ol>`
            : `<p>Open the browser and go to the academy URL. Enter your email and password. The system routes you to the admin dashboard automatically.</p>
            <ol>
              <li>Click "Sign In" in the top corner</li>
              <li>Enter your email</li>
              <li>Enter your password</li>
              <li>Press Enter — you land on /admin</li>
            </ol>`,
          screenshot: shotPath("admin", "01-login"),
          warning: ar
            ? "إذا نسيت كلمة المرور، استخدم رابط 'نسيت كلمة المرور' أو تواصل مع المشرف الأعلى. لا تشارك كلمة المرور أبداً مع زملائك."
            : "If you forget your password, use the 'Forgot Password' link or contact the Super Admin. Never share your password with colleagues.",
        },
        {
          title: ar ? "نظرة عامة على لوحة المشرف" : "The admin dashboard overview",
          body: ar
            ? `<p>اللوحة الرئيسية تعرض:</p>
            <ul>
              <li><b>إحصائيات اليوم:</b> الطلاب النشطون، الحصص المجدولة، التذاكر المفتوحة</li>
              <li><b>التنبيهات الذكية:</b> أي مشكلة تحتاج انتباهك (دفعة معلقة، تذكرة بدون رد، شهادة منتظرة)</li>
              <li><b>القائمة الجانبية:</b> كل الأقسام مرتبة حسب التكرار</li>
              <li><b>البحث الشامل (Cmd+K):</b> يقفز إلى أي طالب/معلم/فصل في ثانية</li>
            </ul>`
            : `<p>The main dashboard displays:</p>
            <ul>
              <li><b>Today's stats:</b> active students, scheduled classes, open tickets</li>
              <li><b>Smart alerts:</b> anything that needs your attention (pending payment, unanswered ticket, certificate awaiting issue)</li>
              <li><b>Side navigation:</b> all sections grouped by frequency</li>
              <li><b>Global search (Cmd+K):</b> jump to any student/teacher/class in a second</li>
            </ul>`,
          screenshot: shotPath("admin", "02-dashboard"),
        },
        {
          title: ar ? "تبديل اللغة" : "Switching language",
          body: ar
            ? `<p>اضغط زر اللغة في الزاوية العليا — يُبدل المنصة كاملة بين العربية والإنجليزية فوراً. التفضيل يُحفظ في حسابك ويتطبق على كل الصفحات في المرات القادمة.</p>`
            : `<p>Click the language toggle in the top corner — switches the entire platform between Arabic and English instantly. Your preference is saved per account and applied to all pages on subsequent visits.</p>`,
        },
      ],
    },
    {
      number: 2,
      title: ar ? "إدارة الأشخاص" : "Managing People",
      sections: [
        {
          title: ar ? "إضافة طالب جديد" : "Adding a new student",
          body: ar
            ? `<ol>
              <li>اذهب إلى <b>الطلاب</b> من القائمة الجانبية</li>
              <li>اضغط <b>+ إضافة طالب</b></li>
              <li>املأ: الاسم الكامل، البريد الإلكتروني، رقم الجوال، الصف الدراسي، الجنس</li>
              <li>(اختياري) ارفع صورة شخصية</li>
              <li>(اختياري) اربط بولي أمر موجود — أو أنشئ ولي أمر جديد من نفس الشاشة</li>
              <li>اضغط <b>حفظ</b> — يصل للطالب بريد ترحيب تلقائياً مع تعليمات تعيين كلمة المرور</li>
            </ol>`
            : `<ol>
              <li>Go to <b>Students</b> from the side navigation</li>
              <li>Click <b>+ Add Student</b></li>
              <li>Fill in: full name, email, phone, grade level, gender</li>
              <li>(Optional) Upload a profile photo</li>
              <li>(Optional) Link to an existing parent — or create a new parent in the same modal</li>
              <li>Click <b>Save</b> — the student receives a welcome email with a password-setup link</li>
            </ol>`,
          screenshot: shotPath("admin", "03-students"),
          tip: ar
            ? "البريد الإلكتروني فريد — لا يمكن وجود طالبين بنفس البريد. إذا حدث خطأ ‘بريد مكرر’، تحقق من قائمة الطلاب أولاً."
            : "Email is unique — no two students can share an email. If you see 'duplicate email', check the student list first.",
        },
        {
          title: ar ? "إضافة معلم جديد" : "Adding a new teacher",
          body: ar
            ? `<p>المعلمون يحتاجون معلومات إضافية:</p>
            <ol>
              <li>اذهب إلى <b>المعلمون</b></li>
              <li>اضغط <b>+ إضافة معلم</b></li>
              <li>أدخل المعلومات الأساسية (الاسم، البريد، الجوال)</li>
              <li>حدد <b>السعر بالساعة (ريال)</b> — هذا يحدد عائد المعلم</li>
              <li>اختر <b>التخصصات</b> (محادثة، STEP، IELTS، أطفال...)</li>
              <li>أضف <b>سيرة ذاتية قصيرة</b> (تظهر في الملف العام)</li>
              <li>اضغط <b>حفظ</b></li>
            </ol>`
            : `<ol>
              <li>Go to <b>Teachers</b></li>
              <li>Click <b>+ Add Teacher</b></li>
              <li>Enter basic info (name, email, phone)</li>
              <li>Set the <b>Hourly Rate (SAR)</b> — this drives the teacher's earnings</li>
              <li>Pick <b>specializations</b> (conversation, STEP, IELTS, kids...)</li>
              <li>Add a <b>short bio</b> (shown on public profile)</li>
              <li>Click <b>Save</b></li>
            </ol>`,
          screenshot: shotPath("admin", "04-teachers"),
          tip: ar
            ? "السعر بالساعة سري — يراه المعلم لكنه لا يظهر في ملفه العام."
            : "Hourly rate is private — the teacher sees it but it never appears on their public profile.",
        },
        {
          title: ar ? "إضافة ولي أمر" : "Adding a parent",
          body: ar
            ? `<p>الطريق الأبسط: من ملف الطالب، اضغط <b>إضافة ولي أمر</b> — يربط تلقائياً. الطريق المستقل: <b>أولياء الأمور → + جديد</b>.</p>
            <p>ولي الأمر يستلم تقريراً شهرياً تلقائياً عن أبنائه في اليوم الأول من كل شهر.</p>`
            : `<p>Easiest path: from a student's profile, click <b>Add Parent</b> — links automatically. Standalone path: <b>Parents → + New</b>.</p>
            <p>Parents receive an automatic monthly report covering all their children on the 1st of each month.</p>`,
          screenshot: shotPath("admin", "05-parents"),
        },
        {
          title: ar ? "ربط ولي الأمر بالطالب" : "Parent ↔ Student linking",
          body: ar
            ? `<p>الربط يحدث من أي اتجاه:</p>
            <ul>
              <li>من ملف الطالب: <b>تبويب أولياء الأمور → ربط</b></li>
              <li>من ملف ولي الأمر: <b>تبويب الأطفال → ربط</b></li>
            </ul>
            <p>يمكن لولي أمر واحد أن يكون له عدة أبناء. كل ابن يظهر منفصلاً في تقاريره.</p>`
            : `<p>Linking works from either side:</p>
            <ul>
              <li>From student profile: <b>Parents tab → Link</b></li>
              <li>From parent profile: <b>Children tab → Link</b></li>
            </ul>
            <p>One parent can have many children. Each child appears as its own section in their reports.</p>`,
        },
        {
          title: ar ? "اعتماد طلبات المسوقين" : "Approving marketer applications",
          body: ar
            ? `<p>المسوقون يتقدمون عبر صفحة عامة. اعتماد كل طلب يتم يدوياً من <b>المسوقون → طلبات معلقة</b>.</p>
            <ol>
              <li>افتح الطلب</li>
              <li>راجع الاسم، البريد، طريقة الاتصال، تجربة سابقة (إن وُجدت)</li>
              <li>اضغط <b>اعتماد</b> — يتولد كود إحالة فريد ويصله بالبريد</li>
              <li>أو اضغط <b>رفض</b> مع سبب — يصله بالبريد كذلك</li>
            </ol>`
            : `<ol>
              <li>Open the application</li>
              <li>Review name, email, contact method, prior experience (if any)</li>
              <li>Click <b>Approve</b> — a unique referral code is generated and emailed</li>
              <li>Or click <b>Reject</b> with a reason — they're emailed too</li>
            </ol>`,
          screenshot: shotPath("admin", "16-marketers"),
        },
        {
          title: ar ? "تعليق / إعادة تفعيل الحسابات" : "Suspending / Reactivating accounts",
          body: ar
            ? `<p>من ملف أي مستخدم، اضغط زر القائمة (⋯) ثم <b>تعليق</b> أو <b>إعادة تفعيل</b>. المستخدم المعلق لا يستطيع تسجيل الدخول لكن بياناته محفوظة.</p>`
            : `<p>From any user profile, click the menu (⋯) → <b>Suspend</b> or <b>Reactivate</b>. Suspended users cannot sign in but their data is preserved.</p>`,
          warning: ar
            ? "تعليق معلم له فصول جارية يحتاج قرار مدير أعلى — تنبه إلى التأثير على الطلاب."
            : "Suspending a teacher with active classes requires Super Admin approval — be mindful of the impact on students.",
        },
        {
          title: ar ? "الاستيراد المجمّع (CSV)" : "Bulk imports (CSV)",
          body: ar
            ? `<p>لاستيراد عدة طلاب دفعة واحدة:</p>
            <ol>
              <li>اذهب إلى <b>الطلاب → استيراد CSV</b></li>
              <li>حمّل القالب — لا تغير أسماء الأعمدة</li>
              <li>املأ صفاً لكل طالب</li>
              <li>ارفع الملف — النظام يعرض معاينة قبل الحفظ النهائي</li>
              <li>راجع الأخطاء (إن وُجدت)، ثم اضغط <b>تأكيد الاستيراد</b></li>
            </ol>`
            : `<ol>
              <li>Go to <b>Students → Import CSV</b></li>
              <li>Download the template — never rename the columns</li>
              <li>Fill one row per student</li>
              <li>Upload — the system shows a preview before final save</li>
              <li>Review errors (if any), then click <b>Confirm Import</b></li>
            </ol>`,
        },
      ],
    },
    {
      number: 3,
      title: ar ? "البرامج والفصول والجداول" : "Programs, Classes & Schedule",
      sections: [
        {
          title: ar ? "إنشاء برنامج" : "Creating a program",
          body: ar
            ? `<p>البرنامج هو الإطار العلوي (مثل "STEP المكثف" أو "محادثة الأطفال"). من <b>البرامج → برنامج جديد</b> أدخل:</p>
            <ul>
              <li><b>الرمز</b> — معرّف فريد بحروف إنجليزية كبيرة (مثل <code>KIDS_ENGLISH</code>). يُستخدم تلقائياً في رموز المجموعات.</li>
              <li><b>النوع</b> — مجموعة / فردي / مدارس (B2B) / تعلّم ذاتي</li>
              <li>الاسم والوصف بالعربية والإنجليزية</li>
              <li>السعر الافتراضي بالريال، والمدة بالساعات (اختياري)</li>
            </ul>
            <p>بعد الإنشاء يظهر البرنامج كبطاقة، وتقدر تعدّله أو تفعّله/توقفه من المفتاح. لا يمكن تكرار نفس الرمز.</p>`
            : `<p>A program is the top-level container (e.g. "STEP Intensive" or "Kids English"). From <b>Programs → New program</b> enter:</p>
            <ul>
              <li><b>Code</b> — a unique uppercase identifier (e.g. <code>KIDS_ENGLISH</code>). Used automatically in cohort codes.</li>
              <li><b>Type</b> — Group / Private / School (B2B) / Self-study</li>
              <li>Name and description in Arabic and English</li>
              <li>Default price in SAR, and duration in hours (optional)</li>
            </ul>
            <p>After creating, the program shows as a card you can edit or toggle active/inactive. Codes must be unique.</p>`,
        },
        {
          title: ar ? "إنشاء فصل + مجموعة" : "Creating a class + cohort",
          body: ar
            ? `<ol>
              <li>اذهب إلى <b>الفصول → + جديد</b></li>
              <li>اختر البرنامج، المعلم، الحد الأقصى للطلاب، نوع الفصل (جماعي/خاص)</li>
              <li>حدد تاريخ البداية والنهاية</li>
              <li>اربط الطلاب من قائمة الطلاب — أو أنشئ المجموعة الآن وأضفهم لاحقاً</li>
            </ol>`
            : `<ol>
              <li>Go to <b>Classes → + New</b></li>
              <li>Pick the program, teacher, max students, class type (group/private)</li>
              <li>Set start and end dates</li>
              <li>Link students from the student list — or create the cohort now and add them later</li>
            </ol>`,
          screenshot: shotPath("admin", "06-classes"),
        },
        {
          title: ar ? "توليد حصص الفصل" : "Generating class sessions",
          body: ar
            ? `<p>بعد إنشاء الفصل، اضغط <b>توليد الحصص</b>. اختر الأيام (الأحد، الثلاثاء…)، الوقت، المدة بالدقائق، وفترة التكرار. النظام يولد كل الحصص دفعة واحدة ويربطها بـ Zoom.</p>`
            : `<p>After creating a class, click <b>Generate Sessions</b>. Pick the days (Sun, Tue…), time, duration in minutes, and recurrence window. The system generates every session in one batch and links each to Zoom.</p>`,
          tip: ar
            ? "اضبط المنطقة الزمنية على Asia/Riyadh — هذا هو الافتراضي وكل أوقات النظام تستخدمه."
            : "Timezone is fixed to Asia/Riyadh — that's the default and all system times use it.",
        },
        {
          title: ar ? "تعديل الجدول" : "Editing the schedule",
          body: ar
            ? `<p>من <b>الجدول</b> ترى عرض شهري لكل الحصص. اسحب أي حصة لتغيير وقتها، أو افتحها وعدل التفاصيل. التعديلات تُرسل إشعارات تلقائياً للمعلم والطلاب.</p>`
            : `<p>From <b>Schedule</b> you see a monthly view of every session. Drag any session to reschedule, or open it and edit details. Changes auto-notify the teacher and students.</p>`,
          screenshot: shotPath("admin", "07-schedule"),
        },
        {
          title: ar ? "إلغاء / إعادة جدولة حصة" : "Cancelling / rescheduling a session",
          body: ar
            ? `<p>افتح الحصة، اضغط <b>إلغاء</b> أو <b>إعادة جدولة</b>. أدخل السبب (إجباري) — يصل للطرفين مع وقت الإلغاء. الحصص الملغاة لا تحتسب في عائد المعلم.</p>`
            : `<p>Open the session, click <b>Cancel</b> or <b>Reschedule</b>. Enter a reason (required) — both parties receive it along with the cancellation time. Cancelled sessions do not count toward the teacher's earnings.</p>`,
        },
      ],
    },
    {
      number: 4,
      title: ar ? "المالية" : "Finance",
      sections: [
        {
          title: ar ? "طلبات الشراء (من الصفحة الرئيسية)" : "Purchase orders (from the landing page)",
          body: ar
            ? `<p>عندما يشتري عميل باقة من الصفحة الرئيسية، يصلك طلب جديد في <b>المالية → طلبات الشراء</b> (<code>/admin/orders</code>) ويصلك إشعار فوري. الطلب يحتوي: اسم الطالب، رقم الجوال، البريد (إن وُجد)، الباقة، والمبلغ، مع حالة الدفع.</p>
            <p><b>لتجهيز الطالب من الطلب:</b></p>
            <ol>
              <li>افتح <b>طلبات الشراء</b> واضغط <b>إنشاء طالب</b> على الطلب الجديد</li>
              <li>أكمل/أكّد البيانات: الاسم، <b>البريد الإلكتروني (إلزامي لإنشاء الدخول)</b>، الجنس، المستوى، المدرسة (اختياري)</li>
              <li>اختياري: عيّن الطالب في فصل مباشرةً (يتحقق النظام من السعة والجنس)</li>
              <li>اضغط <b>إنشاء الحساب</b> — يُنشأ حساب الطالب بكلمة مرور افتراضية (<code>Hajr@2026</code>)، ويصله إشعار ترحيب، وتتحدّث حالة الطلب</li>
            </ol>
            <p>العميل يكون قد رأى صفحة ترحيب تخبره أن معلومات الدخول ستصله خلال ٢٤ ساعة وأن فريق هجر سيتواصل معه — فمهمتك إكمال التجهيز خلال هذه المدة.</p>`
            : `<p>When a customer buys a package on the landing page, a new order arrives in <b>Finance → Purchase Orders</b> (<code>/admin/orders</code>) and you get an instant notification. The order holds: student name, phone, email (if given), package, and amount, with payment status.</p>
            <p><b>To provision the student from an order:</b></p>
            <ol>
              <li>Open <b>Purchase Orders</b> and click <b>Provision</b> on the new order</li>
              <li>Complete/confirm details: name, <b>email (required to create the login)</b>, gender, level, school (optional)</li>
              <li>Optionally assign the student to a class right away (the system checks capacity and gender)</li>
              <li>Click <b>Create account</b> — a student account is created with the default password (<code>Hajr@2026</code>), a welcome notification is sent, and the order status advances</li>
            </ol>
            <p>The customer has already seen a welcome page telling them login details arrive within 24 hours and that the Hajr team will contact them — so your job is to finish provisioning within that window.</p>`,
          tip: ar
            ? "لو العميل لم يُدخل بريداً عند الشراء، أدخله أنت في خطوة التجهيز — البريد ضروري لإنشاء حساب الدخول."
            : "If the customer left email blank at checkout, enter it yourself during provisioning — email is required to create the login account.",
          screenshot: shotPath("admin", "08-finance"),
        },
        {
          title: ar ? "نظرة على الباقات والاشتراكات" : "Subscription packages overview",
          body: ar
            ? `<p>الباقات تُعرَّف في <b>المالية → الباقات</b>. كل باقة: اسم، عدد الحصص، السعر بالريال، صلاحية الاشتراك بالأيام. الطلاب يختارون باقة عند الاشتراك في برنامج.</p>`
            : `<p>Packages are defined in <b>Finance → Packages</b>. Each package: name, session count, price in SAR, subscription validity in days. Students pick a package when enrolling in a program.</p>`,
          screenshot: shotPath("admin", "08-finance"),
        },
        {
          title: ar ? "إصدار فاتورة يدوياً" : "Creating an invoice manually",
          body: ar
            ? `<ol>
              <li><b>المالية → الفواتير → + جديد</b></li>
              <li>اختر الطالب، الباقة (أو سعر مخصص)، الخصومات (إن وُجدت)</li>
              <li>اضغط <b>إصدار</b> — يصل للطالب رابط دفع Moyasar مباشرة بالبريد</li>
            </ol>`
            : `<ol>
              <li><b>Finance → Invoices → + New</b></li>
              <li>Pick the student, the package (or a custom price), any discounts</li>
              <li>Click <b>Issue</b> — the student receives a Moyasar payment link by email</li>
            </ol>`,
        },
        {
          title: ar ? "تسجيل دفعة Moyasar" : "Recording a Moyasar payment",
          body: ar
            ? `<p>المدفوعات الإلكترونية تُسجَّل تلقائياً عبر webhook. للدفعات النقدية أو التحويل البنكي:</p>
            <ol>
              <li>افتح الفاتورة</li>
              <li>اضغط <b>تسجيل دفعة يدوية</b></li>
              <li>أدخل المبلغ، التاريخ، طريقة الدفع، الملاحظات</li>
              <li>احفظ — الفاتورة تنتقل إلى "مدفوعة"</li>
            </ol>`
            : `<p>Electronic payments are auto-recorded via webhook. For cash or bank transfer:</p>
            <ol>
              <li>Open the invoice</li>
              <li>Click <b>Record Manual Payment</b></li>
              <li>Enter amount, date, method, notes</li>
              <li>Save — invoice flips to "Paid"</li>
            </ol>`,
        },
        {
          title: ar ? "الامتثال الضريبي (ZATCA)" : "ZATCA compliance",
          body: ar
            ? `<p>كل فاتورة تتولد بصيغة ZATCA الإلكترونية (XML + QR code) تلقائياً. لا حاجة لتدخل يدوي. التقارير الضريبية الفصلية متوفرة في <b>المالية → التقارير الضريبية</b>.</p>`
            : `<p>Every invoice is auto-generated in ZATCA e-invoice format (XML + QR). No manual intervention required. Quarterly tax reports are available under <b>Finance → Tax Reports</b>.</p>`,
        },
        {
          title: ar ? "أكواد الخصم" : "Promo codes",
          body: ar
            ? `<p><b>المالية → أكواد الخصم → + جديد</b>. حدد: الكود، نوع الخصم (نسبة/مبلغ ثابت)، تاريخ الانتهاء، عدد الاستخدامات الأقصى. يمكن ربطها بمسوق محدد لتتبع العمولة تلقائياً.</p>`
            : `<p><b>Finance → Promo Codes → + New</b>. Set: the code, discount type (percent/flat), expiry, max uses. Can be tied to a specific marketer so commissions are tracked automatically.</p>`,
        },
        {
          title: ar ? "المبالغ المستردة" : "Refunds",
          body: ar
            ? `<p>من الفاتورة، اضغط <b>استرداد</b>. أدخل المبلغ والسبب. إذا كانت الفاتورة مدفوعة بـ Moyasar، يُرسَل الاسترداد آلياً للبطاقة. الطلاب يستلمون إشعاراً بريدياً.</p>`
            : `<p>From the invoice, click <b>Refund</b>. Enter the amount and reason. If the invoice was paid via Moyasar, the refund is sent back to the card automatically. Students are notified by email.</p>`,
          warning: ar
            ? "الاسترداد عملية لا رجعة فيها بمجرد إرسالها إلى Moyasar."
            : "Refunds are irreversible once submitted to Moyasar.",
        },
        {
          title: ar ? "مدفوعات المعلمين" : "Teacher payments",
          body: ar
            ? `<p>عائد المعلم يُحتسَب آلياً بعد كل حصة (السعر بالساعة × المدة). الحالات:</p>
            <ul>
              <li><b>معلقة:</b> الحصة انتهت، تنتظر اعتمادك</li>
              <li><b>معتمدة:</b> وافقت — جاهزة للدفع</li>
              <li><b>مدفوعة:</b> أُرسلت للمعلم</li>
            </ul>
            <p>من <b>المالية → دفعات المعلمين</b> اعتمد بالجملة، ثم سجّل التحويلات.</p>`
            : `<p>Teacher earnings are auto-calculated after every session (hourly rate × duration). States:</p>
            <ul>
              <li><b>Pending:</b> session ended, awaits your approval</li>
              <li><b>Approved:</b> you approved — ready to pay</li>
              <li><b>Paid:</b> transferred to the teacher</li>
            </ul>
            <p>From <b>Finance → Teacher Payments</b> bulk-approve, then record the transfers.</p>`,
        },
        {
          title: ar ? "عمولات المسوقين" : "Marketer commissions",
          body: ar
            ? `<p>تتولد عمولة عند كل عملية اشتراك تستخدم كود إحالة المسوق. النسبة محددة في ملف المسوق. الاعتماد + الدفع يتم من نفس واجهة دفعات المعلمين.</p>`
            : `<p>Commissions trigger on every enrollment using the marketer's referral code. The rate is set on the marketer profile. Approval + payment uses the same UI as teacher payments.</p>`,
        },
        {
          title: ar ? "طلبات الدفع" : "Payment requests from teachers/marketers",
          body: ar
            ? `<p>المعلمون والمسوقون يمكنهم طلب صرف يدوي. <b>طلبات الدفع</b> تعرض كل الطلبات المعلقة — افتح، تحقق، اعتمد أو ارفض.</p>`
            : `<p>Teachers and marketers can request a manual payout. <b>Payment Requests</b> shows all pending requests — open, verify, approve or reject.</p>`,
          screenshot: shotPath("admin", "09-payment-requests"),
        },
      ],
    },
    {
      number: 5,
      title: ar ? "الاتصالات" : "Communications",
      sections: [
        {
          title: ar ? "المحادثات الشاملة" : "Universal chat",
          body: ar
            ? `<p>الصفحة <code>/messages</code> هي مركز المحادثات الفورية. كل المستخدمين (طلاب، معلمون، أولياء أمور، مشرفون) يمكنهم التحدث. الرسائل تظهر فوراً عبر Supabase Realtime.</p>`
            : `<p>The page <code>/messages</code> is the realtime chat hub. All users (students, teachers, parents, admins) can talk. Messages appear instantly via Supabase Realtime.</p>`,
          screenshot: shotPath("admin", "10-communications"),
        },
        {
          title: ar ? "مراقبة المحادثات (للقراءة)" : "Admin chat monitoring (read-only)",
          body: ar
            ? `<p>المشرفون يرون كل المحادثات في <b>الإدارة → الاتصالات</b> لكن للقراءة فقط — لا يمكنهم الرد باسم طرف آخر. هذا للضمان والامتثال.</p>`
            : `<p>Admins see all conversations under <b>Admin → Communications</b> but read-only — they cannot reply as another party. This is for safeguarding and compliance.</p>`,
        },
        {
          title: ar ? "صندوق الوارد (نموذج التواصل)" : "Contact form inbox",
          body: ar
            ? `<p>الرسائل من <code>/contact</code> تصل إلى <b>الإدارة → نموذج التواصل</b>. كل رسالة فيها معلومات المرسل ووسيلة الاتصال. اضغط <b>تعيين كعميل محتمل</b> لتحويلها لتذكرة متابعة.</p>`
            : `<p>Messages from <code>/contact</code> land in <b>Admin → Contact Form</b>. Each row has the sender's info and preferred contact channel. Click <b>Mark as lead</b> to convert it into a follow-up ticket.</p>`,
        },
        {
          title: ar ? "قوالب البريد الإلكتروني" : "Email templates",
          body: ar
            ? `<p>كل بريد آلي يصل من النظام له قالب قابل للتعديل في <b>الإعدادات → قوالب البريد</b>. ادعم اللغتين بنفس النص ثم اضغط <b>اختبار</b> ليصلك نموذج.</p>`
            : `<p>Every automated email has an editable template under <b>Settings → Email Templates</b>. Maintain both languages side-by-side then click <b>Test</b> to receive a sample.</p>`,
        },
        {
          title: ar ? "إعلانات عامة" : "Broadcasting announcements",
          body: ar
            ? `<p>من <b>الاتصالات → بث إعلان</b> اختر الفئة (كل الطلاب / كل المعلمين / فصل محدد)، اكتب الرسالة بالعربية والإنجليزية، واضغط إرسال. تصل بالبريد + إشعار داخل المنصة.</p>`
            : `<p>From <b>Communications → Broadcast</b> pick the audience (all students / all teachers / a specific class), write the message in Arabic and English, and click send. Delivered by email + in-platform notification.</p>`,
        },
        {
          title: ar ? "تفضيلات الإشعارات لكل مستخدم" : "Notification preferences per user",
          body: ar
            ? `<p>كل مستخدم يتحكم بإشعاراته من ملفه الشخصي. كمشرف، يمكنك مشاهدة (لكن لا تعديل) تفضيلات الآخرين من ملفهم.</p>`
            : `<p>Each user controls their own notifications from their profile. As an admin you can view (but not edit) others' preferences from their profile.</p>`,
        },
      ],
    },
    {
      number: 6,
      title: ar ? "المحتوى الأكاديمي" : "Academic Content",
      sections: [
        {
          title: ar ? "بنك الأسئلة" : "Test Bank",
          body: ar
            ? `<p><b>بنك الأسئلة</b> هو مستودع أسئلة الامتحانات. أنواع الأسئلة:</p>
            <ul>
              <li>اختيار من متعدد</li>
              <li>صح / خطأ</li>
              <li>إكمال فراغات</li>
              <li>إجابة قصيرة</li>
              <li>مقالة</li>
            </ul>
            <p>كل سؤال له: نص، خيارات، الإجابة الصحيحة، شرح، المستوى، المهارة. الأسئلة بالعربية أو الإنجليزية.</p>`
            : `<p>The <b>Test Bank</b> is the question repository. Question types:</p>
            <ul>
              <li>Multiple choice</li>
              <li>True / False</li>
              <li>Fill in the blank</li>
              <li>Short answer</li>
              <li>Essay</li>
            </ul>
            <p>Each question has: stem, options, correct answer, explanation, level, skill. Questions are Arabic or English.</p>`,
          screenshot: shotPath("admin", "11-test-bank"),
        },
        {
          title: ar ? "الامتحانات النموذجية" : "Mock exams",
          body: ar
            ? `<p>من <b>الامتحانات → + جديد</b> أنشئ امتحاناً، حدد المدة، السحب من بنك الأسئلة (يدوي أو تلقائي حسب المعايير)، ثم عيّنه لفصل أو طالب محدد.</p>`
            : `<p>From <b>Exams → + New</b> create an exam, set duration, draw from the test bank (manual or auto by criteria), then assign to a class or specific student.</p>`,
          screenshot: shotPath("admin", "12-exams"),
        },
        {
          title: ar ? "تمارين معمل الإنجليزية" : "English Lab exercises",
          body: ar
            ? `<p>تمارين <b>المعمل</b> هي وحدات تدريب قصيرة (5-15 دقيقة) موجهة لمهارات محددة: قواعد، استماع، قراءة، محادثة. أنشئ من <b>المعمل → + جديد</b>.</p>`
            : `<p>Lab exercises are short (5-15 min) training units targeting specific skills: grammar, listening, reading, conversation. Create from <b>Lab → + New</b>.</p>`,
          screenshot: shotPath("admin", "13-lab"),
        },
        {
          title: ar ? "غرف السبورة" : "Blackboard rooms",
          body: ar
            ? `<p>غرف <b>السبورة</b> (Blackboard) مبنية على tldraw — سبورة تفاعلية في الوقت الحقيقي. أنشئ غرفة من <b>السبورات → + جديد</b>، شاركها مع الطلاب، راقب أعمالهم مباشرة.</p>`
            : `<p>Blackboard rooms are powered by tldraw — realtime interactive whiteboards. Create one from <b>Blackboards → + New</b>, share with students, watch their work live.</p>`,
          screenshot: shotPath("admin", "14-blackboards"),
        },
      ],
    },
    {
      number: 7,
      title: ar ? "الاختبارات التحديدية" : "Placement Tests",
      sections: [
        {
          title: ar ? "ثلاثة أنواع: عام / STEP / IELTS" : "Three variants: General / STEP / IELTS",
          body: ar
            ? `<p>المنصة تقدم ثلاثة اختبارات تحديدية مجانية للعملاء المحتملين:</p>
            <ul>
              <li><b>عام:</b> 25 سؤالاً، يحدد المستوى CEFR من A1 إلى C2</li>
              <li><b>STEP:</b> محاكاة دقيقة لاختبار STEP السعودي</li>
              <li><b>IELTS:</b> أربعة أقسام كاملة (قراءة، استماع، كتابة، محادثة)</li>
            </ul>`
            : `<p>The platform offers three free placement tests for prospective learners:</p>
            <ul>
              <li><b>General:</b> 25 questions, returns a CEFR level A1–C2</li>
              <li><b>STEP:</b> a precise simulation of the Saudi STEP exam</li>
              <li><b>IELTS:</b> all four sections (reading, listening, writing, speaking)</li>
            </ul>`,
          screenshot: shotPath("admin", "15-placement"),
        },
        {
          title: ar ? "مراجعة المحاولات" : "Reviewing attempts",
          body: ar
            ? `<p>من <b>الاختبارات التحديدية → المحاولات</b> ترى كل من خاض اختباراً. اضغط على اسم لرؤية إجاباته التفصيلية والنتيجة المحسوبة.</p>`
            : `<p>From <b>Placement Tests → Attempts</b> you see everyone who took a test. Click a name for detailed answers and the computed result.</p>`,
        },
        {
          title: ar ? "متابعة العملاء المحتملين" : "Following up on leads",
          body: ar
            ? `<p>كل محاولة تنتج عميلاً محتملاً تلقائياً. من <b>الاختبارات → عملاء محتملون</b> اتصل أو راسل بناءً على بيانات التواصل التي أدخلها.</p>`
            : `<p>Every attempt auto-creates a lead. From <b>Placement → Leads</b> call or email based on the contact info they supplied.</p>`,
        },
        {
          title: ar ? "إصدار نتيجة يدوياً" : "Manually issuing a result",
          body: ar
            ? `<p>إذا خاض الطالب الاختبار خارج النظام، يمكنك إصدار نتيجة CEFR يدوياً من ملفه. اختر المستوى، أضف ملاحظات، احفظ — تظهر في تقاريره.</p>`
            : `<p>If a student took the test off-platform, you can issue a CEFR result manually from their profile. Pick the level, add notes, save — appears in their reports.</p>`,
        },
      ],
    },
    {
      number: 8,
      title: ar ? "عمليات المعلمين" : "Teachers Operations",
      sections: [
        {
          title: ar ? "الملفات العامة للمعلمين" : "Public teacher profiles",
          body: ar
            ? `<p>كل معلم له صفحة عامة (مثلاً <code>/teachers/ahmed</code>) تعرض السيرة، التخصصات، التقييمات، فيديو تعريفي. حررها من ملف المعلم في الإدارة.</p>`
            : `<p>Each teacher has a public profile (e.g. <code>/teachers/ahmed</code>) showing bio, specializations, ratings, intro video. Edit from the teacher's record in admin.</p>`,
        },
        {
          title: ar ? "قائمة جاهزية المعلم" : "Teacher Readiness checklist",
          body: ar
            ? `<p>كل معلم يكمل 5 عناصر قبل التدريس الفعلي:</p>
            <ol>
              <li>ملف شخصي مكتمل</li>
              <li>صورة شخصية محترفة</li>
              <li>سيرة قصيرة (لغتان)</li>
              <li>فيديو تعريفي</li>
              <li>اجتياز حصة تجريبية مع المشرف</li>
            </ol>
            <p>من <b>المعلمون → جاهزية</b> راجع وضع كل معلم. عند اكتمال الخمسة، اضغط <b>اعتماد</b> — يحصل على شارة ✓ ذهبية في ملفه العام.</p>`
            : `<ol>
              <li>Complete profile</li>
              <li>Professional headshot</li>
              <li>Short bio (both languages)</li>
              <li>Intro video</li>
              <li>Pass a trial class with admin</li>
            </ol>
            <p>From <b>Teachers → Readiness</b> review each teacher's status. When all five clear, click <b>Verify</b> — they get a gold ✓ badge on their public profile.</p>`,
        },
        {
          title: ar ? "الاجتماعات الشهرية" : "Monthly meetings",
          body: ar
            ? `<p>اجتماع شهري إلزامي لكل المعلمين. أنشئه من <b>اجتماعات المعلمين → + جديد</b>:</p>
            <ol>
              <li>التاريخ والوقت</li>
              <li>جدول الأعمال (نقاط)</li>
              <li>الحضور (كل المعلمين تلقائياً، يمكن استبعاد بعضهم)</li>
              <li>رابط Zoom (يتولد تلقائياً)</li>
            </ol>
            <p>بعد الاجتماع، أضف <b>محضراً</b> + <b>مهام موزعة على المعلمين</b>. تصلهم بالبريد ويتابعونها من حساباتهم.</p>`
            : `<ol>
              <li>Date and time</li>
              <li>Agenda (bullet points)</li>
              <li>Attendees (all teachers by default, can exclude some)</li>
              <li>Zoom link (auto-generated)</li>
            </ol>
            <p>After the meeting, add <b>minutes</b> + <b>action items per teacher</b>. Emailed to them and tracked from their accounts.</p>`,
          screenshot: shotPath("admin", "27-teacher-meetings"),
        },
        {
          title: ar ? "لوحة نشاط المعلمين" : "Teacher activity dashboard",
          body: ar
            ? `<p><b>نشاط المعلمين</b> لوحة تحليلية: عدد الحصص هذا الشهر، متوسط التقييم، نسبة الحضور، نسبة الردود على رسائل الطلاب خلال 24 ساعة. مفيدة لتقييم الأداء.</p>`
            : `<p><b>Teacher Activity</b> is an analytics dashboard: sessions this month, average rating, attendance %, message response rate within 24 hours. Useful for performance reviews.</p>`,
          screenshot: shotPath("admin", "26-teacher-activity"),
        },
        {
          title: ar ? "تقييمات المعلمين" : "Teacher ratings",
          body: ar
            ? `<p>الطلاب يقيمون المعلم بعد كل حصة (1-5 نجوم + تعليق اختياري). من <b>المعلم → التقييمات</b> راجع التقييمات. يمكنك إخفاء تقييم مسيء بسبب موثق.</p>`
            : `<p>Students rate the teacher after every session (1-5 stars + optional comment). From <b>Teacher → Ratings</b> review each. You can hide an abusive rating with a documented reason.</p>`,
        },
      ],
    },
    {
      number: 9,
      title: ar ? "تقارير أولياء الأمور والشهادات" : "Parent Reports & Certificates",
      sections: [
        {
          title: ar ? "التقارير الشهرية لأولياء الأمور" : "Monthly parent reports",
          body: ar
            ? `<p>تُولَّد آلياً في اليوم الأول من كل شهر لكل ولي أمر. التقرير: الحضور، التقدم، التقييم العام، رسالة من المعلم، توصيات. يصل بصيغة PDF + رابط مشاهدة.</p>`
            : `<p>Auto-generated on the 1st of every month for each parent. The report covers: attendance, progress, overall rating, teacher's note, recommendations. Delivered as PDF + view link.</p>`,
        },
        {
          title: ar ? "إعادة توليد تقرير يدوياً" : "Manually regenerating a report",
          body: ar
            ? `<p>إذا كان هناك خطأ، من <b>ولي الأمر → التقارير</b> اضغط <b>إعادة التوليد</b>. التقرير الجديد يحل محل القديم. ولي الأمر يُخطَر تلقائياً.</p>`
            : `<p>If something's wrong, from <b>Parent → Reports</b> click <b>Regenerate</b>. The new report replaces the old. The parent is auto-notified.</p>`,
        },
        {
          title: ar ? "إصدار الشهادات" : "Issuing certificates",
          body: ar
            ? `<p>ثلاثة أنواع:</p>
            <ul>
              <li><b>إنجاز مستوى:</b> عند إكمال CEFR محدد</li>
              <li><b>إتمام دورة:</b> عند إنهاء برنامج</li>
              <li><b>اختبار تحديدي:</b> نتيجة الاختبار</li>
            </ul>
            <p>من <b>الشهادات → + جديد</b>: اختر الطالب، النوع، التاريخ، اسم الموقع، اضغط إصدار. يستلم الطالب رابط تحميل PDF + QR للتحقق العام.</p>`
            : `<p>Three types:</p>
            <ul>
              <li><b>Level Achievement:</b> on reaching a CEFR level</li>
              <li><b>Course Completion:</b> on finishing a program</li>
              <li><b>Placement:</b> placement test result</li>
            </ul>
            <p>From <b>Certificates → + New</b>: pick the student, type, date, signer, click Issue. The student gets a PDF download link + a public-verification QR code.</p>`,
          screenshot: shotPath("admin", "17-certificates"),
        },
        {
          title: ar ? "إلغاء شهادة" : "Revoking a certificate",
          body: ar
            ? `<p>افتح الشهادة، اضغط <b>إلغاء</b>، أدخل السبب. الشهادة تبقى في النظام لكن صفحة التحقق العام تعرض "مُلغاة".</p>`
            : `<p>Open the certificate, click <b>Revoke</b>, enter a reason. The record stays in the system but the public verify page shows "Revoked".</p>`,
        },
        {
          title: ar ? "رابط التحقق بالـ QR" : "QR verification URL",
          body: ar
            ? `<p>كل شهادة لها رابط عام (مثلاً <code>/verify/abc123</code>) يفتح بدون تسجيل دخول. أصحاب العمل أو الجامعات يستخدمونه للتحقق من صحة الشهادة.</p>`
            : `<p>Each certificate has a public URL (e.g. <code>/verify/abc123</code>) that opens without login. Employers or universities use it to confirm authenticity.</p>`,
        },
      ],
    },
    {
      number: 10,
      title: ar ? "نادي المحادثة" : "Speaking Club",
      sections: [
        {
          title: ar ? "إنشاء فعالية" : "Creating an event",
          body: ar
            ? `<p><b>نادي المحادثة → + فعالية جديدة</b>. أدخل: العنوان، الوصف، المضيف، التاريخ والوقت، المستوى المستهدف، الحد الأقصى للحضور.</p>`
            : `<p><b>Speaking Club → + New Event</b>. Enter: title, description, host, date and time, target level, max attendees.</p>`,
          screenshot: shotPath("admin", "18-speaking-club"),
        },
        {
          title: ar ? "إدارة الحضور (RSVP)" : "Managing RSVPs",
          body: ar
            ? `<p>الطلاب يسجلون من حساباتهم. من ملف الفعالية ترى قائمة المسجلين الكاملة، يمكنك إلغاء تسجيل أو رفع الحد الأقصى.</p>`
            : `<p>Students RSVP from their accounts. From the event detail you see the full registrant list — you can cancel a registration or raise the cap.</p>`,
        },
        {
          title: ar ? "تسجيل الحضور" : "Marking attendance",
          body: ar
            ? `<p>بعد الفعالية، اضغط <b>تسجيل الحضور</b>، اختر من حضر فعلياً. يحتسب في إحصائيات الطلاب وفي مؤهلات الشهادات.</p>`
            : `<p>After the event click <b>Mark Attendance</b>, pick who actually showed up. Counts toward student stats and certificate eligibility.</p>`,
        },
        {
          title: ar ? "تسجيلات الفعالية" : "Event recordings",
          body: ar
            ? `<p>التسجيل من Zoom يُرفَق آلياً بصفحة الفعالية بعد انتهائها. متاح للطلاب المسجلين فقط.</p>`
            : `<p>The Zoom recording is auto-attached to the event page after it ends. Only registered students can view it.</p>`,
        },
      ],
    },
    {
      number: 11,
      title: ar ? "الدعم الفني (التذاكر)" : "Support (Tickets)",
      sections: [
        {
          title: ar ? "لوحة Kanban" : "Kanban board overview",
          body: ar
            ? `<p>التذاكر تظهر في 4 أعمدة: مفتوحة، قيد المعالجة، تنتظر العميل، مغلقة. اسحب أي تذكرة بين الأعمدة لتغيير حالتها.</p>`
            : `<p>Tickets show in 4 columns: Open, In Progress, Awaiting Customer, Closed. Drag any ticket between columns to change its state.</p>`,
          screenshot: shotPath("admin", "19-tickets"),
        },
        {
          title: ar ? "التصنيف التلقائي" : "Auto-categorization",
          body: ar
            ? `<p>الذكاء الاصطناعي يصنف كل تذكرة جديدة (دفع، فني، أكاديمي، شكوى…) ويقترح أولوية. أنت تؤكد أو تعدل.</p>`
            : `<p>AI auto-categorizes every new ticket (payment, technical, academic, complaint…) and suggests a priority. You confirm or adjust.</p>`,
        },
        {
          title: ar ? "الردود والملاحظات الداخلية" : "Replying + internal notes",
          body: ar
            ? `<p>كل تذكرة تدعم: رد علني (يصل العميل) أو ملاحظة داخلية (تظهر للموظفين فقط). الردود تصل بالبريد + تظهر في حساب العميل.</p>`
            : `<p>Each ticket supports: a public reply (delivered to the customer) or an internal note (visible to staff only). Replies arrive by email + show in the customer's account.</p>`,
        },
        {
          title: ar ? "الإسناد وتغيير الحالة" : "Assigning + status transitions",
          body: ar
            ? `<p>من رأس التذكرة: عيّن لموظف، غيّر الأولوية، حدد فئة، أغلق بسبب. كل تغيير يُسجَّل في سجل التدقيق.</p>`
            : `<p>From the ticket header: assign to staff, change priority, set category, close with reason. Every change is recorded in the audit log.</p>`,
        },
      ],
    },
    {
      number: 12,
      title: ar ? "الهوية البصرية والتسليم" : "Brand Kit & Delivery",
      sections: [
        {
          title: ar ? "تحميل دليل الهوية" : "Downloading brand book PDF",
          body: ar
            ? `<p><b>الهوية البصرية → تحميل الدليل</b>. ملف 10 صفحات يحوي الألوان، الخطوط، الشعار، أمثلة استخدام، DO/DON'T. أرسله لأي مصمم خارجي.</p>`
            : `<p><b>Brand Kit → Download Book</b>. 10-page document with colors, typography, logo system, usage examples, DO/DON'T. Send to any external designer.</p>`,
          screenshot: shotPath("admin", "20-brand-kit"),
        },
        {
          title: ar ? "مكتبة الأصول" : "Asset library",
          body: ar
            ? `<p>كل الشعارات، الأيقونات، الصور الجاهزة في مكان واحد. حمّل بصيغة SVG (للمصممين) أو PNG (للاستخدام السريع).</p>`
            : `<p>All logos, icons, ready-made images in one place. Download as SVG (for designers) or PNG (for quick use).</p>`,
        },
        {
          title: ar ? "إرسال إلى المصمم" : "Sending to a designer",
          body: ar
            ? `<p>اضغط <b>إنشاء حزمة</b> — يولد رابطاً مؤقتاً (صالح 7 أيام) يحوي كل الأصول + دليل الهوية. أرسله بالبريد.</p>`
            : `<p>Click <b>Build Bundle</b> — produces a temporary link (valid 7 days) containing all assets + the brand book. Email it.</p>`,
        },
        {
          title: ar ? "أداة التحقق (12 تبويب)" : "Validation Mode (12 tabs)",
          body: ar
            ? `<p>الصفحة <code>/admin/validation</code> أداة تشخيصية: 12 تبويب لفحص كل جانب من جوانب المنصة (i18n، التغطية، الإشعارات، الأداء…). استخدمها قبل التسليم النهائي.</p>`
            : `<p>The page <code>/admin/validation</code> is a diagnostic tool: 12 tabs to inspect every facet of the platform (i18n, coverage, notifications, performance…). Run before final delivery.</p>`,
          screenshot: shotPath("admin", "22-validation"),
        },
      ],
    },
    {
      number: 13,
      title: ar ? "إدارة النظام" : "System Administration",
      sections: [
        {
          title: ar ? "إدارة فعاليات التقويم" : "Calendar event management",
          body: ar
            ? `<p>التقويم يجمع: الحصص، الاجتماعات، الفعاليات، الإجازات الرسمية. أضف إجازة من <b>الإعدادات → الإجازات</b> — تظهر لكل المستخدمين.</p>`
            : `<p>The calendar consolidates: classes, meetings, events, official holidays. Add a holiday from <b>Settings → Holidays</b> — visible to all users.</p>`,
        },
        {
          title: ar ? "ملخصات الحصص بالذكاء الاصطناعي" : "AI lesson summaries",
          body: ar
            ? `<p>بعد كل حصة، نموذج Claude يولد ملخصاً: مفردات جديدة، نقاط نحوية، واجبات، خطة الحصة القادمة. عند الحاجة، أعد توليد ملخصات بالجملة من <b>الذكاء الاصطناعي → إعادة توليد</b>.</p>`
            : `<p>After every session, a Claude model writes a summary: new vocabulary, grammar points, homework, plan for next class. If needed, bulk-regenerate from <b>AI → Regenerate</b>.</p>`,
          screenshot: shotPath("admin", "28-ai"),
        },
        {
          title: ar ? "مكتبة التسجيلات" : "Class recordings library",
          body: ar
            ? `<p>تسجيلات Zoom تُحفَظ تلقائياً وتُربَط بالحصة. من <b>التسجيلات</b> ابحث وحمّل أي تسجيل. التسجيلات الخاصة (محادثة فردية) محمية.</p>`
            : `<p>Zoom recordings are auto-saved and linked to the session. From <b>Recordings</b> search and download any. Private recordings (1:1 sessions) are protected.</p>`,
          screenshot: shotPath("admin", "25-recordings"),
        },
        {
          title: ar ? "مساعد هجر بالذكاء الاصطناعي" : "Hajr AI assistant",
          body: ar
            ? `<p>مساعد محادثة داخلي مدرّب على بيانات الأكاديمية. اسأله "كم طالباً انضم هذا الأسبوع؟" أو "أي معلم لديه أعلى تقييم في STEP؟" يستجيب بإجابات مبنية على بيانات حية.</p>`
            : `<p>An internal chat assistant trained on academy data. Ask "How many students joined this week?" or "Which teacher has the highest STEP rating?" — answers come from live data.</p>`,
        },
        {
          title: ar ? "سجل التدقيق" : "Audit log",
          body: ar
            ? `<p>كل عملية حساسة (إضافة، تعديل، حذف، اعتماد، إلغاء) تُسجَّل: من، متى، ماذا، من أين IP. من <b>سجل التدقيق</b> ابحث وفلتر بأي معيار. لا يمكن تعديل أو حذف السجلات.</p>`
            : `<p>Every sensitive action (create, edit, delete, approve, cancel) is logged: who, when, what, source IP. From <b>Audit Log</b> search and filter on any field. Logs cannot be edited or deleted.</p>`,
          screenshot: shotPath("admin", "23-audit-log"),
          tip: ar
            ? "إذا أردت معرفة 'من فعل ماذا' في حادثة، سجل التدقيق هو المرجع الأول دائماً."
            : "If you ever need to know 'who did what' in an incident, the audit log is always your first stop.",
        },
        {
          title: ar ? "إعدادات النظام" : "System settings",
          body: ar
            ? `<p><b>الإعدادات</b> تضم: قوالب البريد، مفاتيح API (Zoom، Moyasar، Resend)، حدود الاستخدام، النسخ الاحتياطية، الإجازات الرسمية، أعضاء الفريق وصلاحياتهم.</p>`
            : `<p><b>Settings</b> covers: email templates, API keys (Zoom, Moyasar, Resend), rate limits, backups, official holidays, team members and permissions.</p>`,
          screenshot: shotPath("admin", "24-settings"),
        },
        {
          title: ar ? "النسخ الاحتياطية" : "Backups",
          body: ar
            ? `<p>Supabase يأخذ نسخة احتياطية يومية تلقائية. للاسترداد، تواصل مع المشرف الأعلى — الاسترداد يحتاج موافقة فنية.</p>`
            : `<p>Supabase takes a daily automatic backup. To restore, contact the Super Admin — restoration requires technical sign-off.</p>`,
          warning: ar
            ? "لا تعدل بيانات الإنتاج مباشرة في قاعدة البيانات — استخدم واجهة المشرف دائماً، حتى يُسجَّل التغيير."
            : "Never edit production data directly in the database — always use the admin UI so the change is logged.",
        },
      ],
    },
    {
      number: 14,
      title: ar ? "حل المشاكل" : "Troubleshooting",
      sections: [
        {
          title: ar ? "مستخدم لا يستطيع تسجيل الدخول" : "User can't log in",
          body: ar
            ? `<ol>
              <li>تحقق أن الحساب ليس معلقاً</li>
              <li>اطلب من المستخدم إعادة تعيين كلمة المرور</li>
              <li>تحقق من سجل التدقيق لمحاولات تسجيل الدخول الأخيرة</li>
              <li>إذا استمرت المشكلة، أنشئ تذكرة فنية</li>
            </ol>`
            : `<ol>
              <li>Verify the account is not suspended</li>
              <li>Ask the user to reset their password</li>
              <li>Check the audit log for recent login attempts</li>
              <li>If the problem persists, open a technical ticket</li>
            </ol>`,
        },
        {
          title: ar ? "البريد / SMS لا يصل" : "Email / SMS not delivering",
          body: ar
            ? `<p>اذهب إلى <b>الإعدادات → السجلات</b>:</p>
            <ul>
              <li>Resend logs: حالة كل بريد</li>
              <li>إذا كان معلقاً، انتظر 5 دقائق</li>
              <li>إذا فشل، تحقق من سمعة النطاق + مفاتيح API</li>
            </ul>`
            : `<ul>
              <li>Resend logs: status of every email</li>
              <li>If queued, wait 5 minutes</li>
              <li>If failed, check domain reputation + API keys</li>
            </ul>`,
        },
        {
          title: ar ? "مشاكل تكامل Zoom" : "Zoom integration issues",
          body: ar
            ? `<p>إذا لم تتولد روابط Zoom للحصص الجديدة:</p>
            <ol>
              <li>تحقق من صلاحية الـ Server-to-Server OAuth credentials</li>
              <li>أعد توليد المفاتيح من Zoom Marketplace إذا انتهت</li>
              <li>ضع المفاتيح الجديدة في <b>الإعدادات → التكاملات</b></li>
            </ol>`
            : `<ol>
              <li>Verify the Server-to-Server OAuth credentials are valid</li>
              <li>Regenerate keys in Zoom Marketplace if expired</li>
              <li>Put the new keys in <b>Settings → Integrations</b></li>
            </ol>`,
        },
        {
          title: ar ? "Webhook الدفع فاشل" : "Payment webhook failing",
          body: ar
            ? `<p>إذا لم تُسجَّل دفعة Moyasar تلقائياً:</p>
            <ol>
              <li>افحص سجل webhook في Moyasar Dashboard</li>
              <li>تحقق أن نقطة النهاية صحيحة + متاحة</li>
              <li>سجّل الدفعة يدوياً مؤقتاً (راجع 4.3)</li>
            </ol>`
            : `<ol>
              <li>Check the Moyasar dashboard's webhook log</li>
              <li>Verify the endpoint URL is correct + reachable</li>
              <li>Record the payment manually for now (see 4.3)</li>
            </ol>`,
        },
        {
          title: ar ? "متى تتصل بالدعم" : "When to call support",
          body: ar
            ? `<ul>
              <li>توقف كامل للمنصة (خطأ 500 على كل الصفحات)</li>
              <li>فقدان بيانات</li>
              <li>أي مشكلة أمنية مشبوهة (وصول غير مصرح)</li>
              <li>مشاكل دفع متكررة لأكثر من ساعة</li>
            </ul>
            <p>الاتصالات: راجع الملحق B.</p>`
            : `<ul>
              <li>Full platform outage (500 errors everywhere)</li>
              <li>Data loss</li>
              <li>Any suspected security issue (unauthorized access)</li>
              <li>Recurring payment problems for more than an hour</li>
            </ul>
            <p>Contacts: see Appendix B.</p>`,
        },
      ],
    },
  ];
}

function adminAppendix(lang: Lang): ManualAppendix[] {
  const ar = lang === "ar";
  return [
    {
      title: ar ? "ملحق أ — اختصارات لوحة المفاتيح" : "Appendix A — Keyboard Shortcuts",
      body: `<table>
        <thead><tr><th>${ar ? "الاختصار" : "Shortcut"}</th><th>${ar ? "الفعل" : "Action"}</th></tr></thead>
        <tbody>
          <tr><td><span class="kbd">Cmd / Ctrl + K</span></td><td>${ar ? "البحث الشامل" : "Global search"}</td></tr>
          <tr><td><span class="kbd">Cmd / Ctrl + /</span></td><td>${ar ? "تبديل اللغة" : "Toggle language"}</td></tr>
          <tr><td><span class="kbd">G then D</span></td><td>${ar ? "الانتقال للوحة" : "Go to dashboard"}</td></tr>
          <tr><td><span class="kbd">G then S</span></td><td>${ar ? "الانتقال للطلاب" : "Go to students"}</td></tr>
          <tr><td><span class="kbd">G then T</span></td><td>${ar ? "الانتقال للمعلمين" : "Go to teachers"}</td></tr>
          <tr><td><span class="kbd">Esc</span></td><td>${ar ? "إغلاق أي نافذة" : "Close any modal"}</td></tr>
        </tbody>
      </table>`,
    },
    {
      title: ar ? "ملحق ب — جهات الاتصال للطوارئ" : "Appendix B — Emergency Contacts",
      body: `<table>
        <thead><tr><th>${ar ? "الخدمة" : "Service"}</th><th>${ar ? "التواصل" : "Contact"}</th></tr></thead>
        <tbody>
          <tr><td>Vercel (${ar ? "الاستضافة" : "hosting"})</td><td>support@vercel.com · vercel.com/help</td></tr>
          <tr><td>Supabase (${ar ? "قاعدة البيانات" : "database"})</td><td>support@supabase.com</td></tr>
          <tr><td>Resend (${ar ? "البريد" : "email"})</td><td>support@resend.com</td></tr>
          <tr><td>Zoom (${ar ? "الفيديو" : "video"})</td><td>support.zoom.us</td></tr>
          <tr><td>Moyasar (${ar ? "المدفوعات" : "payments"})</td><td>support@moyasar.com</td></tr>
        </tbody>
      </table>`,
    },
  ];
}

export function buildAdminManual(lang: Lang): string {
  const ar = lang === "ar";
  const chapters = adminChapters(lang);
  const doc: ManualDoc = {
    role: "admin",
    lang,
    cover: {
      eyebrow: ar ? "كُتيّب المنصة" : "PLATFORM MANUAL",
      title: ar ? "دليل المشرف" : "Admin Manual",
      subtitle: ar
        ? "كل ما يحتاجه المشرف لتشغيل أكاديمية هجر A°"
        : "Everything an admin needs to run HAJR A° Academy",
      version: ar ? "الإصدار 2.0" : "Version 2.0",
    },
    toc: [
      ...chapters.map((c) => ({
        num: ar ? `${c.number}.` : `${c.number}.`,
        title: c.title,
        page: c.number + 2,
      })),
      { num: ar ? "أ." : "A.", title: ar ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts", page: chapters.length + 3 },
      { num: ar ? "ب." : "B.", title: ar ? "جهات الاتصال" : "Emergency Contacts", page: chapters.length + 3 },
    ],
    chapters,
    appendix: adminAppendix(lang),
  };
  return renderManualHtml(doc);
}
