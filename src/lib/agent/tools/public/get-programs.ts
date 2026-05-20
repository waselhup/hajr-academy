import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getPrograms: AgentTool = {
  name: "get_programs",
  description: "Get list of all academy programs with descriptions and pricing",
  input_schema: {
    type: "object",
    properties: {},
  },

  handler: async (
    _input: Record<string, unknown>,
    _context: AgentContext
  ): Promise<unknown> => {
    try {
      const programs = [
        {
          code: "STEP_PREP",
          nameEn: "STEP Preparation",
          nameAr: "التحضير لاختبار STEP",
          descriptionEn:
            "Comprehensive preparation for the Standardized Test of English Proficiency (STEP). Group classes covering reading, listening, grammar, and vocabulary with mock exams.",
          descriptionAr:
            "تحضير شامل لاختبار كفايات اللغة الإنجليزية (STEP). فصول جماعية تغطي القراءة والاستماع والقواعد والمفردات مع اختبارات تجريبية.",
          type: "GROUP",
          priceSar: 400,
          durationHours: 16,
          priceNote: "per month / شهرياً",
        },
        {
          code: "PRIVATE",
          nameEn: "Private Lessons",
          nameAr: "دروس خصوصية",
          descriptionEn:
            "One-on-one personalized English tutoring sessions tailored to the student's level and goals. Flexible scheduling with a dedicated tutor.",
          descriptionAr:
            "جلسات تعليم إنجليزي فردية مخصصة حسب مستوى الطالب وأهدافه. جدول مرن مع مدرّس مخصص.",
          type: "PRIVATE",
          priceSar: 800,
          durationHours: 16,
          priceNote: "per month / شهرياً",
        },
        {
          code: "UNI_PREP",
          nameEn: "University Preparation",
          nameAr: "التحضير الجامعي",
          descriptionEn:
            "English courses designed for university readiness. Covers academic writing, presentation skills, and the language requirements for Saudi university admissions.",
          descriptionAr:
            "دورات إنجليزي مصممة للاستعداد الجامعي. تغطي الكتابة الأكاديمية ومهارات العرض ومتطلبات اللغة للقبول في الجامعات السعودية.",
          type: "GROUP",
          priceSar: 400,
          durationHours: 16,
          priceNote: "per month / شهرياً",
        },
        {
          code: "SCHOOL",
          nameEn: "School Support",
          nameAr: "دعم المدارس",
          descriptionEn:
            "Tailored B2B English programs for partner schools. Custom curriculum, dedicated teachers, and progress reporting for school administrators.",
          descriptionAr:
            "برامج إنجليزي مخصصة للمدارس الشريكة. مناهج مخصصة ومدرسون مخصصون وتقارير تقدم لإدارة المدارس.",
          type: "B2B",
          priceSar: null,
          durationHours: null,
          priceNote: "Custom pricing — 12-month contract / تسعير مخصص — عقد ١٢ شهر",
        },
        {
          code: "ENGLISH_LAB",
          nameEn: "English Lab",
          nameAr: "معمل اللغة الإنجليزية",
          descriptionEn:
            "Self-paced interactive modules covering speaking, listening, writing, and reading. AI-powered exercises with instant feedback. Included free in Integrated and Private packages.",
          descriptionAr:
            "وحدات تعليمية تفاعلية ذاتية تغطي التحدث والاستماع والكتابة والقراءة. تمارين مدعومة بالذكاء الاصطناعي مع تقييم فوري. مضمّنة مجاناً في باقتي المتكاملة والخصوصية.",
          type: "SELF_STUDY",
          priceSar: 0,
          durationHours: null,
          priceNote:
            "Included in Integrated & Private packages / مضمّنة في باقتي المتكاملة والخصوصية",
        },
      ];

      return {
        programs,
        count: programs.length,
        vatNote: "All prices are subject to 15% VAT / جميع الأسعار تخضع لضريبة القيمة المضافة ١٥٪",
      };
    } catch (error) {
      return {
        error: `Failed to get programs: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
