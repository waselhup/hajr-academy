"use client";
import { ClassesClient } from "./classes-client";

// NOTE (F2, owner batch 4A): the in-page Classes⇄Attendance tab jump was removed
// — Attendance is now reached ONLY from the sidebar (/admin/attendance). This
// component renders the Classes table alone; the old AttendanceTab + its Tabs
// shell were deleted to remove that navigation path entirely. The row type is
// kept exported for any future reuse / external import.
export type AttendanceSummaryRow = {
  sessionId: string;
  classId: string;
  className: string;
  cohortCode: string;
  scheduledDate: string;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  marked: number;
  status: string;
};

export function ClassesTabs({
  classRows,
  total,
  page,
  pageSize,
  programs,
  teachers,
}: {
  classRows: any[];
  total: number;
  page: number;
  pageSize: number;
  programs: any[];
  teachers: any[];
}) {
  return (
    <ClassesClient
      rows={classRows}
      total={total}
      page={page}
      pageSize={pageSize}
      programs={programs}
      teachers={teachers}
    />
  );
}
