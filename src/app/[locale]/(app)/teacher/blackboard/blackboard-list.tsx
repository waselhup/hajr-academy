"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { fmtDateLong } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Archive, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  description: string | null;
  totalEdits: number;
  isActive: boolean;
  archivedAt: string | null;
  updatedAt: string;
  createdAt: string;
  session: { class: { name: string; id: string } | null } | null;
}

export function TeacherBlackboardList({
  active,
  archived,
}: {
  active: Room[];
  archived: Room[];
}) {
  const t = useTranslations("Blackboard");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/teacher/blackboard/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(t("createSuccess"));
      setCreateOpen(false);
      setName("");
      setDesc("");
      router.push(`/teacher/blackboard/${data.roomId}`);
    } else {
      toast.error(tc("error"));
    }
    setCreating(false);
  };

  const renderCard = (room: Room) => (
    <Card key={room.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{room.name}</CardTitle>
          {room.isActive ? (
            <Badge variant="default" className="bg-brand-mint text-brand-navy">{tc("active")}</Badge>
          ) : (
            <Badge variant="outline">{t("archived")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {room.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
        )}
        {room.session?.class && (
          <Badge variant="outline" className="text-xs">{room.session.class.name}</Badge>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span><Pencil className="inline h-3 w-3 me-1" />{room.totalEdits} {t("edits")}</span>
          <span>{fmtDateLong(room.updatedAt, locale === "ar" ? "ar" : "en")}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => router.push(`/teacher/blackboard/${room.id}`)}
        >
          <ExternalLink className="h-3.5 w-3.5 me-1.5" />
          {tc("open")}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setCreateOpen(true)} className="bg-hajr-deep-navy hover:bg-hajr-deep-navy/90 text-white">
          <Plus className="h-4 w-4 me-1.5" />
          {t("newBoard")}
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t("activeTab")} ({active.length})</TabsTrigger>
          <TabsTrigger value="archived"><Archive className="h-3.5 w-3.5 me-1" />{t("archivedTab")} ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          {active.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg font-medium mb-2">{t("emptyTitle")}</p>
                <p className="text-muted-foreground text-sm mb-4">{t("emptyDesc")}</p>
                <Button onClick={() => setCreateOpen(true)} className="bg-hajr-deep-navy hover:bg-hajr-deep-navy/90 text-white">
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("newBoard")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {active.map(renderCard)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="archived" className="mt-4">
          {archived.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("noArchived")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {archived.map(renderCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newBoard")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tc("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("boardNamePlaceholder")} />
            </div>
            <div>
              <Label>{t("description")}</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("boardDescPlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()} className="bg-hajr-deep-navy text-white">
              {creating ? tc("saving") : tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
