import { prisma } from "@/lib/prisma";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  message?: string;
  messageAr?: string;
}

export async function checkRateLimit(opts: {
  userId?: string;
  userRole?: string;
  visitorId?: string;
}): Promise<RateLimitResult> {
  if (opts.userRole === "SUPER_ADMIN" || opts.userRole === "ADMIN") {
    return { allowed: true, remaining: Infinity };
  }

  if (opts.userId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await prisma.agentMessage.count({
      where: {
        conversation: { userId: opts.userId },
        role: "USER",
        createdAt: { gte: todayStart },
      },
    });
    const limit = 50;
    const remaining = Math.max(0, limit - count);
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        message: "You've reached your daily limit of 50 messages. It resets tomorrow.",
        messageAr: "حد الرسائل اليومي 50، يتجدد غداً",
      };
    }
    return { allowed: true, remaining };
  }

  if (opts.visitorId) {
    const count = await prisma.agentMessage.count({
      where: {
        conversation: {
          metadata: { path: ["visitorId"], equals: opts.visitorId },
        },
        role: "USER",
      },
    });
    const limit = 5;
    const remaining = Math.max(0, limit - count);
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        message: "You've used your 5 free messages. Sign up to continue!",
        messageAr: "لقد وصلت للحد اليومي. سجّل حساب للاستمرار",
      };
    }
    return { allowed: true, remaining };
  }

  return { allowed: false, remaining: 0, message: "Unauthorized" };
}
