/**
 * When a guest signs up with an email matching prior PlacementAttempt
 * rows, link those attempts to their new StudentProfile. Call after
 * user creation in the register route.
 */
import { prisma } from "@/lib/prisma";

export async function linkGuestPlacementAttempts(
  email: string,
  studentId: string
): Promise<number> {
  if (!email || !studentId) return 0;
  const updated = await prisma.placementAttempt.updateMany({
    where: { guestEmail: email.toLowerCase(), studentId: null },
    data: { studentId },
  });
  return updated.count;
}
