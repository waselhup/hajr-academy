# Sprint 1 — Client Demo Script
## السبرنت الأول — عرض للعميل

**Read time: ~5 minutes.** Open the production site in a phone-sized window
before you start (375 px wide).

**مدة القراءة: ٥ دقائق.** افتح الموقع الإنتاجي على عرض الجوال (375 بكسل) قبل البدء.

---

### 1. تقويم موحّد + ٨ إجازات سعودية مُحمّلة مسبقاً
### Unified calendar + 8 Saudi holidays pre-loaded

  > AR: "أضفنا تقويماً موحّداً يجمع الحصص والاجتماعات والإجازات في صفحة واحدة على `/calendar`، مع ٨ إجازات سعودية رسمية لعامي 2026 و2027 جاهزة من اليوم الأول."
  >
  > EN: "We added one unified calendar at `/calendar` that brings classes, meetings, and holidays into a single page — pre-seeded with 8 Saudi national holidays for 2026 and 2027."

---

### 2. أنبوب تنبيهات موحّد بـ ٤ قنوات
### Universal 4-channel notification pipe

  > AR: "أصبح إرسال أي إشعار للمستخدم سطراً واحداً من الكود — داخل التطبيق، بريد إلكتروني، رسالة نصية، وبث مباشر — مع عزل لكل قناة بحيث لا يُعطّل فشل قناة واحدة الباقي."
  >
  > EN: "Sending any user notification is now a single line of code — in-app, email, SMS, and live realtime — with each channel isolated so one failure never blocks the others."

---

### 3. تذكير الحصص قبل ٢٤ ساعة و ١ ساعة (تلقائي)
### Class reminders 24h + 1h in advance (automatic)

  > AR: "كل ٥ دقائق يفحص النظام الحصص القادمة ويُرسل تنبيه قبل ٢٤ ساعة (داخل التطبيق + بريد) وآخر قبل ساعة (داخل التطبيق + رسالة نصية) — للطالب وولي الأمر والمعلم."
  >
  > EN: "Every 5 minutes the system scans upcoming classes and pushes a 24-hour reminder (in-app + email) and a 1-hour reminder (in-app + SMS) — to the student, parent, and teacher."

---

### 4. شريط تنقّل سفلي للجوال على كل صفحة
### Mobile bottom-nav bar on every authenticated page

  > AR: "كل صفحة محمية أصبح لها شريط تنقّل سفلي بأربعة أزرار (الرئيسية / جدولي / رسائلي / ملفي) يتغيّر حسب دور المستخدم، مع شارة الرسائل غير المقروءة."
  >
  > EN: "Every authenticated page now has a 4-button bottom nav (Home / Calendar / Messages / Profile) that adapts to the user's role, including an unread-messages badge."

---

### 5. صفحة هبوط محسّنة + شريط إعلانات قابل للإخفاء
### Upgraded landing + dismissable announcement bar

  > AR: "زرّ التسجيل وزرّ تسجيل الدخول أصبحا ظاهرَين دائماً على كل المقاسات، وأضفنا شريط إعلان أعلى الصفحة قابل للإخفاء (نتذكّر اختيار الزائر)."
  >
  > EN: "Sign-in and Register CTAs are now visible at every screen size, and a dismissable announcement bar sits at the top of the page (the visitor's choice is remembered)."

---

### 6. ٦ شهادات حقيقية بنجوم تقييم + شارة توثيق + زر واتساب عائم
### 6 testimonials with star ratings + verification badge + floating WhatsApp button

  > AR: "بدلاً من ٣ شهادات باهتة، الآن ٦ بطاقات بنجوم تقييم وصور رمزية متدرّجة، وشارة "موثقة من طلاب حقيقيين"، وزر واتساب عائم في الزاوية يفتح محادثة مع الأكاديمية مباشرة."
  >
  > EN: "Replaced 3 plain quotes with 6 cards featuring star ratings, gradient avatars, a 'Verified by real students' badge, and a floating WhatsApp button in the corner that opens a chat with the Academy directly."

---

### 7. صفحات السياسات الثلاث (دفع، استرداد، خصوصية) ثنائية اللغة
### Three bilingual policy pages (payment, refund, privacy)

  > AR: "`/policies/payment` و`/policies/refund` و`/policies/privacy` — كل واحدة ثنائية اللغة بنصّ متوافق مع ZATCA وPDPL، ومربوطة من تذييل الصفحة."
  >
  > EN: "`/policies/payment`, `/refund`, and `/privacy` — each bilingual with copy aligned to ZATCA and PDPL requirements, all linked from the footer."

---

### 8. تنسيق تواريخ صحيح + دور "مسوّق" جاهز للسبرنت الثاني
### Correct date formatting + MARKETER role pre-wired for Sprint 2

  > AR: "حلّ مشكلة "22 مايو 2023 م" التي رصدها الأستاذ — كل التواريخ الآن ميلادية واضحة بدون لاحقة هـ. وأضفنا دور "مسوّق" في قاعدة البيانات جاهزاً لتفعيل لوحته في السبرنت الثاني."
  >
  > EN: "Fixed the '22 May 2023 م' issue the teacher flagged — all dates now use a clean Gregorian format with no Hijri suffix. We also pre-wired the MARKETER role in the database so its dashboard ships in Sprint 2 without a migration."

---

## What we actually shipped (under the hood)
## ما تم تسليمه فعلياً (تحت الغطاء)

  - 1 schema migration (idempotent, applied live)
  - 9 new files in `src/lib` + `src/components` + 3 new API routes
  - 50 new bilingual strings (AR = EN = 1,292 keys, exact parity)
  - 1 new Vercel cron schedule
  - 3 delivery docs (README, Runbook, this script)
  - 0 build errors, all smoke tests pass

## Production status
## الحالة الإنتاجية

  - Live URL: https://hajr-academy.vercel.app
  - Latest commit: `02d0669` deployed to Vercel production
  - DB: 9 calendar events (8 holidays + 1 demo meeting), audit log + notification fan-out verified

---

**Next: Sprint 2 — Marketers + Placement Test.**
