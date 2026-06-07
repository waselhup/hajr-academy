/**
 * Owner batch 4C i18n — material URLs (F1), teacher→student evaluation (F3),
 * specific readiness tools (F4), teacher card/photo (F5/F6).
 *
 * Idempotent + lockstep (en.json & ar.json edited together → leaf parity held).
 *   node ./scripts/add-batch4c-i18n.js
 */
const fs = require("fs");
const path = require("path");

const MESSAGES = path.join(__dirname, "..", "src", "messages");
const enPath = path.join(MESSAGES, "en.json");
const arPath = path.join(MESSAGES, "ar.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));

function leaves(o) {
  let n = 0;
  for (const k in o) {
    if (o[k] && typeof o[k] === "object") n += leaves(o[k]);
    else n++;
  }
  return n;
}
const beforeEn = leaves(en);
function set(ns, key, enVal, arVal) {
  if (!en[ns]) en[ns] = {};
  if (!ar[ns]) ar[ns] = {};
  en[ns][key] = enVal;
  ar[ns][key] = arVal;
}

// ─────────────────── F1 — URL/link attachment (Assignments ns) ───────────────────
set("Assignments", "addLink", "Add a link", "إضافة رابط");
set("Assignments", "linkUrl", "Link URL", "رابط (URL)");
set("Assignments", "linkPlaceholder", "https://… (YouTube, Drive, website)", "https://… (يوتيوب، درايف، موقع)");
set("Assignments", "linkAdd", "Add link", "إضافة الرابط");
set("Assignments", "linkInvalid", "Enter a valid http(s) link", "أدخل رابط http(s) صحيح");
set("Assignments", "openLink", "Open link", "فتح الرابط");

// ─────────────────── F3 — Student evaluation ───────────────────
// New namespace "Evaluation" (teacher + admin share it).
set("Evaluation", "tab", "Evaluation", "التقييم");
set("Evaluation", "title", "Teacher evaluations", "تقييمات المعلّم");
set("Evaluation", "newTitle", "Evaluate student", "تقييم الطالب");
set("Evaluation", "evaluateAction", "Evaluate", "تقييم");
set("Evaluation", "skillLevel", "Skill level (CEFR)", "المستوى (CEFR)");
set("Evaluation", "participation", "Participation", "المشاركة");
set("Evaluation", "improvement", "Improvement", "التحسّن");
set("Evaluation", "imp_IMPROVED", "Improved", "تحسّن");
set("Evaluation", "imp_SAME", "Same", "ثابت");
set("Evaluation", "imp_DECLINED", "Declined", "تراجع");
set("Evaluation", "note", "Note (optional)", "ملاحظة (اختياري)");
set("Evaluation", "notePlaceholder", "Anything worth recording…", "أي ملاحظة تستحق التدوين…");
set("Evaluation", "save", "Save evaluation", "حفظ التقييم");
set("Evaluation", "saving", "Saving…", "جارٍ الحفظ…");
set("Evaluation", "savedOk", "Evaluation saved", "تم حفظ التقييم");
set("Evaluation", "saveFail", "Could not save the evaluation", "تعذّر حفظ التقييم");
set("Evaluation", "past", "Past evaluations", "التقييمات السابقة");
set("Evaluation", "none", "No evaluations yet.", "لا توجد تقييمات بعد.");
set("Evaluation", "by", "by", "بواسطة");
set("Evaluation", "selectClass", "Class (optional)", "الفصل (اختياري)");
set("Evaluation", "noClass", "No specific class", "بدون فصل محدّد");
set("Evaluation", "adminSectionTitle", "Teacher evaluations", "تقييمات المعلّمين");
set("Evaluation", "trend", "Trend", "الاتجاه");

// ─────────────────── F4 — specific interactive tools (Readiness ns) ───────────────────
set("Readiness", "toolsLabel", "Which interactive tools do you know?", "ما الأدوات التفاعلية التي تتقنها؟");
set("Readiness", "toolsHint", "Select all that apply.", "اختر كل ما ينطبق.");
set("Readiness", "toolsOther", "Other (specify)", "أخرى (حدّد)");
set("Readiness", "toolsOtherPlaceholder", "e.g. Nearpod, Padlet…", "مثال: Nearpod، Padlet…");
set("Readiness", "toolsNone", "None specified", "لم تُحدَّد أدوات");
set("Readiness", "toolsSpecified", "Tools specified", "الأدوات المحدّدة");
// Tool labels (names stay in Latin in both languages — they are brand names).
set("Readiness", "tool_ZOOM", "Zoom", "Zoom");
set("Readiness", "tool_WORDWALL", "Wordwall", "Wordwall");
set("Readiness", "tool_KAHOOT", "Kahoot", "Kahoot");
set("Readiness", "tool_BAMBOOZLE", "Bamboozle", "Bamboozle");
set("Readiness", "tool_CANVA", "Canva", "Canva");
set("Readiness", "tool_MIRO", "Miro", "Miro");
set("Readiness", "tool_QUIZIZZ", "Quizizz", "Quizizz");
set("Readiness", "tool_GOOGLE_WORKSPACE", "Google Workspace", "Google Workspace");
set("Readiness", "tool_WHITEBOARD", "Whiteboard tools", "أدوات السبورة");

// ─────────────────── F5/F6 — teacher card + photo ───────────────────
set("TeacherProfile", "photo", "Profile photo", "الصورة الشخصية");
set("TeacherProfile", "uploadPhoto", "Upload photo", "رفع صورة");
set("TeacherProfile", "changePhoto", "Change photo", "تغيير الصورة");
set("TeacherProfile", "photoHint", "JPG, PNG or WebP — up to 5 MB.", "JPG أو PNG أو WebP — حتى 5 ميجابايت.");
set("TeacherProfile", "photoUploaded", "Photo updated", "تم تحديث الصورة");
set("TeacherProfile", "photoError", "Could not upload the photo", "تعذّر رفع الصورة");
set("Classes", "teacherLabel", "Teacher", "المعلّم");

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + "\n", "utf8");

const afterEn = leaves(en);
const afterAr = leaves(ar);
console.log(`en: ${beforeEn} -> ${afterEn} (+${afterEn - beforeEn}); ar -> ${afterAr}`);
if (afterEn !== afterAr) {
  console.error("❌ PARITY BROKEN");
  process.exit(1);
}
console.log("✓ AR === EN parity preserved.");
