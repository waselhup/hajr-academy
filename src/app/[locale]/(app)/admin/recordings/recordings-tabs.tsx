"use client";

/**
 * Tab wrapper for /admin/recordings. Keeps the existing Zoom class-recordings
 * list (RecordingsClient) fully intact under one tab and adds the new
 * "Targeted uploads" panel (C7) under a second tab — additive, no changes to
 * the Zoom list itself.
 */
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Video, Send } from "lucide-react";
import { RecordingsClient, type RecordingRow } from "./recordings-client";
import { TargetedRecordingsAdmin, type TargetUser } from "./targeted-admin";

export function RecordingsTabs({
  rows,
  users,
}: {
  rows: RecordingRow[];
  users: TargetUser[];
}) {
  const t = useTranslations();

  return (
    <Tabs defaultValue="zoom" className="space-y-4">
      <TabsList>
        <TabsTrigger value="zoom" className="gap-2">
          <Video className="h-4 w-4" />
          {t("TargetedRecordings.tabZoom")}
        </TabsTrigger>
        <TabsTrigger value="targeted" className="gap-2">
          <Send className="h-4 w-4 rtl-flip" />
          {t("TargetedRecordings.tabTargeted")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="zoom">
        <RecordingsClient rows={rows} />
      </TabsContent>
      <TabsContent value="targeted">
        <TargetedRecordingsAdmin users={users} />
      </TabsContent>
    </Tabs>
  );
}
