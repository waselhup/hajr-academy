import { getPrograms } from "./get-programs";
import { getPackages } from "./get-packages";
import { bookTrial } from "./book-trial";
import { getFaq } from "./get-faq";
import { getMySchedule } from "./get-my-schedule";
import { getMyChildProgress } from "./get-my-child-progress";
import { getMyInvoices } from "./get-my-invoices";
import { explainEnglish } from "./explain-english";

export const publicTools = [
  getPrograms,
  getPackages,
  bookTrial,
  getFaq,
  getMySchedule,
  getMyChildProgress,
  getMyInvoices,
  explainEnglish,
];
