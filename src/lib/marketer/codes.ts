import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const code = randomCode(6);
    const existing = await prisma.marketerProfile.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  // fallback: longer code
  return randomCode(8);
}

export function isReferralCodeShape(code: string): boolean {
  return /^[A-Z2-9]{6,12}$/.test(code);
}

export async function resolveActiveMarketerByCode(code: string) {
  if (!isReferralCodeShape(code)) return null;
  return prisma.marketerProfile.findFirst({
    where: { referralCode: code, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}
