import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const session = await requireRole("MARKETER");
  const body = await req.json();
  const bankIban = body.bankIban ? String(body.bankIban).trim() : null;
  const bankName = body.bankName ? String(body.bankName).trim() : null;
  const bankHolder = body.bankHolder ? String(body.bankHolder).trim() : null;

  if (bankIban && (bankIban.length < 10 || bankIban.length > 64)) {
    return NextResponse.json({ error: "Invalid IBAN" }, { status: 400 });
  }

  const profile = await prisma.marketerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const updated = await prisma.marketerProfile.update({
    where: { id: profile.id },
    data: { bankIban, bankName, bankHolder },
  });

  await audit.mutation(session.user.id, "MARKETER_BANK_UPDATED", "MarketerProfile", profile.id, {
    bankIban: !!bankIban,
    bankName: !!bankName,
  });

  return NextResponse.json({ ok: true, profile: { id: updated.id } });
}
