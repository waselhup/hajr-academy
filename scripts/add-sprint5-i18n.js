/**
 * Add Sprint 5 i18n namespaces to ar.json + en.json without
 * clobbering existing keys. Idempotent.
 */
const fs = require("fs");
const path = require("path");

const FILES = {
  ar: path.join(__dirname, "..", "src", "messages", "ar.json"),
  en: path.join(__dirname, "..", "src", "messages", "en.json"),
};

const ADDITIONS = {
  LessonAi: {
    en: {
      title: "Lesson Summary",
      summary: "Summary",
      keyVocab: "Key vocabulary",
      grammarPoints: "Grammar points",
      homework: "Homework",
      teacherActions: "Teacher action items",
      regenerate: "Regenerate",
      regenerated: "Summary regenerated",
      confidence: "Confidence",
      generatedAt: "Generated at",
      noSummaryYet: "No AI summary yet for this session.",
      generateNow: "Generate now",
      tapToFlip: "Tap to flip",
      save: "Save",
      saved: "Saved",
      homeworkPlaceholder: "Homework recommendation…",
      view: "View",
      generateBulk: "Generate summaries",
      bulkSuccess: "{count} summaries generated.",
    },
    ar: {
      title: "ملخص الحصة",
      summary: "الملخص",
      keyVocab: "المفردات الأساسية",
      grammarPoints: "نقاط القواعد",
      homework: "الواجب",
      teacherActions: "بنود متابعة المعلم",
      regenerate: "إعادة التوليد",
      regenerated: "تم تحديث الملخص",
      confidence: "الموثوقية",
      generatedAt: "تاريخ التوليد",
      noSummaryYet: "لا يوجد ملخص بالذكاء الاصطناعي لهذه الحصة بعد.",
      generateNow: "ولّد الآن",
      tapToFlip: "اضغط للقلب",
      save: "حفظ",
      saved: "تم الحفظ",
      homeworkPlaceholder: "توصية الواجب…",
      view: "عرض",
      generateBulk: "توليد الملخصات",
      bulkSuccess: "تم توليد {count} ملخصاً.",
    },
  },
  BrandKit: {
    en: {
      pageTitle: "Brand Kit",
      brandBook: "Brand Book",
      downloadBookTitle: "Download the complete Brand Book v3.0",
      downloadBookSubtitle:
        "10-page bilingual brand bible — logos, colors, fonts, voice, social.",
      downloadBook: "Download Brand Book",
      sendToDesigner: "Send to designer",
      designerEmail: "Designer's email",
      optionalNote: "Optional note (e.g. project context)",
      send: "Send",
      sentSuccess: "Brand book sent.",
      sentMocked: "Brand book queued (email mock mode).",
      emailRequired: "Email is required.",
      download: "Download",
      categoryIdentity: "Identity",
      categoryPrint: "Print",
      categoryDigital: "Digital",
      categorySocial: "Social",
    },
    ar: {
      pageTitle: "هوية العلامة",
      brandBook: "دليل العلامة",
      downloadBookTitle: "تحميل دليل العلامة الكامل ٣٫٠",
      downloadBookSubtitle:
        "دليل علامة ثنائي اللغة من ١٠ صفحات — شعارات، ألوان، خطوط، نبرة، اجتماعي.",
      downloadBook: "تحميل دليل العلامة",
      sendToDesigner: "أرسل إلى المصمم",
      designerEmail: "البريد الإلكتروني للمصمم",
      optionalNote: "ملاحظة اختيارية (سياق المشروع مثلاً)",
      send: "أرسل",
      sentSuccess: "تم إرسال دليل العلامة.",
      sentMocked: "تم إدراج دليل العلامة (وضع تجريبي للبريد).",
      emailRequired: "البريد الإلكتروني مطلوب.",
      download: "تحميل",
      categoryIdentity: "الهوية",
      categoryPrint: "الطباعة",
      categoryDigital: "الرقمي",
      categorySocial: "الاجتماعي",
    },
  },
  ValidationMode: {
    en: {
      pageTitle: "Teacher Validation",
      pretitle: "Pre-meeting tool",
      heroTitle: "Validate every teacher request — together",
      heroSubtitle:
        "Walk the tabs with your teaching team. Tick verified, sign off, export.",
      exportReport: "Export Validation Report",
      teacherRequest: "Original teacher request",
      deliveredAs: "Delivered as",
      tryItNow: "Try it now",
      screenshots: "Screenshots",
      screenshotsHint: "Owner can paste screenshots after the meeting.",
      verifiedByTeacher: "Verified by teacher",
      teacherName: "Teacher's name (sign-off)",
      notes: "Notes / teacher comments",
    },
    ar: {
      pageTitle: "تحقق المعلم",
      pretitle: "أداة قبل الاجتماع",
      heroTitle: "تحقق من كل طلب معلم — معاً",
      heroSubtitle:
        "تصفح التبويبات مع فريقك التعليمي. ضع علامة تحقق ووقّع وصدّر.",
      exportReport: "تصدير تقرير التحقق",
      teacherRequest: "طلب المعلم الأصلي",
      deliveredAs: "تم تسليمه على شكل",
      tryItNow: "جرّب الآن",
      screenshots: "لقطات الشاشة",
      screenshotsHint: "يمكن للمالك إلصاق لقطات بعد الاجتماع.",
      verifiedByTeacher: "تم التحقق من المعلم",
      teacherName: "اسم المعلم (للتوقيع)",
      notes: "ملاحظات / تعليقات المعلم",
    },
  },
  Delivery: {
    en: {
      pageTitle: "Delivery Package",
      heroTitle: "Everything the owner needs to hand off the platform",
      heroSubtitle:
        "Brand book, presentation, validation, runbook, feature matrix, checklist.",
      students: "students",
      teachers: "teachers",
      sessions: "sessions",
      summaries: "AI summaries",
      certificates: "certificates",
      brandBook: "Brand Book PDF",
      brandBookDesc: "10-page bilingual brand bible.",
      presentationPptx: "Client Presentation (PPTX)",
      presentationPptxDesc: "Editable PowerPoint with live DB stats.",
      presentationPdf: "Client Presentation (PDF)",
      presentationPdfDesc: "A4 landscape PDF — easier to view on any device.",
      validationReport: "Validation Report",
      validationReportDesc: "Open the 12-tab validation page to export.",
      runbook: "Admin Runbook",
      runbookDesc: "Daily / weekly / monthly / quarterly operations.",
      featureMatrix: "Feature Matrix (CSV)",
      featureMatrixDesc: "Every feature, sprint, status, URL.",
      handoverChecklist: "Handover Checklist",
      handoverChecklistDesc: "10-item sign-off list.",
      open: "Open",
      download: "Download",
      footnote:
        "All artifacts are regenerated on demand from live DB state — never stale.",
    },
    ar: {
      pageTitle: "حزمة التسليم",
      heroTitle: "كل ما يحتاجه المالك لتسليم المنصة",
      heroSubtitle:
        "دليل العلامة، العرض التقديمي، التحقق، الدليل التشغيلي، مصفوفة الميزات، قائمة التسليم.",
      students: "طالب",
      teachers: "معلم",
      sessions: "حصة",
      summaries: "ملخص ذكي",
      certificates: "شهادة",
      brandBook: "دليل العلامة PDF",
      brandBookDesc: "دليل علامة ثنائي اللغة من ١٠ صفحات.",
      presentationPptx: "العرض التقديمي (PPTX)",
      presentationPptxDesc: "ملف PowerPoint قابل للتحرير بإحصاءات حيّة.",
      presentationPdf: "العرض التقديمي (PDF)",
      presentationPdfDesc: "PDF بحجم A4 أفقي — يسهل عرضه على أي جهاز.",
      validationReport: "تقرير التحقق",
      validationReportDesc: "افتح صفحة التحقق ذات الـ ١٢ تبويباً للتصدير.",
      runbook: "الدليل التشغيلي للإدارة",
      runbookDesc: "العمليات اليومية / الأسبوعية / الشهرية / الربعية.",
      featureMatrix: "مصفوفة الميزات (CSV)",
      featureMatrixDesc: "كل ميزة، السبرنت، الحالة، الرابط.",
      handoverChecklist: "قائمة التسليم",
      handoverChecklistDesc: "قائمة من ١٠ بنود للتوقيع.",
      open: "افتح",
      download: "تحميل",
      footnote: "تُولَّد كل الأصول عند الطلب من حالة قاعدة البيانات الحيّة — دائماً محدّثة.",
    },
  },
  Qa: {
    en: {
      notificationCoverage: "Notification coverage",
      auditCoverage: "Audit log coverage",
      i18nCheck: "i18n parity check",
      buildStats: "Build stats",
      type: "Type",
      callSites: "Call sites",
      status: "Status",
      inUse: "in use",
      unused: "unused",
      typesInUse: "notification types in use",
      file: "File",
      hasMutation: "Has mutation",
      hasAudit: "Has audit",
      covered: "covered",
      missing: "missing",
      mutationRoutesCovered: "mutation routes covered",
      parity: "Parity",
      missingInAr: "Missing in Arabic",
      missingInEn: "Missing in English",
      untranslatedAr: "Untranslated (value === key)",
      markupLeaks: "Markup leaks",
      noIssues: "No issues",
      searchPlaceholder: "Search transcripts, summaries, class names…",
      selectAtLeastOne: "Select at least one row.",
    },
    ar: {
      notificationCoverage: "تغطية الإشعارات",
      auditCoverage: "تغطية سجل المراجعة",
      i18nCheck: "فحص تطابق الترجمة",
      buildStats: "إحصاءات البناء",
      type: "النوع",
      callSites: "مواقع الاستدعاء",
      status: "الحالة",
      inUse: "قيد الاستخدام",
      unused: "غير مستخدم",
      typesInUse: "نوع إشعار قيد الاستخدام",
      file: "الملف",
      hasMutation: "يحوي تعديلاً",
      hasAudit: "يسجّل المراجعة",
      covered: "مغطّى",
      missing: "ناقص",
      mutationRoutesCovered: "مسار تعديل مغطّى",
      parity: "التطابق",
      missingInAr: "ناقص في العربية",
      missingInEn: "ناقص في الإنجليزية",
      untranslatedAr: "غير مترجم (القيمة = المفتاح)",
      markupLeaks: "تسريب وسوم HTML",
      noIssues: "لا توجد مشكلات",
      searchPlaceholder: "ابحث في النصوص والملخصات وأسماء الحصص…",
      selectAtLeastOne: "اختر سطراً واحداً على الأقل.",
    },
  },
};

function mergeAdd(target, addition) {
  // Add only if not already present (don't clobber).
  for (const [ns, payload] of Object.entries(addition)) {
    if (!target[ns]) {
      target[ns] = payload;
    } else {
      for (const [k, v] of Object.entries(payload)) {
        if (!(k in target[ns])) target[ns][k] = v;
      }
    }
  }
}

function run() {
  for (const lang of ["ar", "en"]) {
    const file = FILES[lang];
    const cur = JSON.parse(fs.readFileSync(file, "utf8"));
    const additions = {};
    for (const [ns, byLang] of Object.entries(ADDITIONS)) {
      additions[ns] = byLang[lang];
    }
    mergeAdd(cur, additions);
    fs.writeFileSync(file, JSON.stringify(cur, null, 2) + "\n", "utf8");
    console.log(`✓ ${lang}.json updated`);
  }
}

run();
