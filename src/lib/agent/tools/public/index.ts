import { getPrograms } from "./get-programs";
import { getPackages } from "./get-packages";
import { bookTrial } from "./book-trial";
import { getFaq } from "./get-faq";
import { getMySchedule } from "./get-my-schedule";
import { getMyChildProgress } from "./get-my-child-progress";
import { getMyInvoices } from "./get-my-invoices";
import { explainEnglish } from "./explain-english";
import { getMySkillLevels } from "./get-my-skill-levels";
import { recommendNextExercise } from "./recommend-next-exercise";
import { explainQuestion } from "./explain-question";
import { practiceTopic } from "./practice-topic";
import { checkMyMessages } from "./check-my-messages";
import { updateMyNotifications } from "./update-my-notifications";
import { checkMyBilling } from "./check-my-billing";
import { applyPromoCode } from "./apply-promo-code";

export const publicTools = [
  getPrograms,
  getPackages,
  bookTrial,
  getFaq,
  getMySchedule,
  getMyChildProgress,
  getMyInvoices,
  explainEnglish,
  getMySkillLevels,
  recommendNextExercise,
  explainQuestion,
  practiceTopic,
  checkMyMessages,
  updateMyNotifications,
  // Phase 8 — finance
  checkMyBilling,
  applyPromoCode,
];
