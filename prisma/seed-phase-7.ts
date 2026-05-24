/**
 * Phase 7 seed — email templates.
 *
 * Seeds 15 bilingual transactional/system templates. The stored `bodyAr`
 * / `bodyEn` are the INNER HTML only — the dispatcher wraps each in the
 * branded shell (navy header, ivory body, footer) via `wrapEmailShell`.
 * Brand: Navy #2C3E50, Rose #B86E7B. Variables use {{name}} syntax.
 *
 * Idempotent: upserts by template key.
 *
 * Run: npx tsx prisma/seed-phase-7.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** A rose CTA button — email-safe table (rounded-full pill). */
function btn(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#B86E7B;border-radius:999px;"><a href="${url}" style="display:inline-block;padding:13px 32px;color:#ffffff;font-weight:600;text-decoration:none;border-radius:999px;">${label}</a></td></tr></table>`;
}

const APP = "https://hajr-academy.vercel.app";

type T = {
  key: string;
  category: "TRANSACTIONAL" | "MARKETING" | "SYSTEM";
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
  variables: string[];
};

const templates: T[] = [
  {
    key: "welcome_student",
    category: "TRANSACTIONAL",
    subjectEn: "Welcome to Hajr Academy!",
    subjectAr: "أهلاً بك في أكاديمية هجر!",
    bodyEn: `<h2 style="color:#2C3E50;">Welcome, {{name}}!</h2><p>Your Hajr Academy account is ready. Log in to see your classes, the English Lab, and STEP mock exams.</p>${btn("Go to my dashboard", `${APP}/en/student`)}<p>We're glad to have you with us.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">أهلاً بك يا {{name}}!</h2><p>تم تجهيز حسابك في أكاديمية هجر. سجّل الدخول لمشاهدة فصولك ومختبر اللغة والاختبارات التجريبية لاختبار ستيب.</p>${btn("الذهاب إلى لوحتي", `${APP}/ar/student`)}<p>سعداء بانضمامك إلينا.</p>`,
    variables: ["name"],
  },
  {
    key: "welcome_parent",
    category: "TRANSACTIONAL",
    subjectEn: "Welcome to Hajr Academy — Parent Account",
    subjectAr: "أهلاً بك في أكاديمية هجر — حساب ولي الأمر",
    bodyEn: `<h2 style="color:#2C3E50;">Welcome, {{name}}!</h2><p>Your parent account lets you follow your children's classes, schedules, and progress. Use your invite code to link a child.</p>${btn("Open parent portal", `${APP}/en/parent`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">أهلاً بك يا {{name}}!</h2><p>يتيح لك حساب ولي الأمر متابعة فصول أبنائك وجداولهم وتقدّمهم. استخدم رمز الدعوة لربط ابنك بحسابك.</p>${btn("فتح بوابة ولي الأمر", `${APP}/ar/parent`)}`,
    variables: ["name"],
  },
  {
    key: "trial_request_admin",
    category: "SYSTEM",
    subjectEn: "New trial request from {{name}}",
    subjectAr: "طلب حصة تجريبية جديد من {{name}}",
    bodyEn: `<h2 style="color:#2C3E50;">New trial request</h2><p><strong>Name:</strong> {{name}}<br/><strong>Phone:</strong> {{phone}}<br/><strong>Program:</strong> {{program}}</p><p>Follow up within 24 hours.</p>${btn("View trial requests", `${APP}/en/admin/trials`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">طلب حصة تجريبية جديد</h2><p><strong>الاسم:</strong> {{name}}<br/><strong>الجوال:</strong> {{phone}}<br/><strong>البرنامج:</strong> {{program}}</p><p>يُرجى المتابعة خلال ٢٤ ساعة.</p>${btn("عرض طلبات الحصص التجريبية", `${APP}/ar/admin/trials`)}`,
    variables: ["name", "phone", "program"],
  },
  {
    key: "trial_confirmation_visitor",
    category: "TRANSACTIONAL",
    subjectEn: "Your trial class request was received",
    subjectAr: "تم استلام طلب حصتك التجريبية",
    bodyEn: `<h2 style="color:#2C3E50;">Thank you, {{name}}!</h2><p>We received your free trial class request. Our team will contact you within 24 hours to schedule it.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">شكراً لك يا {{name}}!</h2><p>استلمنا طلب حصتك التجريبية المجانية. سيتواصل معك فريقنا خلال ٢٤ ساعة لتحديد الموعد.</p>`,
    variables: ["name"],
  },
  {
    key: "class_reminder_student",
    category: "TRANSACTIONAL",
    subjectEn: "Your class starts in 30 minutes",
    subjectAr: "حصتك تبدأ خلال ٣٠ دقيقة",
    bodyEn: `<h2 style="color:#2C3E50;">Class reminder</h2><p>Hi {{name}}, your class <strong>{{className}}</strong> with {{teacherName}} starts at <strong>{{startTime}}</strong>.</p>${btn("Join class", `${APP}/en/student`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">تذكير بالحصة</h2><p>مرحباً {{name}}، حصتك <strong>{{className}}</strong> مع {{teacherName}} تبدأ الساعة <strong>{{startTime}}</strong>.</p>${btn("الانضمام للحصة", `${APP}/ar/student`)}`,
    variables: ["name", "className", "teacherName", "startTime"],
  },
  {
    key: "class_reminder_parent",
    category: "TRANSACTIONAL",
    subjectEn: "Your child's class starts in 30 minutes",
    subjectAr: "حصة ابنك تبدأ خلال ٣٠ دقيقة",
    bodyEn: `<h2 style="color:#2C3E50;">Class reminder</h2><p>The class <strong>{{className}}</strong> with {{teacherName}} starts at <strong>{{startTime}}</strong>.</p>${btn("View schedule", `${APP}/en/parent`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">تذكير بالحصة</h2><p>حصة <strong>{{className}}</strong> مع {{teacherName}} تبدأ الساعة <strong>{{startTime}}</strong>.</p>${btn("عرض الجدول", `${APP}/ar/parent`)}`,
    variables: ["className", "teacherName", "startTime"],
  },
  {
    key: "class_cancelled",
    category: "TRANSACTIONAL",
    subjectEn: "Your class has been cancelled",
    subjectAr: "تم إلغاء حصتك",
    bodyEn: `<h2 style="color:#2C3E50;">Class cancelled</h2><p>The class <strong>{{className}}</strong> scheduled for {{sessionDate}} has been cancelled. We apologise for any inconvenience.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">تم إلغاء الحصة</h2><p>تم إلغاء حصة <strong>{{className}}</strong> المقرّرة بتاريخ {{sessionDate}}. نعتذر عن أي إزعاج.</p>`,
    variables: ["className", "sessionDate"],
  },
  {
    key: "payment_due",
    category: "TRANSACTIONAL",
    subjectEn: "Invoice {{invoiceNumber}} is due",
    subjectAr: "الفاتورة {{invoiceNumber}} مستحقة",
    bodyEn: `<h2 style="color:#2C3E50;">Payment due</h2><p>Invoice <strong>{{invoiceNumber}}</strong> for <strong>{{amount}} SAR</strong> is due on {{dueDate}}.</p>${btn("Pay now", `${APP}/en/student/finance`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">دفعة مستحقة</h2><p>الفاتورة <strong>{{invoiceNumber}}</strong> بمبلغ <strong>{{amount}} ريال</strong> مستحقة بتاريخ {{dueDate}}.</p>${btn("ادفع الآن", `${APP}/ar/student/finance`)}`,
    variables: ["invoiceNumber", "amount", "dueDate"],
  },
  {
    key: "payment_received",
    category: "TRANSACTIONAL",
    subjectEn: "Payment received — thank you!",
    subjectAr: "تم استلام الدفعة — شكراً لك!",
    bodyEn: `<h2 style="color:#2C3E50;">Payment received</h2><p>We received your payment of <strong>{{amount}} SAR</strong> for invoice {{invoiceNumber}}. Thank you!</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">تم استلام الدفعة</h2><p>استلمنا دفعتك بمبلغ <strong>{{amount}} ريال</strong> للفاتورة {{invoiceNumber}}. شكراً لك!</p>`,
    variables: ["invoiceNumber", "amount"],
  },
  {
    key: "payment_overdue",
    category: "TRANSACTIONAL",
    subjectEn: "Reminder: Invoice {{invoiceNumber}} is overdue",
    subjectAr: "تذكير: الفاتورة {{invoiceNumber}} متأخرة",
    bodyEn: `<h2 style="color:#2C3E50;">Overdue invoice</h2><p>Invoice <strong>{{invoiceNumber}}</strong> for <strong>{{amount}} SAR</strong> is <strong>{{daysOverdue}} day(s)</strong> overdue. Please settle it to avoid interruption.</p>${btn("Pay now", `${APP}/en/student/finance`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">فاتورة متأخرة</h2><p>الفاتورة <strong>{{invoiceNumber}}</strong> بمبلغ <strong>{{amount}} ريال</strong> متأخرة <strong>{{daysOverdue}} يوم</strong>. يُرجى السداد لتجنّب انقطاع الخدمة.</p>${btn("ادفع الآن", `${APP}/ar/student/finance`)}`,
    variables: ["invoiceNumber", "amount", "daysOverdue"],
  },
  {
    key: "attendance_alert_parent",
    category: "TRANSACTIONAL",
    subjectEn: "{{studentName}} missed a class today",
    subjectAr: "{{studentName}} تغيّب عن حصة اليوم",
    bodyEn: `<h2 style="color:#2C3E50;">Attendance alert</h2><p>Your child <strong>{{studentName}}</strong> was marked absent from a class today. Please follow up.</p>${btn("View details", `${APP}/en/parent`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">تنبيه حضور</h2><p>تم تسجيل غياب ابنك <strong>{{studentName}}</strong> عن إحدى الحصص اليوم. يُرجى المتابعة.</p>${btn("عرض التفاصيل", `${APP}/ar/parent`)}`,
    variables: ["studentName"],
  },
  {
    key: "lab_feedback_ready",
    category: "TRANSACTIONAL",
    subjectEn: "Your exercise feedback is ready",
    subjectAr: "ملاحظات تمرينك جاهزة",
    bodyEn: `<h2 style="color:#2C3E50;">Feedback ready</h2><p>Hi {{name}}, your work on <strong>{{exerciseTitle}}</strong> has been graded. View your score and detailed feedback.</p>${btn("View feedback", `${APP}/en/student/lab`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">الملاحظات جاهزة</h2><p>مرحباً {{name}}، تم تقييم تمرينك <strong>{{exerciseTitle}}</strong>. شاهد درجتك والملاحظات التفصيلية.</p>${btn("عرض الملاحظات", `${APP}/ar/student/lab`)}`,
    variables: ["name", "exerciseTitle"],
  },
  {
    key: "exam_result_ready",
    category: "TRANSACTIONAL",
    subjectEn: "Your STEP exam results are ready",
    subjectAr: "نتائج اختبار ستيب جاهزة",
    bodyEn: `<h2 style="color:#2C3E50;">Exam results ready</h2><p>Hi {{name}}, your results for <strong>{{examTitle}}</strong> are ready, including a section breakdown and recommendations.</p>${btn("View results", `${APP}/en/student/exams`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">نتائج الاختبار جاهزة</h2><p>مرحباً {{name}}، نتائجك في <strong>{{examTitle}}</strong> جاهزة، وتشمل تفصيل الأقسام والتوصيات.</p>${btn("عرض النتائج", `${APP}/ar/student/exams`)}`,
    variables: ["name", "examTitle"],
  },
  {
    key: "teacher_assigned",
    category: "TRANSACTIONAL",
    subjectEn: "You've been assigned to a class",
    subjectAr: "تم تعيينك لتدريس فصل",
    bodyEn: `<h2 style="color:#2C3E50;">New class assignment</h2><p>Hi {{name}}, you have been assigned to teach <strong>{{className}}</strong>. View the roster and schedule on your dashboard.</p>${btn("View my classes", `${APP}/en/teacher/classes`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">تعيين فصل جديد</h2><p>مرحباً {{name}}، تم تعيينك لتدريس <strong>{{className}}</strong>. اطّلع على قائمة الطلاب والجدول من لوحتك.</p>${btn("عرض فصولي", `${APP}/ar/teacher/classes`)}`,
    variables: ["name", "className"],
  },
  {
    key: "enrollment_confirmed",
    category: "TRANSACTIONAL",
    subjectEn: "Enrollment confirmed — {{className}}",
    subjectAr: "تأكيد التسجيل — {{className}}",
    bodyEn: `<h2 style="color:#2C3E50;">You're enrolled!</h2><p>Hi {{name}}, your enrollment in <strong>{{className}}</strong> is confirmed. See your schedule on your dashboard.</p>${btn("View my classes", `${APP}/en/student/classes`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">تم تسجيلك!</h2><p>مرحباً {{name}}، تم تأكيد تسجيلك في <strong>{{className}}</strong>. اطّلع على جدولك من لوحتك.</p>${btn("عرض فصولي", `${APP}/ar/student/classes`)}`,
    variables: ["name", "className"],
  },
  {
    key: "password_reset",
    category: "TRANSACTIONAL",
    subjectEn: "Reset your Hajr Academy password",
    subjectAr: "إعادة تعيين كلمة مرور أكاديمية هجر",
    bodyEn: `<h2 style="color:#2C3E50;">Password reset</h2><p>We received a request to reset your password. Click below to choose a new one. If you didn't request this, ignore this email.</p>${btn("Reset password", "{{resetUrl}}")}`,
    bodyAr: `<h2 style="color:#2C3E50;">إعادة تعيين كلمة المرور</h2><p>استلمنا طلباً لإعادة تعيين كلمة مرورك. اضغط أدناه لاختيار كلمة مرور جديدة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>${btn("إعادة تعيين كلمة المرور", "{{resetUrl}}")}`,
    variables: ["resetUrl"],
  },
];

async function main() {
  console.log("🌱 Seeding Phase 7 — email templates...");
  for (const tpl of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: tpl.key },
      create: tpl,
      update: {
        subjectAr: tpl.subjectAr,
        subjectEn: tpl.subjectEn,
        bodyAr: tpl.bodyAr,
        bodyEn: tpl.bodyEn,
        variables: tpl.variables,
        category: tpl.category,
      },
    });
    console.log(`  ✓ ${tpl.key}`);
  }
  console.log(`✅ Phase 7 seed complete — ${templates.length} templates.`);
}

main()
  .catch((e) => {
    console.error("❌ Phase 7 seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
