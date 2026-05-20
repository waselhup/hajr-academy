import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getFaq: AgentTool = {
  name: "get_faq",
  description: "Get frequently asked questions about the academy",
  input_schema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description:
          "Filter by topic: pricing, schedule, cancellation, payment, technical, trial, class_size, language",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    _context: AgentContext
  ): Promise<unknown> => {
    try {
      const topic =
        typeof input.topic === "string"
          ? input.topic.trim().toLowerCase()
          : undefined;

      const allFaqs = [
        {
          topic: "pricing",
          questionEn: "How much do the programs cost?",
          questionAr: "كم تكلفة البرامج؟",
          answerEn:
            "Essential package starts at 250 SAR/month (8 group sessions). Integrated is 300 SAR/month (12 sessions + English Lab). Private lessons are 800 SAR/month (16 one-on-one sessions). All prices are subject to 15% VAT.",
          answerAr:
            "باقة الأساسية تبدأ من ٢٥٠ ريال/شهر (٨ جلسات جماعية). المتكاملة ٣٠٠ ريال/شهر (١٢ جلسة + معمل اللغة). الخصوصية ٨٠٠ ريال/شهر (١٦ جلسة فردية). جميع الأسعار تخضع لضريبة القيمة المضافة ١٥٪.",
        },
        {
          topic: "schedule",
          questionEn: "What are the class schedules?",
          questionAr: "ما هي مواعيد الحصص؟",
          answerEn:
            "Classes are available Sunday through Thursday, with morning, afternoon, and evening slots. Exact schedules depend on the program and group availability. We work with you to find the best time.",
          answerAr:
            "الحصص متاحة من الأحد إلى الخميس، مع فترات صباحية ومسائية. المواعيد الدقيقة تعتمد على البرنامج وتوفر المجموعات. نعمل معك لإيجاد أفضل وقت.",
        },
        {
          topic: "cancellation",
          questionEn: "What is the cancellation policy?",
          questionAr: "ما هي سياسة الإلغاء؟",
          answerEn:
            "You can cancel your subscription at any time. Cancellations take effect at the end of the current billing month. No refunds for partial months. School contracts have a 12-month commitment.",
          answerAr:
            "يمكنك إلغاء اشتراكك في أي وقت. يسري الإلغاء في نهاية شهر الفوترة الحالي. لا استرداد لأجزاء الشهر. عقود المدارس تتطلب التزام ١٢ شهراً.",
        },
        {
          topic: "payment",
          questionEn: "What payment methods do you accept?",
          questionAr: "ما هي طرق الدفع المتاحة؟",
          answerEn:
            "We accept Mada debit cards, Apple Pay, STC Pay, credit/debit cards, and bank transfers. All payments are processed securely through Moyasar payment gateway.",
          answerAr:
            "نقبل بطاقات مدى، Apple Pay، STC Pay، بطاقات الائتمان/الخصم، والتحويل البنكي. جميع المدفوعات تتم بشكل آمن عبر بوابة مُيسر للدفع.",
        },
        {
          topic: "technical",
          questionEn: "What do I need for online classes?",
          questionAr: "ماذا أحتاج للحصص الإلكترونية؟",
          answerEn:
            "You need a modern web browser (Chrome, Safari, or Edge), a stable internet connection (at least 5 Mbps), and a device with a microphone and camera (laptop, tablet, or phone).",
          answerAr:
            "تحتاج متصفح حديث (Chrome أو Safari أو Edge)، اتصال إنترنت مستقر (٥ ميقابت على الأقل)، وجهاز بميكروفون وكاميرا (لابتوب أو تابلت أو جوال).",
        },
        {
          topic: "trial",
          questionEn: "Do you offer free trial classes?",
          questionAr: "هل تقدمون حصص تجريبية مجانية؟",
          answerEn:
            "Yes! Your first class is completely free with no obligation. Book a trial to experience our teaching style and platform before committing to a package.",
          answerAr:
            "نعم! حصتك الأولى مجانية تماماً بدون أي التزام. احجز حصة تجريبية لتجربة أسلوب التعليم والمنصة قبل الاشتراك في أي باقة.",
        },
        {
          topic: "class_size",
          questionEn: "How many students are in each group class?",
          questionAr: "كم عدد الطلاب في كل مجموعة؟",
          answerEn:
            "Group classes have a maximum of 6 students to ensure personalized attention and active participation for every student.",
          answerAr:
            "الحصص الجماعية تضم حداً أقصى ٦ طلاب لضمان الاهتمام الشخصي والمشاركة الفعّالة لكل طالب.",
        },
        {
          topic: "language",
          questionEn: "Are classes taught in Arabic or English?",
          questionAr: "هل الحصص باللغة العربية أم الإنجليزية؟",
          answerEn:
            "Our instruction is bilingual (Arabic and English). Teachers explain concepts in Arabic when needed, especially for beginners, while progressively increasing English usage as students advance.",
          answerAr:
            "التعليم لدينا ثنائي اللغة (عربي وإنجليزي). المدرسون يشرحون المفاهيم بالعربية عند الحاجة، خاصة للمبتدئين، مع زيادة استخدام الإنجليزية تدريجياً مع تقدم الطلاب.",
        },
      ];

      const filtered = topic
        ? allFaqs.filter((faq) => faq.topic === topic)
        : allFaqs;

      return {
        faqs: filtered,
        count: filtered.length,
        availableTopics: [
          "pricing",
          "schedule",
          "cancellation",
          "payment",
          "technical",
          "trial",
          "class_size",
          "language",
        ],
      };
    } catch (error) {
      return {
        error: `Failed to get FAQ: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
