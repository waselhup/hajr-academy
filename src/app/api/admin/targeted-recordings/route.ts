import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminish } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/targeted-recordings — admin-gated list of the targeted
 * recordings the current admin uploaded, each with a viewer count and how
 * many of those viewers have watched it. No signed URLs here (list view).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminish(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await prisma.targetedRecording.findMany({
      where: { uploadedById: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        titleAr: true,
        description: true,
        descriptionAr: true,
        mimeType: true,
        sizeBytes: true,
        durationSec: true,
        createdAt: true,
        _count: { select: { viewers: true } },
        viewers: { where: { viewedAt: { not: null } }, select: { id: true } },
      },
    });

    const recordings = rows.map((r) => ({
      id: r.id,
      title: r.title,
      titleAr: r.titleAr,
      description: r.description,
      descriptionAr: r.descriptionAr,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      durationSec: r.durationSec,
      createdAt: r.createdAt.toISOString(),
      viewerCount: r._count.viewers,
      viewedCount: r.viewers.length,
    }));

    return NextResponse.json({ recordings });
  } catch (e) {
    console.error("[api/admin/targeted-recordings] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
