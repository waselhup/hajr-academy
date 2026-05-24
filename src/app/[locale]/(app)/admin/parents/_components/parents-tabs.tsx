"use client";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ParentsClient } from "./parents-client";
import { AdminParentInvitesClient } from "../../parent-invites/parent-invites-client";

export function ParentsTabs({
  initialTab,
  parents,
  total,
  page,
  pageSize,
  students,
  invites,
  inviteStudents,
}: {
  initialTab: "parents" | "invites";
  parents: any[];
  total: number;
  page: number;
  pageSize: number;
  students: { id: string; name: string; nameAr: string | null }[];
  invites: any[];
  inviteStudents: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [tab, setTab] = useState<"parents" | "invites">(initialTab);

  const onTabChange = (v: string) => {
    setTab(v as any);
    const p = new URLSearchParams(sp.toString());
    if (v === "parents") p.delete("tab");
    else p.set("tab", v);
    router.replace(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="parents">{t("Nav.parents")}</TabsTrigger>
          <TabsTrigger value="invites">{t("Nav.parentInvites")}</TabsTrigger>
        </TabsList>

        <TabsContent value="parents" className="mt-4">
          <ParentsClient
            rows={parents}
            total={total}
            page={page}
            pageSize={pageSize}
            students={students}
          />
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          <AdminParentInvitesClient
            invites={invites}
            students={inviteStudents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
