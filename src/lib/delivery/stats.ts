/**
 * Live delivery stats — pulled at presentation-generation time so the
 * deck always reflects current DB state.
 */
import { prisma } from "@/lib/prisma";

export interface DeliveryStats {
  students: number;
  teachers: number;
  parents: number;
  marketers: number;
  classes: number;
  sessions: number;
  recordings: number;
  lessonSummaries: number;
  tickets: number;
  certificates: number;
  parentReports: number;
  commissionsApprovedSar: number;
  paymentRequests: number;
  routesEstimate: number;
}

export async function loadDeliveryStats(): Promise<DeliveryStats> {
  // Run as many in parallel as we can.
  const [
    students,
    teachers,
    parents,
    marketers,
    classes,
    sessions,
    recordings,
    lessonSummaries,
    tickets,
    certificates,
    parentReports,
    commissionsAgg,
    paymentRequests,
  ] = await Promise.all([
    prisma.studentProfile.count().catch(() => 0),
    prisma.teacherProfile.count().catch(() => 0),
    prisma.parentProfile.count().catch(() => 0),
    prisma.marketerProfile.count().catch(() => 0),
    prisma.class.count().catch(() => 0),
    prisma.classSession.count().catch(() => 0),
    prisma.classSession.count({ where: { zoomRecordingUrl: { not: null } } }).catch(() => 0),
    prisma.lessonSummary.count().catch(() => 0),
    prisma.ticket.count().catch(() => 0),
    prisma.certificate.count().catch(() => 0),
    prisma.parentReport.count().catch(() => 0),
    prisma.commission
      .aggregate({
        _sum: { amount: true },
        where: { status: { in: ["APPROVED", "PAID"] } },
      })
      .catch(() => ({ _sum: { amount: null } } as any)),
    prisma.paymentRequest.count().catch(() => 0),
  ]);

  const commissionsApprovedSar = commissionsAgg?._sum?.amount
    ? Number(commissionsAgg._sum.amount)
    : 0;

  return {
    students,
    teachers,
    parents,
    marketers,
    classes,
    sessions,
    recordings,
    lessonSummaries,
    tickets,
    certificates,
    parentReports,
    commissionsApprovedSar,
    paymentRequests,
    routesEstimate: 0, // filled in from build report if available
  };
}
