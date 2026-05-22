import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { processRefund } from "@/lib/finance/payments";

/**
 * Admin tool — "رجّع لأحمد ١٠٠ ريال" / "Refund Ahmed 100 SAR".
 *
 * Requires explicit confirmation: the first call (confirm:false) returns a
 * preview; only a second call with confirm:true actually issues the refund.
 */
export const processRefundTool: AgentTool = {
  name: "process_refund",
  description:
    "Refund a payment, fully or partially, by invoice number. ALWAYS call first with confirm=false to preview the refund and show it to the admin; only call with confirm=true after the admin explicitly approves. Refund amount may not exceed the paid amount.",
  input_schema: {
    type: "object",
    properties: {
      invoiceNumber: {
        type: "string",
        description: "The invoice number, e.g. HAJR-2026-000123",
      },
      amount: {
        type: "number",
        description:
          "Refund amount in SAR. Omit for a full refund of the remaining balance.",
      },
      reason: {
        type: "string",
        description: "Reason for the refund (recorded on the payment).",
      },
      confirm: {
        type: "boolean",
        description:
          "false (default) = preview only; true = actually issue the refund. Only set true after explicit admin approval.",
      },
    },
    required: ["invoiceNumber"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (context.userRole !== "ADMIN" && context.userRole !== "SUPER_ADMIN") {
        return { error: "Admins only." };
      }

      const invoiceNumber =
        typeof input.invoiceNumber === "string"
          ? input.invoiceNumber.trim()
          : "";
      if (!invoiceNumber) {
        return { error: "invoiceNumber is required." };
      }
      const amount =
        typeof input.amount === "number" ? input.amount : undefined;
      const reason =
        typeof input.reason === "string" ? input.reason : undefined;
      const confirm = input.confirm === true;

      const invoice = await context.prisma.invoice.findUnique({
        where: { invoiceNumber },
        include: {
          student: { include: { user: { select: { name: true } } } },
          payments: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!invoice) {
        return { error: `Invoice ${invoiceNumber} not found.` };
      }

      // Pick the most recent settled payment for this invoice.
      const payment = invoice.payments.find(
        (p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED"
      );
      if (!payment) {
        return {
          error: `Invoice ${invoiceNumber} has no refundable payment.`,
        };
      }

      const paid = Number(payment.amount);
      const alreadyRefunded = Number(payment.refundedAmount);
      const refundable = +(paid - alreadyRefunded).toFixed(2);
      const requested = amount ?? refundable;

      if (requested > refundable) {
        return {
          error: `Refund amount (${requested} SAR) exceeds the refundable balance (${refundable} SAR).`,
        };
      }

      // Preview step — do not mutate anything.
      if (!confirm) {
        return {
          preview: true,
          requiresConfirmation: true,
          message: `This will refund ${requested.toFixed(
            2
          )} SAR for invoice ${invoiceNumber} (student: ${
            invoice.student.user.name
          }). Confirm to proceed.`,
          invoiceNumber,
          studentName: invoice.student.user.name,
          refundAmountSar: requested,
          refundableBalanceSar: refundable,
        };
      }

      const result = await processRefund({
        paymentId: payment.id,
        amountSar: amount,
        reason,
      });
      if (!result.ok) {
        return { error: result.error };
      }
      return {
        ok: true,
        refundedSar: result.refundedAmount,
        invoiceNumber,
        studentName: invoice.student.user.name,
        mock: result.mock,
        message: `Refunded ${result.refundedAmount?.toFixed(
          2
        )} SAR for invoice ${invoiceNumber}.`,
      };
    } catch (error) {
      return {
        error: `Refund failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
