/**
 * Lifecycle trigger functions.
 *
 * Each function is called from the relevant point in the codebase (or the
 * cron tick) and translates a domain event into a `dispatch()` call with
 * the right template, variables, channels, and recipients.
 *
 * All are defensive — a failure here must never break the calling flow,
 * so callers wrap them in try/catch and these functions also swallow
 * their own lookup errors.
 */
import { prisma } from "@/lib/prisma";
import { dispatch } from "./dispatcher";
import { fmtRiyadh } from "@/lib/format";

/** 30-minute-before reminder for a class session → enrolled students. */
export async function triggerClassReminder(classSessionId: string) {
  const cs = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      class: {
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
    },
  });
  if (!cs) return { sent: 0, failed: 0 };

  const when = fmtRiyadh(cs.scheduledDate, "HH:mm");
  await dispatch({
    toClassId: cs.classId,
    trigger: "CLASS_REMINDER",
    templateKey: "class_reminder_student",
    priority: "HIGH",
    variables: {
      className: cs.class.nameAr ?? cs.class.name,
      teacherName: cs.class.teacher.user.name,
      startTime: when,
    },
    actionUrl: "/student",
  });

  // Also notify the parents of those students.
  const studentIds = cs.class.enrollments.map((e) => e.studentId);
  const parentLinks = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: studentIds } },
    include: { parent: { select: { userId: true } } },
  });
  for (const link of parentLinks) {
    await dispatch({
      toUserId: link.parent.userId,
      trigger: "CLASS_REMINDER",
      templateKey: "class_reminder_parent",
      priority: "NORMAL",
      variables: {
        className: cs.class.nameAr ?? cs.class.name,
        teacherName: cs.class.teacher.user.name,
        startTime: when,
      },
      actionUrl: "/parent",
    });
  }
  return { ok: true };
}

/** A class session was cancelled → notify enrolled students. */
export async function triggerClassCancelled(classSessionId: string) {
  const cs = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: { class: { select: { name: true, nameAr: true, id: true } } },
  });
  if (!cs) return;
  await dispatch({
    toClassId: cs.classId,
    trigger: "CLASS_STARTING",
    templateKey: "class_cancelled",
    notificationType: "CLASS_CANCELLED",
    priority: "HIGH",
    variables: {
      className: cs.class.nameAr ?? cs.class.name,
      sessionDate: fmtRiyadh(cs.scheduledDate, "yyyy-MM-dd HH:mm"),
    },
    actionUrl: "/student",
  });
}

/** An invoice is due → notify the student. */
export async function triggerPaymentDue(invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: { select: { userId: true } } },
  });
  if (!inv) return;
  await dispatch({
    toUserId: inv.student.userId,
    trigger: "PAYMENT_DUE",
    templateKey: "payment_due",
    priority: "HIGH",
    variables: {
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.totalSar).toFixed(2),
      dueDate: fmtRiyadh(inv.dueDate, "yyyy-MM-dd"),
    },
    actionUrl: "/student/finance",
  });
}

/** An invoice is overdue → reminder to the student. */
export async function triggerPaymentOverdue(invoiceId: string, daysOverdue: number) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: { select: { userId: true } } },
  });
  if (!inv) return;
  await dispatch({
    toUserId: inv.student.userId,
    trigger: "PAYMENT_DUE",
    templateKey: "payment_overdue",
    notificationType: "PAYMENT_DUE",
    priority: "URGENT",
    variables: {
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.totalSar).toFixed(2),
      daysOverdue: String(daysOverdue),
    },
    actionUrl: "/student/finance",
  });
}

/** A payment was received → thank-you / receipt to the student. */
export async function triggerPaymentReceived(invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: { select: { userId: true } } },
  });
  if (!inv) return;
  await dispatch({
    toUserId: inv.student.userId,
    trigger: "PAYMENT_RECEIVED",
    templateKey: "payment_received",
    priority: "NORMAL",
    variables: {
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.totalSar).toFixed(2),
    },
    actionUrl: "/student/billing",
  });
}

/** A payment attempt failed → ask the student to update their card. */
export async function triggerPaymentFailed(invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: { select: { userId: true } } },
  });
  if (!inv) return;
  await dispatch({
    toUserId: inv.student.userId,
    trigger: "PAYMENT_DUE",
    templateKey: "payment_failed",
    notificationType: "PAYMENT_DUE",
    priority: "URGENT",
    channels: ["EMAIL", "SMS", "IN_APP"],
    variables: {
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.totalSar).toFixed(2),
    },
    actionUrl: `/student/billing/pay/${inv.id}`,
  });
}

/** An invoice was created → send the invoice + amount to the student. */
export async function triggerInvoiceCreated(invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: { select: { userId: true } } },
  });
  if (!inv) return;
  await dispatch({
    toUserId: inv.student.userId,
    trigger: "PAYMENT_DUE",
    templateKey: "invoice_created",
    notificationType: "PAYMENT_DUE",
    priority: "NORMAL",
    channels: ["EMAIL", "IN_APP"],
    variables: {
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.totalSar).toFixed(2),
      dueDate: fmtRiyadh(inv.dueDate, "yyyy-MM-dd"),
    },
    actionUrl: `/student/billing/pay/${inv.id}`,
  });
}

/** A subscription was cancelled → confirmation to the student. */
export async function triggerSubscriptionCancelled(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { student: { select: { userId: true } } },
  });
  if (!sub) return;
  await dispatch({
    toUserId: sub.student.userId,
    trigger: "PAYMENT_RECEIVED",
    templateKey: "subscription_cancelled",
    notificationType: "SYSTEM_ANNOUNCEMENT",
    priority: "NORMAL",
    channels: ["EMAIL", "IN_APP"],
    variables: {
      endDate: fmtRiyadh(sub.currentPeriodEnd, "yyyy-MM-dd"),
    },
    actionUrl: "/student/billing",
  });
}

/** A subscription renews in N days → heads-up to the student. */
export async function triggerSubscriptionExpiring(
  subscriptionId: string,
  daysUntil: number
) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { student: { select: { userId: true } } },
  });
  if (!sub) return;
  await dispatch({
    toUserId: sub.student.userId,
    trigger: "PAYMENT_DUE",
    templateKey: "subscription_expiring",
    notificationType: "PAYMENT_DUE",
    priority: "NORMAL",
    channels: ["EMAIL", "IN_APP"],
    variables: {
      daysUntil: String(daysUntil),
      renewDate: fmtRiyadh(sub.currentPeriodEnd, "yyyy-MM-dd"),
      amount: Number(sub.totalWithVat).toFixed(2),
    },
    actionUrl: "/student/billing",
  });
}

/** A new trial request → notify all admins. */
export async function triggerTrialRequestReceived(trialId: string) {
  const trial = await prisma.trialRequest.findUnique({ where: { id: trialId } });
  if (!trial) return;
  await dispatch({
    toRole: "ADMIN",
    trigger: "TRIAL_REQUEST",
    templateKey: "trial_request_admin",
    priority: "HIGH",
    channels: ["EMAIL", "SMS", "IN_APP"],
    variables: {
      name: trial.name,
      phone: trial.phone,
      program: trial.preferredProgram ?? "—",
    },
    actionUrl: "/admin/trials",
  });
  // Also notify SUPER_ADMINs.
  await dispatch({
    toRole: "SUPER_ADMIN",
    trigger: "TRIAL_REQUEST",
    templateKey: "trial_request_admin",
    priority: "HIGH",
    channels: ["EMAIL", "IN_APP"],
    variables: {
      name: trial.name,
      phone: trial.phone,
      program: trial.preferredProgram ?? "—",
    },
    actionUrl: "/admin/trials",
  });
}

/** Welcome email when a new user signs up. */
export async function triggerWelcomeEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return;
  const isParent = user.role === "PARENT";
  await dispatch({
    toUserId: userId,
    trigger: "WELCOME",
    templateKey: isParent ? "welcome_parent" : "welcome_student",
    priority: "NORMAL",
    channels: ["EMAIL", "IN_APP"],
    actionUrl: isParent ? "/parent" : "/student",
  });
}

/** A teacher was assigned to a class. */
export async function triggerTeacherAssigned(teacherUserId: string, className: string) {
  await dispatch({
    toUserId: teacherUserId,
    trigger: "TEACHER_ASSIGNED",
    templateKey: "teacher_assigned",
    priority: "NORMAL",
    channels: ["EMAIL", "IN_APP"],
    variables: { className },
    actionUrl: "/teacher/classes",
  });
}

/** A student was enrolled in a class. */
export async function triggerEnrollmentConfirmed(
  studentUserId: string,
  className: string
) {
  await dispatch({
    toUserId: studentUserId,
    trigger: "ENROLLMENT_CONFIRMED",
    templateKey: "enrollment_confirmed",
    notificationType: "ENROLLMENT_UPDATE",
    priority: "NORMAL",
    channels: ["EMAIL", "IN_APP"],
    variables: { className },
    actionUrl: "/student/classes",
  });
}

/** A student's attendance was marked absent → notify their parents. */
export async function triggerAttendanceAlert(
  studentProfileId: string,
  studentName: string
) {
  const links = await prisma.parentStudentLink.findMany({
    where: { studentId: studentProfileId },
    include: { parent: { select: { userId: true } } },
  });
  for (const link of links) {
    await dispatch({
      toUserId: link.parent.userId,
      trigger: "ATTENDANCE_MARKED",
      templateKey: "attendance_alert_parent",
      priority: "HIGH",
      variables: { studentName },
      actionUrl: "/parent",
    });
  }
}

/** Lab feedback (AI grading) is ready → in-app notification to the student. */
export async function triggerLabFeedbackReady(
  studentUserId: string,
  exerciseTitle: string,
  exerciseId: string
) {
  await dispatch({
    toUserId: studentUserId,
    trigger: "LAB_FEEDBACK",
    templateKey: "lab_feedback_ready",
    priority: "NORMAL",
    channels: ["IN_APP", "EMAIL"],
    variables: { exerciseTitle },
    actionUrl: `/student/lab/exercise/${exerciseId}`,
  });
}

/** STEP exam results are ready → notification to the student. */
export async function triggerExamResultReady(
  studentUserId: string,
  examTitle: string,
  attemptId: string
) {
  await dispatch({
    toUserId: studentUserId,
    trigger: "EXAM_RESULT",
    templateKey: "exam_result_ready",
    priority: "NORMAL",
    channels: ["IN_APP", "EMAIL"],
    variables: { examTitle },
    actionUrl: `/student/exams/results/${attemptId}`,
  });
}
