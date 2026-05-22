import type { AgentTool, AgentContext } from "@/lib/agent/types";
import type { PackageType } from "@prisma/client";

const PACKAGE_TYPES: PackageType[] = [
  "ESSENTIAL",
  "INTEGRATED",
  "PRIVATE",
  "SCHOOL",
];

/**
 * Admin tool — "سوّ كوبون ٢٠٪ للباقة المتكاملة"
 * / "Make a 20% coupon for the Integrated package".
 */
export const generatePromoCode: AgentTool = {
  name: "generate_promo_code",
  description:
    "Create a discount promo code. Supports percentage discounts, fixed-amount (SAR) discounts, and free-months. Optionally restrict it to specific packages and set a usage limit and expiry date.",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description:
          "The promo code (3–32 letters/digits). If omitted, one is generated.",
      },
      type: {
        type: "string",
        enum: ["PERCENTAGE", "FIXED_AMOUNT", "FREE_MONTHS"],
        description: "Discount type.",
      },
      value: {
        type: "number",
        description:
          "Discount value: percent (PERCENTAGE), SAR amount (FIXED_AMOUNT), or month count (FREE_MONTHS).",
      },
      applicablePackages: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional package restriction (ESSENTIAL/INTEGRATED/PRIVATE). Empty = all packages.",
      },
      maxUses: {
        type: "number",
        description: "Optional total usage limit.",
      },
      expiresInDays: {
        type: "number",
        description: "Optional validity window in days from today.",
      },
    },
    required: ["type", "value"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (context.userRole !== "ADMIN" && context.userRole !== "SUPER_ADMIN") {
        return { error: "Admins only." };
      }

      const type = input.type as "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_MONTHS";
      const value = typeof input.value === "number" ? input.value : NaN;
      if (!["PERCENTAGE", "FIXED_AMOUNT", "FREE_MONTHS"].includes(type)) {
        return { error: "Invalid promo type." };
      }
      if (!Number.isFinite(value) || value <= 0) {
        return { error: "Value must be a positive number." };
      }
      if (type === "PERCENTAGE" && value > 100) {
        return { error: "Percentage cannot exceed 100." };
      }

      // Use the given code, or synthesise one.
      let code =
        typeof input.code === "string" && input.code.trim()
          ? input.code.trim().toUpperCase()
          : `HAJR${Math.floor(1000 + Math.random() * 9000)}`;
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
        return { error: "Code must be 3–32 letters, digits, - or _." };
      }
      const exists = await context.prisma.promoCode.findUnique({
        where: { code },
      });
      if (exists) {
        code = `${code}${Math.floor(10 + Math.random() * 89)}`;
      }

      const applicablePackages: PackageType[] = Array.isArray(
        input.applicablePackages
      )
        ? (input.applicablePackages as string[]).filter((p) =>
            PACKAGE_TYPES.includes(p as PackageType)
          ) as PackageType[]
        : [];

      const expiresAt =
        typeof input.expiresInDays === "number" && input.expiresInDays > 0
          ? new Date(Date.now() + input.expiresInDays * 86400_000)
          : null;

      const created = await context.prisma.promoCode.create({
        data: {
          code,
          type,
          value,
          maxUses:
            typeof input.maxUses === "number" ? input.maxUses : null,
          maxUsesPerUser: 1,
          applicablePackages,
          applicablePrograms: [],
          startsAt: new Date(),
          expiresAt,
          isActive: true,
          createdBy: context.userId ?? null,
        },
      });

      return {
        ok: true,
        code: created.code,
        type: created.type,
        value: Number(created.value),
        applicablePackages,
        maxUses: created.maxUses,
        expiresAt: created.expiresAt?.toISOString().slice(0, 10) ?? "no expiry",
        message: `Promo code ${created.code} created.`,
      };
    } catch (error) {
      return {
        error: `Failed to create promo code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
