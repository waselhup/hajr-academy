import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Palette } from "lucide-react";
import { BrandKitClient, type BrandAsset } from "./brand-kit-client";

export const dynamic = "force-dynamic";

export default async function AdminBrandKitPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("BrandKit");

  let assets: BrandAsset[] = [];
  try {
    const rows = await prisma.brandKitAsset.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    assets = rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      nameAr: r.nameAr,
      category: r.category,
      url: r.url,
      downloadUrl: r.downloadUrl,
      description: r.description,
      descriptionAr: r.descriptionAr,
    }));
  } catch (e) {
    console.error("[admin-brand-kit] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-brand-navy">{t("pageTitle")}</h1>
      </div>
      <BrandKitClient assets={assets} />
    </div>
  );
}
