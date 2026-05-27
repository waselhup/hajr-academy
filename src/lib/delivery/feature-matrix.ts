/**
 * Feature completion matrix — single source of truth used by:
 *   - /delivery/FEATURE-MATRIX.csv (static doc)
 *   - GET /api/admin/delivery/feature-matrix.csv (live download)
 *
 * Status values: DONE | PARTIAL | DEFERRED
 */
export interface FeatureRow {
  feature: string;
  sprint: number;
  status: "DONE" | "PARTIAL" | "DEFERRED";
  url: string;
  notes: string;
  verifiedBy: string;
}

export const FEATURE_MATRIX: FeatureRow[] = [
  // Sprint 1
  { feature: "Auth + RBAC (6 roles)", sprint: 1, status: "DONE", url: "/login", notes: "next-auth v5 + Prisma adapter", verifiedBy: "owner" },
  { feature: "Calendar (unified events)", sprint: 1, status: "DONE", url: "/calendar", notes: "Role-scoped views", verifiedBy: "owner" },
  { feature: "Notify primitive", sprint: 1, status: "DONE", url: "—", notes: "inApp + email + SMS", verifiedBy: "owner" },
  { feature: "Audit log", sprint: 1, status: "DONE", url: "/admin/audit-log", notes: "All mutations tracked", verifiedBy: "owner" },
  { feature: "Class reminders cron", sprint: 1, status: "DONE", url: "/api/cron/class-reminders", notes: "24h + 1h with parent fan-out", verifiedBy: "owner" },

  // Sprint 2
  { feature: "Marketer role + referrals", sprint: 2, status: "DONE", url: "/marketer", notes: "Unique ref codes", verifiedBy: "owner" },
  { feature: "Lead pipeline", sprint: 2, status: "DONE", url: "/admin/marketers", notes: "NEW/CONTACTED/CONVERTED", verifiedBy: "owner" },
  { feature: "Commission engine", sprint: 2, status: "DONE", url: "/admin/marketers/commissions", notes: "15% default, PENDING→PAID", verifiedBy: "owner" },
  { feature: "Placement test", sprint: 2, status: "DONE", url: "/placement-test", notes: "Auto-scored, CEFR mapped", verifiedBy: "owner" },

  // Sprint 3
  { feature: "Tickets / Support", sprint: 3, status: "DONE", url: "/tickets", notes: "SLA + Claude triage", verifiedBy: "owner" },
  { feature: "Public teacher profiles", sprint: 3, status: "DONE", url: "/teachers", notes: "Bio, rating, samples", verifiedBy: "owner" },
  { feature: "Monthly teacher meetings", sprint: 3, status: "DONE", url: "/admin/teacher-meetings", notes: "Agenda + RSVP", verifiedBy: "owner" },
  { feature: "Teacher readiness check", sprint: 3, status: "DONE", url: "/teacher/readiness", notes: "Pre-class verification", verifiedBy: "owner" },

  // Sprint 4
  { feature: "Parent monthly reports", sprint: 4, status: "DONE", url: "/parent/reports", notes: "PDF + share image", verifiedBy: "owner" },
  { feature: "Speaking Club", sprint: 4, status: "DONE", url: "/speaking-club", notes: "RSVP + capacity + reminders", verifiedBy: "owner" },
  { feature: "Certificates + QR verify", sprint: 4, status: "DONE", url: "/admin/certificates", notes: "Issue + revoke", verifiedBy: "owner" },
  { feature: "Payment requests", sprint: 4, status: "DONE", url: "/admin/payment-requests", notes: "Self-service teacher + marketer", verifiedBy: "owner" },

  // Sprint 5
  { feature: "AI Lesson Summaries", sprint: 5, status: "DONE", url: "/admin/recordings", notes: "Claude Haiku, auto + manual", verifiedBy: "owner" },
  { feature: "Transcript search", sprint: 5, status: "PARTIAL", url: "/admin/recordings", notes: "Search works; Zoom transcript fetch best-effort", verifiedBy: "owner" },
  { feature: "Brand Book PDF", sprint: 5, status: "DONE", url: "/admin/brand-kit", notes: "10-page bilingual", verifiedBy: "owner" },
  { feature: "Brand asset library", sprint: 5, status: "DONE", url: "/admin/brand-kit", notes: "Categorized downloads + send-to-designer", verifiedBy: "owner" },
  { feature: "Teacher Validation Mode", sprint: 5, status: "DONE", url: "/admin/validation", notes: "12 tabs + PDF export", verifiedBy: "owner" },
  { feature: "Auto Client Presentation", sprint: 5, status: "DONE", url: "/admin/delivery", notes: "PPTX + PDF with live stats", verifiedBy: "owner" },
  { feature: "QA Sweep Tools", sprint: 5, status: "DONE", url: "/admin/qa/notifications", notes: "notification + audit + i18n coverage", verifiedBy: "owner" },
  { feature: "Handover Documentation", sprint: 5, status: "DONE", url: "/delivery/README.md", notes: "README, RUNBOOK, FEATURE-MATRIX, CHECKLIST", verifiedBy: "owner" },
];

export function toCsv(): string {
  const header = ["Feature", "Sprint", "Status", "URL", "Notes", "Verified By"];
  const escCell = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const rows = FEATURE_MATRIX.map((r) =>
    [r.feature, String(r.sprint), r.status, r.url, r.notes, r.verifiedBy]
      .map(escCell)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}
