// Reusable placeholder shown for routes whose CRUDs land in Phase 2+.
// Renders bilingual title + a "Coming in Phase X" hint.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export function PlaceholderPage({
  title,
  phase,
  description,
}: {
  title: string;
  phase: number;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Badge variant="info">Phase {phase}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">{description ?? "Module under construction"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This area is scheduled for Phase <span className="num">{phase}</span> of the build plan. Foundation is in place: schema, role-routing, auth and translations are wired.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
