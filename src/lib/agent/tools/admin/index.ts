import { queryStudents } from "./query-students";
import { queryTeachers } from "./query-teachers";
import { queryClasses } from "./query-classes";
import { queryInvoices } from "./query-invoices";
import { getRevenueStats } from "./get-revenue-stats";
import { getAtRiskStudents } from "./get-at-risk-students";
import { getClassSummary } from "./get-class-summary";
import { analyzeAttendance } from "./analyze-attendance";
import { draftMessage } from "./draft-message";
import { generateMarketing } from "./generate-marketing";
import { querySchedule } from "./query-schedule";
import { getDashboardStats } from "./get-dashboard-stats";
import { queryBlackboards } from "./query-blackboards";
import { queryLabProgress } from "./query-lab-progress";
import { queryWeakTopics } from "./query-weak-topics";
import { recommendExercisesTool } from "./recommend-exercises";
import { generateLabContent } from "./generate-lab-content";
import { sendMessage } from "./send-message";
import { queryMessageStats } from "./query-message-stats";
import { broadcastAnnouncement } from "./broadcast-announcement";
import { queryFailedMessages } from "./query-failed-messages";

export const adminTools = [
  queryStudents,
  queryTeachers,
  queryClasses,
  queryInvoices,
  getRevenueStats,
  getAtRiskStudents,
  getClassSummary,
  analyzeAttendance,
  draftMessage,
  generateMarketing,
  querySchedule,
  getDashboardStats,
  queryBlackboards,
  queryLabProgress,
  queryWeakTopics,
  recommendExercisesTool,
  generateLabContent,
  sendMessage,
  queryMessageStats,
  broadcastAnnouncement,
  queryFailedMessages,
];
