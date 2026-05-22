import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { validatePromoCode } from "@/lib/finance/promo-codes";
import { getPackage, isSubscribablePackage } from "@/lib/finance/packages";

/**
 * Public tool — "عندي كوبون HAJR50" / "I have a coupon HAJR50".
 *
 * Validates a promo code against a chosen package and previews the
 * discount. This is read-only: it does NOT create a subscription — the
 * student applies the code on the billing page when subscribing.
 */
export const applyPromoCode: AgentTool = {
  name: "apply_promo_code",
  description:
    "Validate a promo code for a chosen package and show the resulting discount and price. Read-only — does not subscribe the student. Use when a student mentions they have a coupon or discount code.",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The promo code the student wants to use.",
      },
      packageType: {
        type: "string",
        enum: ["ESSENTIAL", "INTEGRATED", "PRIVATE"],
        description: "The package the student wants to apply the code to.",
      },
    },
    required: ["code", "packageType"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const code = typeof input.code === "string" ? input.code.trim() : "";
      const packageType =
        typeof input.packageType === "string" ? input.packageType : "";

      if (!code) {
        return { error: "Please provide a promo code. / يرجى إدخال رمز الخصم." };
      }
      if (!isSubscribablePackage(packageType)) {
        return {
          error:
            "Please choose a package: Essential, Integrated, or Private. / يرجى اختيار باقة.",
        };
      }

      const pkg = getPackage(packageType);

      // Scope the per-user check to the student, if logged in.
      let studentId: string | undefined;
      if (context.userRole === "STUDENT" && context.userId) {
        const student = await context.prisma.studentProfile.findUnique({
          where: { userId: context.userId },
          select: { id: true },
        });
        studentId = student?.id;
      }

      const result = await validatePromoCode({
        codeStr: code,
        basePrice: pkg.pricePerMonth,
        packageType,
        studentId,
      });

      if (!result.valid) {
        return {
          valid: false,
          reason: result.reason,
          reasonAr: result.reasonAr,
        };
      }

      const discount = result.discountAmount ?? 0;
      const net = Math.max(0, +(pkg.pricePerMonth - discount).toFixed(2));
      const vat = +(net * 0.15).toFixed(2);

      return {
        valid: true,
        code: result.code!.code,
        package: pkg.nameEn,
        packageAr: pkg.nameAr,
        originalPriceSar: pkg.pricePerMonth,
        discountSar: discount,
        freeMonths: result.freeMonths ?? 0,
        vatSar: vat,
        finalPriceSar: +(net + vat).toFixed(2),
        message: `Promo code ${result.code!.code} gives a ${discount.toFixed(
          2
        )} SAR discount on the ${pkg.nameEn}. Apply it on the billing page when subscribing.`,
      };
    } catch (error) {
      return {
        error: `Failed to validate promo code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
