"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, StopCircle, Pencil } from "lucide-react";
import { toast } from "sonner";

interface RoomRow {
  id: string;
  name: string;
  description: string | null;
  teacherName: string;
  className: string | null;
  isActive: boolean;
  archivedAt: string | null;
  totalEdits: number;
  lastEditedAt: string | null;
  createdAt: string;
}

export function AdminBlackboardsClient() {
  const t = useTranslations("Blackboard");
  const tc = useTranslations("Common");
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRooms = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/admin/blackboard/all?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRooms(data.rooms);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, [page, statusFilter]);

  const handleForceEnd = async (roomId: string) => {
    const res = await fetch(`/api/blackboard/${roomId}/end-session`, { method: "POST" });
    if (res.ok) {
      toast.success(t("sessionEnded"));
      fetchRooms();
    } else {
      toast.error(tc("error"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={tc("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="active">{tc("active")}</SelectItem>
            <SelectItem value="archived">{t("archived")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">{tc("loading")}</p>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {tc("noData")}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-start font-medium">{tc("name")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("teacher")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("linkedClass")}</th>
                <th className="px-3 py-2 text-start font-medium">{tc("status")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("edits")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("lastEdited")}</th>
                <th className="px-3 py-2 text-start font-medium">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.teacherName}</td>
                  <td className="px-3 py-2">{r.className ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.isActive ? (
                      <Badge className="bg-brand-mint text-brand-navy">{tc("active")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("archived")}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1">
                      <Pencil className="h-3 w-3" />{r.totalEdits}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.lastEditedAt ? new Date(r.lastEditedAt).toLocaleString("ar-SA") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => window.open(`/teacher/blackboard/${r.id}`, "_blank")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {r.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-destructive"
                          onClick={() => handleForceEnd(r.id)}
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {tc("previous")}
          </Button>
          <span className="text-sm text-muted-foreground py-1.5">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {tc("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
