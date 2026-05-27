# Sprint 2 — Client Demo Script
## السبرنت الثاني — عرض للعميل

**Read time: ~5 minutes.** Open the production site in a phone-sized window
before you start (375 px wide).

**مدة القراءة: ٥ دقائق.** افتح الموقع الإنتاجي على عرض الجوال (375 بكسل) قبل البدء.

---

### 1. نظام مسوّقين كامل مع تتبّع العمولات تلقائياً
### Full marketer system with automatic commission tracking

  > AR: "أي شخص يقدر يقدّم طلب مسوّق من `/marketer/apply` — بعد موافقتك، يحصل على كود إحالة فريد ولوحة تحكم. كل ما يُحوِّل طالباً ويدفع أول فاتورة، تُسجَّل عمولته تلقائياً في انتظار اعتمادك."
  >
  > EN: "Anyone can apply at `/marketer/apply`. Once you approve them, they get a unique referral code and dashboard. Whenever they convert a student who pays their first invoice, a commission is automatically created — pending your approval."

---

### 2. اختبار تحديد مستوى عام للزوار بدون تسجيل
### Public placement test (no signup required)

  > AR: "أي زائر يدخل `/placement-test`، يدخل اسمه وبريده، ويأخذ اختباراً من ٤ أقسام: قراءة، قواعد، مفردات، استماع. النظام يصحّح تلقائياً ويعطيه مستواه على مقياس CEFR."
  >
  > EN: "Any visitor opens `/placement-test`, enters name + email, takes a 4-section test (reading, grammar, vocab, listening). The system auto-scores and returns their CEFR level."

---

### 3. تقرير PDF تلقائي بمستوى CEFR + برامج مقترحة
### Auto PDF report with CEFR level + recommendations

  > AR: "بعد الاختبار يحصل الزائر فوراً على تقرير PDF بتفاصيل النتيجة، مستواه (A1 إلى C2)، تفصيل الأقسام، وحتى ٣ برامج مقترحة مع سبب التوصية — يصله بالبريد ويُحفظ في حسابه."
  >
  > EN: "Right after submission the visitor gets a PDF report: score detail, CEFR level (A1–C2), per-section breakdown, and up to 3 recommended programs with reasoning — emailed to them and saved to their account."

---

### 4. ٣ متغيرات للاختبار: عام، ستيب، آيلتس
### 3 test variants: General, STEP, IELTS

  > AR: "ثلاثة اختبارات منفصلة جاهزة من اليوم: اختبار عام (٣٠ دقيقة)، تحضير ستيب (٤٥ دقيقة) وأطول، تحضير آيلتس (٥٠ دقيقة) بنمط أكاديمي. التوصيات تتغيّر حسب نوع الاختبار."
  >
  > EN: "Three separate tests ready today: General (30 min), STEP Prep (45 min, longer/harder), IELTS Prep (50 min, academic style). Recommendations adapt to which test the user took."

---

### 5. توليد عملاء محتملين تلقائياً للمالك
### Auto lead-creation in your admin inbox

  > AR: "كل زائر يكمل اختبار تحديد مستوى يصبح طلباً محتملاً (lead) في `/admin/placement-tests/leads` تلقائياً — مع ملخص النتيجة والبرنامج المقترح، جاهز للتواصل."
  >
  > EN: "Every guest who completes a placement test becomes a lead automatically at `/admin/placement-tests/leads` — with result summary and recommended package, ready to follow up."

---

### 6. باقتان جديدتان: STEP + IELTS (الأسعار قابلة للتعديل)
### Two new packages: STEP + IELTS (editable pricing)

  > AR: "أضفنا باقتي تحضير: STEP_PREP_PKG (٦٠٠ ريال/شهر مقترح) و IELTS_PREP_PKG (٨٠٠ ريال/شهر مقترح). الأسعار قابلة للتعديل من إدارة الباقات."
  >
  > EN: "We added two prep packages: STEP_PREP_PKG (placeholder 600 SAR/mo) and IELTS_PREP_PKG (placeholder 800 SAR/mo). Pricing is editable in the admin package settings."

---

### 7. ربط الزائر بحسابه عند التسجيل لاحقاً
### Guest-to-student bridge on signup

  > AR: "لو زائر أخذ اختبار اليوم وسجّل بعد أسبوع بنفس البريد، النظام تلقائياً يربط نتيجة الاختبار بحسابه — ما يحتاج يعيدها."
  >
  > EN: "If a guest takes the test today and signs up next week with the same email, the system automatically links the prior result to their new account — no retake needed."

---

### 8. كل عمولة في انتظار موافقة المالك — تحكّم كامل
### Every commission waits for your approval — full control

  > AR: "ولا قرش يُصرف بدون موافقتك. كل عمولة تمرّ بأربع حالات: قيد الانتظار، معتمدة، مدفوعة، مرفوضة. تقدر تعتمد جماعياً أو فردياً، وكل قرار يُسجَّل في سجل التدقيق."
  >
  > EN: "Not a single SAR moves without your approval. Each commission flows through four states: Pending → Approved → Paid (or Rejected). You can approve in bulk or one-by-one — every decision is audit-logged."

---

## What ships next sprint / ما يأتي السبرنت القادم

- محرر أسئلة اختبار تحديد المستوى الكامل (admin يقدر يضيف/يحرر أسئلة بدون كود).
- لوحة تحليلات للمسوّقين أعلى أداءً + هيكل عمولات متعدد المستويات.
- نظام كوبونات/خصم آلي مرتبط بكود الإحالة (Sprint 4).
