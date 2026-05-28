/**
 * UserSession bookkeeping — open / extend / sweep.
 * Best-effort: errors are swallowed because this is observability, not the
 * critical path.
 */
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const INACTIVITY_MIN = 30;

export async function openSession(params: {
  userId: string;
  role: Role;
  ipHash: string | null;
  userAgentHash: string | null;
}): Promise<string | null> {
  try {
    const row = await prisma.userSession.create({
      data: {
        userId: params.userId,
        role: params.role,
        ipHash: params.ipHash,
        userAgentHash: params.userAgentHash,
      },
    });
    return row.id;
  } catch {
    return null;
  }
}

export async function endStaleSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - INACTIVITY_MIN * 60_000);
  try {
    const stale = await prisma.userSession.findMany({
      where: { endedAt: null, startedAt: { lt: cutoff } },
      include: {
        pageVisits: {
          orderBy: { enteredAt: "desc" },
          take: 1,
          select: { enteredAt: true, leftAt: true },
        },
      },
      take: 200,
    });
    let n = 0;
    for (const s of stale) {
      const lastPv = s.pageVisits[0];
      const lastTime = lastPv?.leftAt ?? lastPv?.enteredAt ?? s.startedAt;
      if (lastTime.getTime() > cutoff.getTime()) continue;
      await prisma.userSession
        .update({
          where: { id: s.id },
          data: {
            endedAt: lastTime,
            durationSec: Math.max(
              0,
              Math.floor((lastTime.getTime() - s.startedAt.getTime()) / 1000)
            ),
          },
        })
        .catch(() => {});
      n++;
    }
    return n;
  } catch {
    return 0;
  }
}
