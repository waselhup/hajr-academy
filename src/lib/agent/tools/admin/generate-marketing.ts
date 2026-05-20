import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const generateMarketing: AgentTool = {
  name: "generate_marketing",
  description:
    "Generate marketing content (Instagram, WhatsApp, email, promotion)",
  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: [
          "instagram_post",
          "whatsapp_broadcast",
          "parent_email",
          "promotion",
        ],
        description: "Type of marketing content to generate",
      },
      topic: {
        type: "string",
        description: "Topic or theme of the marketing content",
      },
      language: {
        type: "string",
        enum: ["ar", "en", "both"],
        description: "Language for the content",
      },
      targetAudience: {
        type: "string",
        description:
          "Target audience (e.g., parents, high school students, university students)",
      },
    },
    required: ["type", "topic", "language"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const type = typeof input.type === "string" ? input.type.trim() : "";
      const topic = typeof input.topic === "string" ? input.topic.trim() : "";
      const language = typeof input.language === "string" ? input.language.trim() : "ar";
      const targetAudience = typeof input.targetAudience === "string" ? input.targetAudience.trim() : "";

      if (!type || !topic) {
        return { error: "type and topic are required" };
      }

      // Get academy stats for context
      const [studentCount, teacherCount, activeClasses] = await Promise.all([
        context.prisma.studentProfile.count({
          where: { user: { isActive: true } },
        }),
        context.prisma.teacherProfile.count({ where: { active: true } }),
        context.prisma.class.count({ where: { status: "ACTIVE" } }),
      ]);

      const academyContext = {
        name: "HAJR Academy",
        nameAr: "أكاديمية هجر",
        tagline: "Your Path to English Excellence",
        taglineAr: "طريقك نحو التميز في الإنجليزية",
        stats: {
          students: studentCount,
          teachers: teacherCount,
          activeClasses,
        },
        programs: [
          {
            code: "STEP_PREP",
            nameEn: "STEP Test Preparation",
            nameAr: "التحضير لاختبار STEP",
          },
          {
            code: "PRIVATE",
            nameEn: "Private Lessons",
            nameAr: "دروس خصوصية",
          },
          {
            code: "UNI_PREP",
            nameEn: "University Preparation",
            nameAr: "التحضير الجامعي",
          },
          {
            code: "SCHOOL",
            nameEn: "School Programs",
            nameAr: "برامج المدارس",
          },
          {
            code: "ENGLISH_LAB",
            nameEn: "English Lab",
            nameAr: "مختبر اللغة الإنجليزية",
          },
        ],
        location: "Saudi Arabia",
        website: "hajracademy.com",
      };

      const templates: Record<string, Record<string, unknown>> = {
        instagram_post: {
          format: "Instagram Post",
          guidelines: {
            maxCaptionLength: 2200,
            recommendedHashtags: 15,
            imageSpecs: "1080x1080 or 1080x1350",
            tone: "Inspirational, youthful, motivational",
          },
          suggestedHashtags: [
            "#HAJR_Academy",
            "#أكاديمية_هجر",
            "#STEP",
            "#EnglishLearning",
            "#تعلم_الإنجليزية",
            "#SaudiEducation",
            "#التعليم_السعودي",
          ],
        },
        whatsapp_broadcast: {
          format: "WhatsApp Broadcast",
          guidelines: {
            maxLength: 1000,
            tone: "Friendly, direct, personal",
            includeEmojis: true,
            includeCallToAction: true,
          },
        },
        parent_email: {
          format: "Parent Email",
          guidelines: {
            tone: "Respectful, informative, professional",
            structure: [
              "Greeting",
              "Key message",
              "Details",
              "Call to action",
              "Sign-off",
            ],
            includeAcademyBranding: true,
          },
        },
        promotion: {
          format: "Promotional Campaign",
          guidelines: {
            tone: "Exciting, urgent, value-focused",
            includePricing: true,
            includeTestimonials: true,
            includeDeadline: true,
          },
        },
      };

      return {
        type,
        topic,
        language,
        targetAudience: targetAudience || "general",
        template: templates[type] ?? templates.instagram_post,
        academyContext,
        instructions:
          "Use the above academy context and template guidelines to generate the marketing content. Adapt the tone and style to match the content type and target audience.",
      };
    } catch (error) {
      return {
        error: `Failed to generate marketing context: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
