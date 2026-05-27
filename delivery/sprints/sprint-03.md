# Sprint 3 — Client Demo Script
## السبرنت الثالث — عرض للعميل

**Read time: ~5 minutes.** Open the production site in a phone-sized window
before you start (375 px wide).

**مدة القراءة: ٥ دقائق.** افتح الموقع الإنتاجي على عرض الجوال (٣٧٥ بكسل) قبل البدء.

> **Sprint goal**: replace WhatsApp chaos with structured operations. Every
> class, every meeting, every complaint, every rating — now in-platform,
> all auditable, all measurable.
>
> **هدف السبرنت**: استبدال فوضى الواتساب بعمليات منظَّمة. كل حصة وكل اجتماع
> وكل شكوى وكل تقييم — كلّها داخل المنصّة، قابلة للتدقيق والقياس.

---

### 1. نظام تذاكر دعم مع فرز تلقائي بالذكاء الاصطناعي
### Support ticket system with AI auto-triage

  > AR: "أي مستخدم — طالب، ولي أمر، معلم، مسوّق — يدخل على `/tickets/new`،
  > يكتب موضوعاً وتفاصيل، والنظام يستدعي Claude Haiku تلقائياً ليصنّفها (تقنية،
  > مالية، تعليمية، اقتراح، عامة) ويحدّد أولويتها (منخفضة → عاجلة). إذا فشل
  > الذكاء الاصطناعي، يتم الرجوع إلى مصنّف كلمات مفتاحية يدعم العربية والإنجليزية."
  >
  > EN: "Any user — student, parent, teacher, marketer — opens `/tickets/new`,
  > writes a subject + body, and the system calls Claude Haiku to categorize
  > it (Technical, Financial, Pedagogical, Suggestion, General) and assign
  > priority. If the AI fails, a bilingual keyword regex fallback kicks in."

---

### 2. لوحة كانبان للإدارة + ردود فورية لحظية + ملاحظات داخلية
### Admin kanban + real-time replies + internal notes

  > AR: "صفحة `/admin/tickets` تعرض كل التذاكر في ٤ أعمدة: مفتوحة، قيد المعالجة،
  > تم حلها، مغلقة. يمكن سحب التذكرة لتغيير حالتها فوراً. كل رد يُبثّ عبر
  > Supabase Realtime ويصل للطرف الآخر بدون refresh. الإدارة تستطيع كتابة
  > ملاحظات داخلية لا يراها العميل."
  >
  > EN: "`/admin/tickets` shows every ticket in 4 columns. Drag-and-drop to
  > move status. Each reply broadcasts via Supabase Realtime so the other
  > side sees it without refreshing. Admins can write internal notes that
  > the requester never sees."

---

### 3. صفحات معلّمين عامة بنمط Preply
### Public teacher profile pages (Preply-style)

  > AR: "كل معلّم يحصل على صفحة عامة `/teachers/{slug}` فيها: سيرته، فيديو
  > تعريفي (YouTube/Vimeo)، اللغات، سنوات الخبرة، التخصصات، متوسط التقييم،
  > آخر ١٠ آراء طلاب، وزر «احجز تجربة مجانية». الصفحة بدون تسجيل دخول
  > ومُفهرسة في Google."
  >
  > EN: "Every teacher gets a public `/teachers/{slug}` page: bio, intro
  > video, languages, years of experience, specializations, average rating,
  > last 10 student reviews, and a `Book free trial` CTA. Public, no login,
  > Google-indexable."

---

### 4. شارة معلم معتمد (ذهبية) — لا نقاط، لا ألعاب
### Verified teacher badge (gold) — no points, no gamification

  > AR: "المعلم يفتح `/teacher/readiness`، يضع علامة على ٥ بنود: زوم تم
  > اختباره، أدوات رقمية، حصة تجريبية، أدوات تفاعلية، إدارة الفصل. يعطي
  > نفسه تقييماً من ١ إلى ٥. الإدارة تراجع من `/admin/teachers/{id}/readiness`
  > وتعتمد التذكرة. الشارة الذهبية ✓ تظهر فوراً في صفحته العامة."
  >
  > EN: "Teacher opens `/teacher/readiness`, ticks 5 items: Zoom tested,
  > digital tools, mock class, interactive tools, classroom management.
  > Self-rates 1-5. Admin reviews at `/admin/teachers/{id}/readiness` and
  > verifies. Gold ✓ badge appears instantly on the public profile."

---

### 5. اجتماعات المعلمين الشهرية مع أجندة ومحضر وبنود عمل
### Monthly teacher meetings: agenda + minutes + action items

  > AR: "من `/admin/teacher-meetings` تنشئ اجتماعاً بعنوان عربي/إنجليزي،
  > موعد، أجندة، رابط Zoom، واختيار المعلمين الحاضرين. يُولَّد CalendarEvent
  > تلقائياً ويصل الإشعار لكل معلم. المعلم يدخل `/teacher/meetings/{id}`
  > يردّ على الدعوة (نعم/لا/ربما)، ينضم عبر Zoom، يقرأ المحضر، ويرى بنود
  > العمل المسندة له."
  >
  > EN: "From `/admin/teacher-meetings` you create a meeting with AR+EN
  > title, datetime, agenda, Zoom link, and attendees. A CalendarEvent is
  > auto-generated and each teacher is notified. Teacher opens
  > `/teacher/meetings/{id}` to RSVP (Yes/No/Maybe), join Zoom, read
  > minutes, and see assigned action items."

---

### 6. لوحة نشاط المعلمين — محمية بنظام حماية البيانات (PDPL)
### Teacher activity dashboard — PDPL-safe (no page tracking)

  > AR: "صفحة `/admin/teacher-activity` تعرض لكل معلم: حالته، آخر دخول،
  > عدد الحصص آخر ٧ و٣٠ يوماً، نسبة الالتزام (بدأ الحصة خلال ٥ دقائق)،
  > متوسط التقييم، متوسط زمن الرد على الرسائل، عدد الفصول النشطة. **لا
  > نتتبع تنقّلك بين الصفحات** — نظهر فقط نتائج عمل المعلم."
  >
  > EN: "`/admin/teacher-activity` shows each teacher: status, last login,
  > sessions in last 7 / 30 days, on-time % (started within 5 min of
  > scheduled), avg rating, message response time, active classes count.
  > **We do not track navigation between pages** — only outcomes."

---

### 7. تقييم المعلم من ١ إلى ٥ نجوم بعد كل حصة مكتملة
### 5-star teacher rating after every completed session

  > AR: "بعد حصة `COMPLETED`، يظهر للطالب أو ولي الأمر زرّ «قيّم المعلم».
  > يختار ١ إلى ٥ نجوم وتعليقاً اختيارياً. لا يمكن تكرار التقييم لنفس الحصة.
  > متوسط التقييم يحدَّث تلقائياً ويظهر في صفحة المعلم العامة."
  >
  > EN: "After a `COMPLETED` session, the student or parent sees a `Rate
  > teacher` prompt. Picks 1-5 stars + optional comment. Cannot re-rate
  > the same session (unique constraint). Average updates instantly and
  > appears on the public teacher profile."

---

### 8. التقويم الموحَّد يربط كل شيء تلقائياً
### Universal calendar auto-syncs everything

  > AR: "كل ClassSession جديدة تُنشئ تلقائياً CalendarEvent مرئياً للمعلم
  > والطلاب وأولياء الأمور. الاجتماعات الشهرية تظهر للمعلمين المدعوّين فقط.
  > نُفِّذت عملية backfill لكل الحصص المستقبلية الموجودة. مصدر واحد للحقيقة:
  > `/calendar`."
  >
  > EN: "Every new ClassSession auto-creates a CalendarEvent visible to
  > teacher + students + parents. Monthly meetings appear only on invited
  > teachers' calendars. Backfill ran for all existing future sessions.
  > One source of truth: `/calendar`."

---

## بعد هذا السبرنت / After this sprint

✅ لا شيء مهم يحدث في الواتساب بعد الآن. كل عملية موثّقة، قابلة للتدقيق، قابلة للقياس.

✅ Nothing important happens in WhatsApp anymore. Everything is auditable,
trackable, and measurable.

التالي (Sprint 4–5): تقارير الأداء التنفيذية، أدوات الترويج الآلي، و ROI dashboards.
