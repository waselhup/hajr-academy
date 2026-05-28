/**
 * Teacher manual — 13 chapters + appendix. Bilingual.
 */
import { renderManualHtml, shotPath, type ManualDoc, type ManualChapter, type ManualAppendix, type Lang } from "./layout";

function teacherChapters(lang: Lang): ManualChapter[] {
  const ar = lang === "ar";
  return [
    {
      number: 1,
      title: ar ? "أهلاً بك" : "Welcome",
      sections: [
        {
          title: ar ? "أهلاً في هجر A°" : "Welcome to HAJR A°",
          body: ar
            ? `<p>مرحباً بك في فريق التدريس في أكاديمية هجر A°. هذا الدليل يأخذك خطوة بخطوة عبر كل ما تحتاج لمعرفته — من تسجيل الدخول الأول، إلى بدء حصتك الأولى، إلى استلام أول دفعة.</p>
            <p>إذا قرأته كاملاً (20 دقيقة)، ستكون جاهزاً للتدريس بثقة في نفس اليوم.</p>`
            : `<p>Welcome to the HAJR A° teaching team. This guide walks you step-by-step through everything you need — from your first login, to starting your first class, to receiving your first payment.</p>
            <p>If you read it end-to-end (20 minutes) you'll be ready to teach confidently on day one.</p>`,
        },
        {
          title: ar ? "دورك" : "Your role",
          body: ar
            ? `<p>أنت العنصر الإنساني في الأكاديمية. الطلاب يأتون من أجلك — لا من أجل المنصة. مسؤولياتك:</p>
            <ul>
              <li>تدريس الحصص المجدولة في وقتها</li>
              <li>إضافة ملاحظات بعد كل حصة (المنصة تحولها لملخص آلي)</li>
              <li>تسجيل الحضور</li>
              <li>الرد على رسائل الطلاب وأولياء الأمور خلال 24 ساعة</li>
              <li>الحضور للاجتماعات الشهرية</li>
              <li>إكمال قائمة الجاهزية لتحصل على الشارة الذهبية</li>
            </ul>`
            : `<p>You are the human element of the academy. Students come for you — not for the platform. Your responsibilities:</p>
            <ul>
              <li>Teach scheduled sessions on time</li>
              <li>Add notes after each session (the platform converts them into an AI summary)</li>
              <li>Mark attendance</li>
              <li>Respond to student and parent messages within 24 hours</li>
              <li>Attend monthly meetings</li>
              <li>Complete the readiness checklist to earn your gold badge</li>
            </ul>`,
        },
        {
          title: ar ? "أول تسجيل دخول" : "First login",
          body: ar
            ? `<ol>
              <li>افتح الرابط الذي وصلك بالبريد عند تسجيلك</li>
              <li>عيّن كلمة مرور قوية (8 أحرف على الأقل، أرقام ورموز)</li>
              <li>سجّل دخول من <code>/login</code></li>
              <li>ستنتقل تلقائياً إلى <code>/teacher</code></li>
            </ol>`
            : `<ol>
              <li>Open the link in the welcome email</li>
              <li>Set a strong password (min 8 chars, numbers + symbols)</li>
              <li>Sign in at <code>/login</code></li>
              <li>You land automatically on <code>/teacher</code></li>
            </ol>`,
          screenshot: shotPath("teacher", "01-login"),
        },
        {
          title: ar ? "إعداد ملفك الشخصي" : "Setting up your profile",
          body: ar
            ? `<p>من <b>ملفي</b>:</p>
            <ul>
              <li>سيرة قصيرة بالعربية والإنجليزية (3-4 أسطر)</li>
              <li>صورة شخصية احترافية (مربعة، ≥ 400×400)</li>
              <li>تخصصاتك (محادثة، STEP، IELTS، أطفال…)</li>
              <li>فيديو تعريفي قصير (30-60 ثانية، يرفعه المشرف)</li>
            </ul>
            <p>هذه الحقول هي ما يراه الطالب قبل أن يحجز معك. اهتم بها.</p>`
            : `<p>From <b>My Profile</b>:</p>
            <ul>
              <li>Short bio in Arabic and English (3-4 lines)</li>
              <li>Professional headshot (square, ≥ 400×400)</li>
              <li>Specializations (conversation, STEP, IELTS, kids…)</li>
              <li>Short intro video (30-60 sec, uploaded by admin)</li>
            </ul>
            <p>These fields are what a student sees before booking you. Make them count.</p>`,
          screenshot: shotPath("teacher", "14-profile"),
        },
        {
          title: ar ? "سعرك بالساعة" : "Your hourly rate",
          body: ar
            ? `<p>السعر يحدده المشرف. تراه في ملفك لكنه لا يظهر للطلاب. عند انتهاء كل حصة، يُحتسَب عائدك تلقائياً = السعر × المدة.</p>`
            : `<p>The rate is set by admin. You see it on your profile but students do not. After each session your earnings auto-calculate = rate × duration.</p>`,
        },
      ],
    },
    {
      number: 2,
      title: ar ? "لوحة التحكم" : "Your Dashboard",
      sections: [
        {
          title: ar ? "نظرة عامة" : "Dashboard overview",
          body: ar
            ? `<p>لوحة المعلم تعرض:</p>
            <ul>
              <li>بطاقة الحصة القادمة (مع زر دخول Zoom مباشر)</li>
              <li>إحصائيات اليوم: حصص متبقية، رسائل غير مقروءة</li>
              <li>إحصائيات الشهر: عدد الحصص، عائدك المتوقع، تقييمك</li>
              <li>إجراءات سريعة: تسجيل حضور، فتح رسالة، إنشاء سبورة</li>
            </ul>`
            : `<p>The teacher dashboard shows:</p>
            <ul>
              <li>Next-class card (with a direct Zoom link)</li>
              <li>Today's stats: classes left, unread messages</li>
              <li>Month stats: session count, projected earnings, your rating</li>
              <li>Quick actions: mark attendance, open a message, create a blackboard</li>
            </ul>`,
          screenshot: shotPath("teacher", "02-dashboard"),
        },
        {
          title: ar ? "بطاقة الحصة القادمة" : "Next class card",
          body: ar
            ? `<p>تعرض: اسم الفصل، عدد الطلاب، الوقت المتبقي، زر "دخول الحصة". اضغطه قبل الوقت بـ 5 دقائق ليفتح Zoom في تبويب جديد.</p>`
            : `<p>Shows: class name, student count, time remaining, "Enter Class" button. Click it 5 minutes before to open Zoom in a new tab.</p>`,
          tip: ar
            ? "ادخل قبل الوقت بـ 5 دقائق دائماً — الطالب يلاحظ كل مرة."
            : "Always enter 5 minutes early — students notice every single time.",
        },
        {
          title: ar ? "إحصائيات اليوم" : "Today's stats",
          body: ar
            ? `<p>عداد بسيط للحصص المتبقية اليوم + الرسائل غير المقروءة. اضغط أي رقم للانتقال لتفاصيله.</p>`
            : `<p>Simple counters: classes left today + unread messages. Click any number to jump to its detail view.</p>`,
        },
        {
          title: ar ? "الإجراءات السريعة" : "Quick actions",
          body: ar
            ? `<p>4 أزرار في الأعلى:</p>
            <ul>
              <li><b>تسجيل حضور:</b> يفتح آخر حصة انتهت</li>
              <li><b>إنشاء سبورة:</b> غرفة tldraw جديدة</li>
              <li><b>رسالة جديدة:</b> يفتح المحادثات</li>
              <li><b>تقييماتي:</b> يعرض كل تقييمات الطلاب</li>
            </ul>`
            : `<p>4 buttons at the top:</p>
            <ul>
              <li><b>Mark Attendance:</b> opens the most-recently-ended session</li>
              <li><b>Create Blackboard:</b> new tldraw room</li>
              <li><b>New Message:</b> opens chat</li>
              <li><b>My Ratings:</b> shows all student ratings</li>
            </ul>`,
        },
      ],
    },
    {
      number: 3,
      title: ar ? "فصولك" : "Your Classes",
      sections: [
        {
          title: ar ? "عرض الفصول" : "Viewing your classes",
          body: ar
            ? `<p>من <b>الفصول</b>: قائمة بكل الفصول التي تدرّسها — جماعية وخاصة. لكل فصل: الاسم، البرنامج، عدد الطلاب، الحصة القادمة، الحالة (نشط/معلق/منتهي).</p>`
            : `<p>From <b>Classes</b>: a list of every class you teach — group and private. Each row shows: name, program, student count, next session, status (active/paused/finished).</p>`,
          screenshot: shotPath("teacher", "03-classes"),
        },
        {
          title: ar ? "تفاصيل الفصل وقائمة الطلاب" : "Class details + roster",
          body: ar
            ? `<p>اضغط أي فصل لرؤية: الجدول الكامل، قائمة الطلاب مع صورهم، تاريخ الحصص السابقة، الملخصات الآلية، الواجبات، المستوى الحالي لكل طالب.</p>`
            : `<p>Click any class to see: full schedule, student roster with photos, past session history, AI summaries, assignments, current level per student.</p>`,
        },
        {
          title: ar ? "بدء حصة عبر Zoom" : "Starting a class via Zoom",
          body: ar
            ? `<ol>
              <li>من لوحة التحكم، اضغط <b>دخول الحصة</b></li>
              <li>يفتح Zoom في تبويب — أنت "المضيف"</li>
              <li>الطلاب يدخلون من حساباتهم</li>
              <li>عند الانتهاء، انهِ المكالمة من Zoom</li>
              <li>التسجيل يُرفَع تلقائياً للمنصة</li>
            </ol>`
            : `<ol>
              <li>From the dashboard click <b>Enter Class</b></li>
              <li>Zoom opens in a tab — you are the "host"</li>
              <li>Students join from their own accounts</li>
              <li>When done, end the call from Zoom</li>
              <li>The recording auto-uploads to the platform</li>
            </ol>`,
          warning: ar
            ? "لا تبدأ التسجيل يدوياً — التسجيل التلقائي مفعّل وله إعدادات صحيحة. تسجيلك اليدوي لن يُرفَع للمنصة."
            : "Do not start the recording manually — auto-record is on with the right settings. A manual recording will not upload.",
        },
        {
          title: ar ? "إضافة ملاحظات الحصة" : "Adding class notes",
          body: ar
            ? `<p>بعد الحصة مباشرة:</p>
            <ol>
              <li>افتح الحصة من <b>الفصول</b></li>
              <li>اضغط <b>إضافة ملاحظات</b></li>
              <li>اكتب: ما تم تدريسه، مفردات جديدة، نقاط نحوية، واجب البيت، خطة الحصة القادمة</li>
              <li>احفظ — الذكاء الاصطناعي يحول ملاحظاتك لملخص رسمي تلقائياً</li>
            </ol>`
            : `<ol>
              <li>Open the session from <b>Classes</b></li>
              <li>Click <b>Add Notes</b></li>
              <li>Write: what was covered, new vocabulary, grammar points, homework, plan for next class</li>
              <li>Save — AI turns your notes into a formal summary automatically</li>
            </ol>`,
          tip: ar
            ? "أكتب نقاطاً مختصرة — لا داعي للصياغة الكاملة. الذكاء الاصطناعي يحسّن الصياغة."
            : "Write quick bullets — no need for full prose. The AI polishes the wording.",
        },
        {
          title: ar ? "تسجيل الحضور" : "Marking attendance",
          body: ar
            ? `<p>من صفحة الحصة، اضغط <b>تسجيل الحضور</b>. النظام يقترح حضور كل من دخل Zoom — راجع، صحح، احفظ. الطلاب الغائبون يحصلون على إشعار تلقائي.</p>`
            : `<p>From the session page click <b>Mark Attendance</b>. The system pre-fills attendance from Zoom — review, correct, save. Absent students get an automatic notification.</p>`,
          screenshot: shotPath("teacher", "05-attendance"),
        },
      ],
    },
    {
      number: 4,
      title: ar ? "طلابك" : "Your Students",
      sections: [
        {
          title: ar ? "دليل الطلاب" : "Student directory",
          body: ar
            ? `<p><b>الطلاب</b>: قائمة بكل طلابك عبر كل الفصول. ابحث بالاسم، صفّ، فلتر بمستوى أو حالة.</p>`
            : `<p><b>Students</b>: a list of every student you teach across all classes. Search by name, sort, filter by level or status.</p>`,
          screenshot: shotPath("teacher", "04-students"),
        },
        {
          title: ar ? "ملف الطالب" : "Single student view",
          body: ar
            ? `<p>اضغط طالباً لرؤية: سجله الأكاديمي، تقاريره السابقة، نتائج الامتحانات، المستوى الحالي، ملاحظاتك السابقة عنه، رسائلك المتبادلة.</p>`
            : `<p>Click a student to see: academic record, past reports, exam scores, current level, your prior notes about them, your message history.</p>`,
        },
        {
          title: ar ? "مراسلة طالب" : "Messaging a student",
          body: ar
            ? `<p>من ملفه، اضغط <b>إرسال رسالة</b>. تفتح المحادثة الفورية. الرسائل تظهر فوراً + إشعار بريدي + إشعار جوال.</p>`
            : `<p>From their profile click <b>Send Message</b>. Opens the realtime chat. Messages arrive instantly + email + mobile push.</p>`,
          screenshot: shotPath("teacher", "06-messages"),
        },
        {
          title: ar ? "مراسلة ولي الأمر" : "Messaging a parent",
          body: ar
            ? `<p>من ملف الطالب، تبويب <b>ولي الأمر</b>، اضغط <b>إرسال رسالة</b>. الرسالة منفصلة عن محادثة الطالب — لا تختلط.</p>`
            : `<p>From the student profile, <b>Parent</b> tab, click <b>Send Message</b>. The thread is separate from the student's chat — they don't mix.</p>`,
        },
      ],
    },
    {
      number: 5,
      title: ar ? "الواجبات" : "Assignments",
      sections: [
        {
          title: ar ? "إنشاء غرفة سبورة" : "Creating a blackboard room",
          body: ar
            ? `<ol>
              <li><b>السبورات → + جديد</b></li>
              <li>اسم الغرفة، الفصل المرتبط، الإعدادات (طلاب يكتبون / يقرؤون فقط)</li>
              <li>اضغط <b>إنشاء</b> — يظهر رابط مشاركة</li>
              <li>أرسله للطلاب أو شاركه أثناء الحصة</li>
            </ol>`
            : `<ol>
              <li><b>Blackboards → + New</b></li>
              <li>Room name, linked class, settings (students can write / read-only)</li>
              <li>Click <b>Create</b> — a share link appears</li>
              <li>Send to students or share live during the session</li>
            </ol>`,
          screenshot: shotPath("teacher", "07-blackboards"),
        },
        {
          title: ar ? "مشاركة التمارين" : "Sharing exercises",
          body: ar
            ? `<p>من <b>المعمل</b> اختر تمريناً جاهزاً، اضغط <b>تعيين</b>، اختر الفصل أو الطلاب المحددين. يصلهم إشعار + يظهر في تبويب <b>الواجبات</b> عندهم.</p>`
            : `<p>From <b>Lab</b> pick a ready exercise, click <b>Assign</b>, select the class or specific students. They get a notification + see it in their <b>Assignments</b> tab.</p>`,
        },
        {
          title: ar ? "مراجعة الإجابات" : "Reviewing submissions",
          body: ar
            ? `<p>من الواجب، تبويب <b>الإجابات</b>: قائمة بمن سلّم، النتيجة الآلية، تقدير ملاحظاتك. اضغط أي إجابة لرؤيتها كاملة وإعطاء تعليقك.</p>`
            : `<p>From the assignment, <b>Submissions</b> tab: who submitted, auto-score, space for your feedback. Click any submission to view in full and add a comment.</p>`,
        },
      ],
    },
    {
      number: 6,
      title: ar ? "ملخصات الحصص بالذكاء الاصطناعي" : "AI Lesson Summaries",
      sections: [
        {
          title: ar ? "كيف يعمل الملخص الآلي" : "How the AI summary works",
          body: ar
            ? `<p>عندما تكتب ملاحظاتك بعد الحصة، الذكاء الاصطناعي (Claude) يولّد:</p>
            <ul>
              <li>قائمة مفردات جديدة (مع الترجمة)</li>
              <li>نقاط نحوية</li>
              <li>واجب البيت (واضح للطالب)</li>
              <li>خطة الحصة القادمة (لك)</li>
            </ul>
            <p>الطالب وولي الأمر يريان الملخص ضمن حسابهم.</p>`
            : `<p>When you write notes after a session, the AI (Claude) generates:</p>
            <ul>
              <li>New vocabulary list (with translations)</li>
              <li>Grammar points</li>
              <li>Homework (clear for the student)</li>
              <li>Next-class plan (for you)</li>
            </ul>
            <p>The student and parent see the summary in their account.</p>`,
          screenshot: shotPath("teacher", "08-ai-summary"),
        },
        {
          title: ar ? "تحرير الواجب" : "Editing the homework",
          body: ar
            ? `<p>الملخص الآلي قابل للتحرير. اضغط <b>تحرير</b>، عدل النص، احفظ. الطالب يرى النسخة المحدثة فوراً.</p>`
            : `<p>The AI summary is editable. Click <b>Edit</b>, tweak the text, save. The student sees the updated version instantly.</p>`,
        },
        {
          title: ar ? "تحرير مهامك" : "Editing teacher action items",
          body: ar
            ? `<p>قسم "خطة الحصة القادمة" للمعلم فقط — لا يراه الطالب. يمكنك إضافة تذكيرات شخصية.</p>`
            : `<p>The "Next-class plan" section is for the teacher only — students don't see it. You can add personal reminders.</p>`,
        },
        {
          title: ar ? "إعادة توليد ملخص" : "Regenerating a summary",
          body: ar
            ? `<p>إذا لم يعجبك الملخص، اضغط <b>إعادة التوليد</b>. الذكاء الاصطناعي يحاول مرة أخرى بناءً على نفس الملاحظات.</p>`
            : `<p>If you don't like the summary, click <b>Regenerate</b>. The AI tries again from the same notes.</p>`,
          tip: ar
            ? "أضف ملاحظات أكثر تفصيلاً قبل إعادة التوليد لتحسين النتيجة."
            : "Add more detail to your notes before regenerating to improve the result.",
        },
      ],
    },
    {
      number: 7,
      title: ar ? "جاهزية المعلم" : "Teacher Readiness",
      sections: [
        {
          title: ar ? "قائمة الخمسة" : "The 5-item checklist",
          body: ar
            ? `<ol>
              <li>ملف شخصي مكتمل (سيرة + صورة)</li>
              <li>صورة احترافية (مربعة ≥ 400×400)</li>
              <li>سيرة قصيرة باللغتين</li>
              <li>فيديو تعريفي قصير</li>
              <li>اجتياز حصة تجريبية مع المشرف</li>
            </ol>
            <p>كل عنصر له حالة: مكتمل ✓ أو غير مكتمل ✗.</p>`
            : `<ol>
              <li>Complete profile (bio + photo)</li>
              <li>Professional headshot (square, ≥ 400×400)</li>
              <li>Short bio in both languages</li>
              <li>Short intro video</li>
              <li>Pass a trial class with admin</li>
            </ol>
            <p>Each item is either complete ✓ or pending ✗.</p>`,
          screenshot: shotPath("teacher", "09-readiness"),
        },
        {
          title: ar ? "التقييم الذاتي" : "Self-rating",
          body: ar
            ? `<p>اضغط <b>أعدّ ذاتي للحصة القادمة</b> لتقييم استعدادك على 5 محاور: المحتوى، الأدوات، الاختبارات، الوضوح، الدافعية. هذا للنمو الشخصي فقط — لا يُشارَك مع أحد.</p>`
            : `<p>Click <b>I'm Ready For Next Class</b> to self-rate across 5 axes: content, tools, assessments, clarity, motivation. This is private growth tracking — nobody else sees it.</p>`,
        },
        {
          title: ar ? "الاعتماد + الشارة الذهبية" : "Getting verified",
          body: ar
            ? `<p>عند اكتمال العناصر الخمسة، المشرف يضغط <b>اعتماد</b>. تحصل على شارة ✓ ذهبية ظاهرة في ملفك العام — تزيد ثقة الطلاب.</p>`
            : `<p>When all 5 items clear, the admin clicks <b>Verify</b>. You get a gold ✓ badge visible on your public profile — boosts student trust.</p>`,
        },
      ],
    },
    {
      number: 8,
      title: ar ? "الاجتماعات الشهرية" : "Monthly Meetings",
      sections: [
        {
          title: ar ? "عرض الاجتماعات" : "Viewing your meetings",
          body: ar
            ? `<p><b>الاجتماعات</b>: قائمة بكل اجتماعاتك المجدولة والسابقة. لكل اجتماع: التاريخ، جدول الأعمال، رابط Zoom، حالة حضورك.</p>`
            : `<p><b>Meetings</b>: a list of your scheduled and past meetings. Each shows: date, agenda, Zoom link, your RSVP state.</p>`,
          screenshot: shotPath("teacher", "10-meetings"),
        },
        {
          title: ar ? "تأكيد الحضور (RSVP)" : "RSVP",
          body: ar
            ? `<p>قبل الاجتماع بأسبوع، تصلك دعوة. حدد <b>نعم</b>، <b>لا</b>، أو <b>ربما</b>. حضورك مطلوب — إذا أردت الاعتذار، اضغط <b>لا</b> مع سبب.</p>`
            : `<p>A week before the meeting you get an invitation. Click <b>Yes</b>, <b>No</b>, or <b>Maybe</b>. Attendance is expected — if you must decline, click <b>No</b> with a reason.</p>`,
        },
        {
          title: ar ? "قراءة جدول الأعمال" : "Reading the agenda",
          body: ar
            ? `<p>جدول الأعمال يُنشَر قبل الاجتماع. اقرأه واستعد. إذا كان لديك نقطة تريد إضافتها، أرسلها للمشرف.</p>`
            : `<p>The agenda is posted before the meeting. Read it and come prepared. If you have an item to add, send it to admin.</p>`,
        },
        {
          title: ar ? "المهام الموزعة عليك" : "Action items assigned to you",
          body: ar
            ? `<p>بعد الاجتماع، أي مهمة موكلة لك تظهر في تبويب <b>مهامي</b>. علّمها مكتملة عند الانتهاء.</p>`
            : `<p>After the meeting, any task assigned to you appears in <b>My Tasks</b>. Mark complete when done.</p>`,
        },
      ],
    },
    {
      number: 9,
      title: ar ? "المدفوعات" : "Payments",
      sections: [
        {
          title: ar ? "حاسبة الدفع في ملفك" : "Payment calculator on your profile",
          body: ar
            ? `<p>من <b>ملفي → المدفوعات</b>: حاسبة تعرض عائدك الحالي:</p>
            <ul>
              <li>عدد الحصص هذا الشهر</li>
              <li>إجمالي الساعات</li>
              <li>السعر بالساعة</li>
              <li>إجمالي العائد المتوقع</li>
            </ul>`
            : `<p>From <b>My Profile → Earnings</b>: a calculator shows current earnings:</p>
            <ul>
              <li>Sessions this month</li>
              <li>Total hours</li>
              <li>Hourly rate</li>
              <li>Total expected payout</li>
            </ul>`,
          screenshot: shotPath("teacher", "11-earnings"),
        },
        {
          title: ar ? "حالات العائد" : "Earnings states",
          body: ar
            ? `<ul>
              <li><b>معلقة:</b> الحصة انتهت، تنتظر اعتماد المشرف</li>
              <li><b>معتمدة:</b> اعتُمدت، جاهزة للدفع</li>
              <li><b>مدفوعة:</b> أُرسلت إليك (مع رقم العملية)</li>
            </ul>`
            : `<ul>
              <li><b>Pending:</b> session done, awaiting admin approval</li>
              <li><b>Approved:</b> approved, ready for payout</li>
              <li><b>Paid:</b> sent to you (with transfer reference)</li>
            </ul>`,
        },
        {
          title: ar ? "طلب الدفع" : "Requesting payment",
          body: ar
            ? `<p>عند بلوغ الحد الأدنى (200 ريال)، اضغط <b>طلب دفع</b>. أدخل تفاصيل التحويل (IBAN). الطلب يُسجَّل ويصل للمشرف.</p>`
            : `<p>Once you hit the minimum threshold (SAR 200), click <b>Request Payment</b>. Enter transfer details (IBAN). The request is logged and routed to admin.</p>`,
          screenshot: shotPath("teacher", "12-payment-request"),
        },
        {
          title: ar ? "متابعة حالة الدفع" : "Tracking payment status",
          body: ar
            ? `<p>من <b>طلبات الدفع</b> تشاهد حالة كل طلب: قيد المراجعة، معتمد، مدفوع، مرفوض (مع السبب).</p>`
            : `<p>From <b>Payment Requests</b> watch each request: Under Review, Approved, Paid, Rejected (with reason).</p>`,
        },
      ],
    },
    {
      number: 10,
      title: ar ? "المحادثات" : "Messages",
      sections: [
        {
          title: ar ? "المحادثة الفورية" : "Realtime chat overview",
          body: ar
            ? `<p><code>/messages</code> هي صفحة المحادثة الموحدة. كل المحادثات (مع طلاب، أولياء أمور، مشرفين، زملاء) في مكان واحد. الرسائل فورية.</p>`
            : `<p><code>/messages</code> is the unified chat page. All threads (students, parents, admins, colleagues) in one place. Messages are instant.</p>`,
        },
        {
          title: ar ? "المرفقات" : "Attachments",
          body: ar
            ? `<p>اضغط رمز المشبك لإرفاق ملف (PDF، صورة، صوت). الحد الأقصى 10 ميجابايت. تصل فوراً.</p>`
            : `<p>Click the paperclip to attach a file (PDF, image, audio). Max 10 MB. Delivers instantly.</p>`,
        },
        {
          title: ar ? "تأكيد القراءة" : "Read receipts",
          body: ar
            ? `<p>علامة ✓ مفردة = أُرسِلت. ✓✓ = وصلت. ✓✓ زرقاء = قرأها.</p>`
            : `<p>Single ✓ = sent. Double ✓ = delivered. Blue ✓✓ = read.</p>`,
        },
      ],
    },
    {
      number: 11,
      title: ar ? "التذاكر (طلب المساعدة)" : "Tickets",
      sections: [
        {
          title: ar ? "متى تُنشئ تذكرة" : "When to create a ticket",
          body: ar
            ? `<ul>
              <li>مشكلة فنية (Zoom لا يعمل، الموقع بطيء…)</li>
              <li>مشكلة دفع (سعر خاطئ، حصة لم تُحتسَب…)</li>
              <li>مشكلة طالب (شكوى، سلوك غير لائق)</li>
              <li>سؤال إداري (إجازة، تغيير جدول)</li>
            </ul>`
            : `<ul>
              <li>Technical issue (Zoom not working, site slow…)</li>
              <li>Payment issue (wrong rate, session not counted…)</li>
              <li>Student issue (complaint, inappropriate behavior)</li>
              <li>Admin question (leave, schedule change)</li>
            </ul>`,
          screenshot: shotPath("teacher", "13-tickets"),
        },
        {
          title: ar ? "تصنيفات التذاكر" : "Ticket categories",
          body: ar
            ? `<p>اختر التصنيف الأنسب — يساعد على توجيه التذكرة للموظف المناسب.</p>`
            : `<p>Pick the most relevant category — helps route your ticket to the right staff member.</p>`,
        },
        {
          title: ar ? "المتابعة" : "Following up",
          body: ar
            ? `<p>كل رد يصلك بالبريد + يظهر في التذكرة. لا حاجة لإنشاء تذاكر متعددة لنفس المشكلة.</p>`
            : `<p>Every reply arrives by email + shows in the ticket. No need to open multiple tickets for the same issue.</p>`,
        },
      ],
    },
    {
      number: 12,
      title: ar ? "التقييمات" : "Ratings",
      sections: [
        {
          title: ar ? "تقييم ملفك العام" : "Your public profile rating",
          body: ar
            ? `<p>متوسط تقييمك يظهر علناً في ملفك. الطلاب المحتملون يرونه قبل الحجز.</p>`
            : `<p>Your average rating shows publicly on your profile. Prospective students see it before booking.</p>`,
        },
        {
          title: ar ? "من أين تأتي التقييمات" : "Where ratings come from",
          body: ar
            ? `<p>بعد كل حصة، الطالب يقيّمك من 1 إلى 5 نجوم + تعليق اختياري. التقييمات مجهولة بالنسبة لك (لا تعرف من ترك أي تقييم).</p>`
            : `<p>After every session students rate you 1-5 stars + optional comment. Ratings are anonymous to you (you don't know who left which).</p>`,
        },
        {
          title: ar ? "الرد باحتراف" : "Responding professionally",
          body: ar
            ? `<p>التقييمات السلبية فرصة للتحسين. اقرأها بهدوء، لا ترد علناً، ناقشها مع المشرف في الاجتماع الشهري إذا كانت متكررة.</p>`
            : `<p>Negative ratings are growth opportunities. Read calmly, don't reply publicly, raise with admin in the monthly meeting if a pattern repeats.</p>`,
        },
      ],
    },
    {
      number: 13,
      title: ar ? "التقويم" : "Calendar",
      sections: [
        {
          title: ar ? "تقويمك الموحد" : "Your unified calendar",
          body: ar
            ? `<p><b>التقويم</b> يجمع: كل حصصك، الاجتماعات، فعاليات نادي المحادثة، الإجازات الرسمية. عرض شهري، أسبوعي، يومي.</p>`
            : `<p>The <b>Calendar</b> consolidates: all your classes, meetings, speaking-club events, official holidays. Views: month, week, day.</p>`,
          screenshot: shotPath("teacher", "15-calendar"),
        },
        {
          title: ar ? "إضافة فعاليات شخصية" : "Adding personal events",
          body: ar
            ? `<p>اضغط أي خانة، أضف فعالية شخصية (لا يراها أحد غيرك). مفيد لتذكير نفسك بمهام تحضير الحصة.</p>`
            : `<p>Click any slot to add a personal event (private — nobody else sees). Useful for prep reminders.</p>`,
        },
        {
          title: ar ? "قراءة الفعاليات" : "Reading events",
          body: ar
            ? `<p>الألوان:</p>
            <ul>
              <li>أزرق: حصة</li>
              <li>وردي: اجتماع</li>
              <li>نعناعي: نادي محادثة</li>
              <li>رمادي: إجازة</li>
              <li>كحلي: فعالية شخصية</li>
            </ul>`
            : `<p>Colors:</p>
            <ul>
              <li>Blue: class</li>
              <li>Rose: meeting</li>
              <li>Mint: speaking club</li>
              <li>Gray: holiday</li>
              <li>Navy: personal event</li>
            </ul>`,
        },
      ],
    },
  ];
}

function teacherAppendix(lang: Lang): ManualAppendix[] {
  const ar = lang === "ar";
  return [
    {
      title: ar ? "ملحق — أفضل الممارسات" : "Appendix — Best Practices",
      body: ar
        ? `<ul>
          <li><b>كن في الوقت دائماً</b> — ادخل قبل الحصة بـ 5 دقائق</li>
          <li><b>اكتب ملاحظات بعد كل حصة</b> — الذكاء الاصطناعي يحول 30 ثانية من كتابتك إلى ملخص كامل للطالب</li>
          <li><b>رد على الرسائل خلال 24 ساعة</b> — مؤشر يُرصد في نشاط المعلمين</li>
          <li><b>استخدم الملخص الآلي</b> — لا تكتب من الصفر، حرّر فقط</li>
          <li><b>احضر الاجتماعات الشهرية</b> — هذا التزام مهني</li>
          <li><b>تعامل مع التقييمات السلبية بنضج</b> — اقرأ، تأمل، حسّن</li>
          <li><b>أبلغ عن المشاكل مبكراً</b> — التذاكر أفضل من الانتظار</li>
        </ul>`
        : `<ul>
          <li><b>Be on time every time</b> — enter 5 minutes early</li>
          <li><b>Write notes after every session</b> — the AI turns 30 seconds of your bullets into a full summary for the student</li>
          <li><b>Respond to messages within 24 hours</b> — tracked in teacher activity</li>
          <li><b>Use the AI summary</b> — don't write from scratch, just edit</li>
          <li><b>Attend monthly meetings</b> — it's a professional commitment</li>
          <li><b>Handle negative ratings maturely</b> — read, reflect, improve</li>
          <li><b>Report problems early</b> — tickets beat waiting</li>
        </ul>`,
    },
  ];
}

export function buildTeacherManual(lang: Lang): string {
  const ar = lang === "ar";
  const chapters = teacherChapters(lang);
  const doc: ManualDoc = {
    role: "teacher",
    lang,
    cover: {
      eyebrow: ar ? "كُتيّب المعلم" : "TEACHER MANUAL",
      title: ar ? "دليل المعلم" : "Teacher Manual",
      subtitle: ar
        ? "كل ما يحتاجه المعلم للنجاح في هجر A°"
        : "Everything a teacher needs to succeed at HAJR A°",
      version: ar ? "الإصدار 2.0" : "Version 2.0",
    },
    toc: [
      ...chapters.map((c) => ({
        num: `${c.number}.`,
        title: c.title,
        page: c.number + 2,
      })),
      { num: ar ? "أ." : "A.", title: ar ? "أفضل الممارسات" : "Best Practices", page: chapters.length + 3 },
    ],
    chapters,
    appendix: teacherAppendix(lang),
  };
  return renderManualHtml(doc);
}
