# Sprint 4 — Client Demo Script
## السبرنت الرابع — عرض للعميل

**Read time: ~5 minutes.** Open the production site in a phone-sized window
before you start (375 px wide).

**مدة القراءة: ٥ دقائق.** افتح الموقع الإنتاجي على عرض الجوال (٣٧٥ بكسل) قبل البدء.

> **Sprint goal**: build the moat. Parents brag in WhatsApp groups, students
> collect QR-verified certificates, teachers get paid with one tap. This is
> the sprint where retention compounds.
>
> **هدف السبرنت**: بناء الميزة التنافسية. أولياء الأمور يتباهون في مجموعات الواتساب،
> الطلاب يجمعون شهادات موثّقة برمز QR، المعلمون يقبضون مستحقاتهم بنقرة واحدة.
> هذا السبرنت الذي يبني ولاء العميل.

---

### 1. تقارير شهرية تلقائية لولي الأمر (PDF + صورة واتساب)
### Auto monthly parent reports (PDF + WhatsApp share image)

  > AR: "في الساعة ٨ صباحاً من اليوم الأول من كل شهر، يُنشئ النظام تلقائياً
  > تقريراً شاملاً لكل طالب: نسبة الحضور، الدروس المكتملة، الواجبات، ملاحظات
  > المعلم، تطور المستوى (CEFR قبل ← بعد)، حالة الدفع، و٤ من آخر التسجيلات.
  > يُحفظ كملف PDF ويُرسَل بريدياً مع إشعار داخل التطبيق."
  >
  > EN: "At 08:00 KSA on the 1st of every month, the system auto-generates
  > a comprehensive report per student: attendance %, lessons completed,
  > homework, teacher notes, CEFR level progression (before → after), payment
  > status, and the 4 most recent recordings. Saved as PDF and emailed
  > to the linked parent with in-app notification."

---

### 2. صورة المشاركة الجاهزة للواتساب (1200×630)
### WhatsApp-ready share image (1200×630)

  > AR: "بجانب تقرير الـ PDF، يُولّد النظام صورة ١٢٠٠×٦٣٠ مُهيّأة للمشاركة
  > في واتساب: شعار هجر، اسم الطالب، الشهر، ٣ مربعات إحصاءات (الحضور، الدروس،
  > المستوى). ولي الأمر يضغط ٌشارك في واتساب' فيخرج المنشور جاهزاً — تسويق
  > مجاني من العميل نفسه."
  >
  > EN: "Alongside the PDF, the system produces a 1200×630 social-ready
  > image with HAJR branding, student name, month, and 3 stat tiles
  > (attendance, lessons, level). One-tap WhatsApp share — free organic
  > marketing from the parent themselves."

---

### 3. نادي المحادثة — جلسات أسبوعية بحجز فوري
### Speaking Club — weekly live conversation sessions

  > AR: "صفحة `/student/speaking-club` تعرض جلسات قادمة، حجوزاتي، والسابقة.
  > الطالب يضغط ٌاحجز' فيُسجَّل في الجلسة، يُضاف الحدث لتقويمه تلقائياً،
  > ويتلقى تذكيراً قبل ٢٤ ساعة (بريد) وقبل ساعة (SMS). عند بدء الجلسة، يظهر
  > شارة ٌمباشر الآن' مع رابط Zoom للدخول الفوري."
  >
  > EN: "`/student/speaking-club` shows upcoming, my RSVPs, and past events.
  > One-tap RSVP auto-adds the event to the student's calendar and triggers
  > a 24h email + 1h SMS reminder. At session time, a pulsing 'Live now'
  > badge + 'Join now' button surfaces with the Zoom link."

---

### 4. لوحة إدارة نادي المحادثة + تسجيل الحضور
### Admin Speaking Club + attendance grid

  > AR: "الإدارة تنشئ فعاليات جديدة بسرعة (عناوين بالعربي/الإنجليزي، الوقت،
  > الحد الأقصى، الحد الأدنى للمستوى، اختيار المعلم المضيف، رابط Zoom).
  > يُنشَأ تلقائياً حدث تقويم عالمي لكل الطلاب. بعد الجلسة، تظهر شبكة لتسجيل
  > الحضور لكل طالب حجز."
  >
  > EN: "Admin creates events in seconds (bilingual titles, time, max,
  > min CEFR level, host teacher picker, Zoom URL). System auto-creates
  > a global student calendar event. After the session, an attendance
  > grid lets admin mark each RSVP."

---

### 5. شهادات موثّقة برمز QR (بشكل وثائق حكومية)
### QR-verified certificates (government-style design)

  > AR: "الإدارة تصدر شهادات لإتمام مستوى، دورة، تحديد مستوى، حضور، أو نادي
  > محادثة. التصميم يحاكي الوثائق الرسمية: حدود مزخرفة، اسم الطالب بخط
  > كاليجرافي، تواقيع المدير والمعلم، ورمز QR في الزاوية يقود لصفحة تحقق
  > عمومية. كل شهادة لها رمز تحقق فريد قابل للنشر."
  >
  > EN: "Admin issues certificates for level completion, course, placement,
  > attendance, or speaking club. The design mimics official documents:
  > ornate border, calligraphic student name, director + teacher signatures,
  > and a QR code in the corner linking to a public verification page.
  > Every certificate has a unique verifiable code."

---

### 6. صفحة تحقق عمومية بدون تسجيل دخول
### Public verification page — no auth required

  > AR: "أي شخص يمسح رمز QR على الشهادة يصل إلى `/verify/{رمز-التحقق}`،
  > صفحة تعرض ✓ ٌشهادة موثّقة' أو ✗ ٌمسحوبة' مع كل تفاصيل الشهادة. ربّ
  > عمل يتأكد من صحة شهادة مرشَّح ببساطة. ميزة لا يقدمها المنافسون."
  >
  > EN: "Anyone scans the QR and lands on `/verify/{verification-code}`,
  > a clean public page showing ✓ 'Verified Certificate' or ✗ 'Revoked'
  > with the full certificate details. Employers verify a candidate's
  > qualification in seconds — a feature competitors don't offer."

---

### 7. طلبات صرف المستحقات للمعلم/المسوّق
### Teacher/marketer payment requests

  > AR: "في `/teacher/payment-requests` و `/marketer/payment-requests`،
  > كل مستخدم يرى رصيده المتاح (مبني على الأرباح المعتمدة غير المدفوعة)،
  > ويُقدّم طلب صرف مع المبلغ والفترة. التحقق التلقائي يمنع طلب مبلغ
  > أكبر من المتاح. الإدارة تتلقى الطلب مباشرة."
  >
  > EN: "At `/teacher/payment-requests` and `/marketer/payment-requests`,
  > each user sees their available balance (computed from APPROVED-unpaid
  > TeacherEarning or Commission rows), and submits a request with amount
  > and period. Auto-validation prevents over-requesting. Admin gets
  > notified immediately."

---

### 8. تدفّق إقرار الإدارة + ربط الأرباح تلقائياً
### Admin approval flow + auto-cascade to earnings

  > AR: "صفحة `/admin/payment-requests` تجمع الطلبات حسب الحالة. الإدارة:
  > توافق → تنشأ تذكيرة تقويم 'دفع مستحق'. تضع ٌمدفوع' مع طريقة الدفع والمرجع
  > → كل صفوف TeacherEarning أو Commission ضمن الفترة تُعلَّم تلقائياً
  > كمدفوعة. لا حساب يدوي، لا ازدواجية."
  >
  > EN: "`/admin/payment-requests` groups by status. Admin: Approve →
  > a 'Payment Due' calendar event is created. Mark Paid with method +
  > reference → every TeacherEarning or Commission row in that period
  > is auto-marked PAID. No manual reconciliation, no double-counting."

---

## التحقق السريع · Quick verification

  > AR: "للاختبار: في `/admin/students/[id]` اضغط ٌإنشاء تقرير الآن' لشهر
  > سابق وتحقّق من وصول البريد. أنشئ فعالية في نادي محادثة، احجز كطالب،
  > وأكد ظهورها في `/calendar`. أصدر شهادة، وامسح QR للوصول لصفحة التحقق
  > العمومية. قدّم طلب دفع كمعلم، ووافق عليه كأدمن، وتأكد من تحديث الأرباح."
  >
  > EN: "Smoke: hit `/api/cron/monthly-reports` manually for a previous
  > month and verify the parent received the PDF. Create a Speaking Club
  > event, RSVP as a student, confirm it appears in `/calendar`. Issue a
  > certificate, scan the QR, land on the verify page. Submit a payment
  > request as a teacher, approve as admin, mark paid, and verify
  > underlying TeacherEarning rows flipped to PAID."

---

## What's deferred to Sprint 5

  - Beautiful image rendering (vs. HTML-based share images today)
  - Multi-currency support on payment requests
  - Drag-and-drop attendance for Speaking Club (currently checkbox grid)
  - Certificate bulk-issue for level completion cohorts

## ما تم تأجيله إلى السبرنت الخامس

  - عرض الصور بشكل أجمل (بدلاً من HTML)
  - دعم عملات متعددة في طلبات الدفع
  - سحب وإفلات لتسجيل حضور النادي
  - إصدار جماعي للشهادات لدفعة كاملة
