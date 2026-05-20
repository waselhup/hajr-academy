import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const getPackages: AgentTool = {
  name: "get_packages",
  description: "Get subscription packages with pricing and comparison",
  input_schema: {
    type: "object",
    properties: {},
  },

  handler: async (
    _input: Record<string, unknown>,
    _context: AgentContext
  ): Promise<unknown> => {
    try {
      const packages = [
        {
          code: "ESSENTIAL",
          nameEn: "Essential",
          nameAr: "الأساسية",
          priceSar: 250,
          priceWithVat: 287.5,
          sessionsPerMonth: 8,
          sessionType: "group",
          labAccess: false,
          dedicatedTutor: false,
          features: [
            { en: "8 group sessions per month", ar: "٨ جلسات جماعية شهرياً" },
            { en: "Max 6 students per group", ar: "حد أقصى ٦ طلاب في المجموعة" },
            { en: "Live interactive classes", ar: "فصول تفاعلية مباشرة" },
            { en: "Monthly progress report", ar: "تقرير تقدم شهري" },
          ],
          badge: null,
        },
        {
          code: "INTEGRATED",
          nameEn: "Integrated",
          nameAr: "المتكاملة",
          priceSar: 300,
          priceWithVat: 345,
          sessionsPerMonth: 12,
          sessionType: "group",
          labAccess: true,
          dedicatedTutor: false,
          features: [
            { en: "12 group sessions per month", ar: "١٢ جلسة جماعية شهرياً" },
            { en: "Max 6 students per group", ar: "حد أقصى ٦ طلاب في المجموعة" },
            { en: "Full English Lab access", ar: "وصول كامل لمعمل اللغة الإنجليزية" },
            { en: "AI-powered self-study modules", ar: "وحدات تعلّم ذاتي بالذكاء الاصطناعي" },
            { en: "Weekly progress tracking", ar: "متابعة تقدم أسبوعية" },
          ],
          badge: { en: "Most Popular", ar: "الأكثر طلباً" },
        },
        {
          code: "PRIVATE",
          nameEn: "Private",
          nameAr: "الخصوصية",
          priceSar: 800,
          priceWithVat: 920,
          sessionsPerMonth: 16,
          sessionType: "private 1-on-1",
          labAccess: true,
          dedicatedTutor: true,
          features: [
            { en: "16 private 1-on-1 sessions per month", ar: "١٦ جلسة خصوصية فردية شهرياً" },
            { en: "Dedicated personal tutor", ar: "مدرّس شخصي مخصص" },
            { en: "Full English Lab access", ar: "وصول كامل لمعمل اللغة الإنجليزية" },
            { en: "Customized learning plan", ar: "خطة تعلّم مخصصة" },
            { en: "Priority scheduling", ar: "أولوية في الجدولة" },
            { en: "Detailed weekly progress report", ar: "تقرير تقدم أسبوعي مفصّل" },
          ],
          badge: { en: "Premium", ar: "مميزة" },
        },
      ];

      return {
        packages,
        count: packages.length,
        vatNote:
          "All prices are subject to 15% VAT (ضريبة القيمة المضافة ١٥٪). Prices shown with VAT included in priceWithVat field.",
        recommendation:
          "The Integrated package offers the best value with lab access and more sessions. / باقة المتكاملة تقدم أفضل قيمة مع معمل اللغة وجلسات أكثر.",
      };
    } catch (error) {
      return {
        error: `Failed to get packages: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
