/**
 * Owner batch 4B — Success Partner i18n.
 *
 * Display-only rename of "School Partner / Partner School" → "Success Partner"
 * (شريك النجاح) + new keys for the 3 partner types, the promo "organization"
 * select, the marketer credential popup, and the student promo column.
 *
 * Idempotent: re-running just re-asserts the same values. Edits ar.json and
 * en.json IN LOCKSTEP so leaf-key parity is preserved.
 *
 *   node ./scripts/add-batch4b-i18n.js
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
const beforeAr = leaves(ar);

/** Set en[ns][key]=enVal and ar[ns][key]=arVal, creating the namespace if new. */
function set(ns, key, enVal, arVal) {
  if (!en[ns]) en[ns] = {};
  if (!ar[ns]) ar[ns] = {};
  en[ns][key] = enVal;
  ar[ns][key] = arVal;
}

// ─────────────────── 1) Rename existing display strings ───────────────────
// "Partner Schools" → "Success Partners" everywhere it shows to a user.
set("Nav", "schools", "Success Partners", "شركاء النجاح");

set("Schools", "title", "Success Partners", "شركاء النجاح");
set("Schools", "addNew", "Add Success Partner", "إضافة شريك نجاح");
set("Schools", "edit", "Edit Success Partner", "تعديل شريك النجاح");
set("Schools", "createSuccess", "Success Partner created", "تم إنشاء شريك النجاح");
set("Schools", "updateSuccess", "Success Partner updated", "تم تحديث شريك النجاح");
set("Schools", "schoolInfo", "Partner Information", "بيانات الشريك");
set("Schools", "enrolledStudents", "Enrolled Students", "الطلاب المسجّلون");
set("Schools", "noStudents", "No students from this partner yet.", "لا يوجد طلاب من هذا الشريك بعد.");

// Align the existing register option to the prompt's exact wording.
set("Auth", "successPartner", "Success Partner", "شريك النجاح");

// ─────────────────── 2) Partner type labels (3 kinds) ───────────────────
set("Schools", "partnerType", "Partner type", "نوع الشريك");
set("Schools", "type_CHARITY", "Charity", "جمعية خيرية");
set("Schools", "type_SCHOOL", "School", "مدرسة");
set("Schools", "type_INDIVIDUAL", "Individual", "فرد");

// Mirror the labels under Marketer too (the marketer detail page is a separate
// namespace) so the same 3 kinds render there without cross-namespace lookups.
set("Marketer", "partnerType", "Partner type", "نوع الشريك");
set("Marketer", "type_CHARITY", "Charity", "جمعية خيرية");
set("Marketer", "type_SCHOOL", "School", "مدرسة");
set("Marketer", "type_INDIVIDUAL", "Individual", "فرد");

// ─────────────────── 3) Promo form: organization + type hint ───────────────────
set("Finance", "organization", "Organization", "الجهة");
set("Finance", "organizationNone", "None (not tied to a partner)", "بدون (غير مرتبط بشريك)");
set("Finance", "organizationType_CHARITY", "Charity", "جمعية خيرية");
set("Finance", "organizationType_SCHOOL", "School", "مدرسة");
set("Finance", "organizationType_INDIVIDUAL", "Individual", "فرد");
set(
  "Finance",
  "promoTypeHintFixed",
  "Charity & school partners give a percentage discount. Only an individual partner can give a fixed amount.",
  "شركاء النجاح من الجمعيات والمدارس يمنحون خصماً بنسبة مئوية. الفرد فقط يمكنه منح مبلغ ثابت."
);

// ─────────────────── 4) Marketer credential popup (S4) ───────────────────
set("Marketer", "approve", "Approve", "اعتماد");
set("Marketer", "approving", "Approving…", "جارٍ الاعتماد…");
set("Marketer", "credentialsTitle", "Account created — credentials to share", "تم إنشاء الحساب — بيانات الدخول للمشاركة");
set(
  "Marketer",
  "credentialsIntro",
  "Send these to the partner manually (WhatsApp / email). They are shown once.",
  "أرسل هذه البيانات للشريك يدوياً (واتساب / بريد). تظهر مرة واحدة فقط."
);
set("Marketer", "credentialUsername", "Username (email)", "اسم المستخدم (البريد)");
set("Marketer", "credentialPassword", "Temporary password", "كلمة المرور المؤقتة");
set("Marketer", "credentialCopy", "Copy", "نسخ");
set("Marketer", "credentialCopied", "Copied ✓", "تم النسخ ✓");
set("Marketer", "credentialCopyBoth", "Copy both", "نسخ الكل");
set(
  "Marketer",
  "credentialChangeNote",
  "Ask them to change the password after first login.",
  "اطلب منهم تغيير كلمة المرور بعد أول تسجيل دخول."
);
set("Marketer", "credentialDone", "Done", "تم");

// ─────────────────── 5) Student promo column (D3 + D4) ───────────────────
set("Students", "promoCode", "Promo code", "رمز الخصم");
set("Students", "noPromo", "No promo code used", "لم يُستخدم رمز خصم");

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + "\n", "utf8");

const afterEn = leaves(en);
const afterAr = leaves(ar);

console.log(`en leaves: ${beforeEn} -> ${afterEn} (+${afterEn - beforeEn})`);
console.log(`ar leaves: ${beforeAr} -> ${afterAr} (+${afterAr - beforeAr})`);
if (afterEn !== afterAr) {
  console.error("❌ PARITY BROKEN: en and ar leaf counts differ!");
  process.exit(1);
}
console.log("✓ AR === EN parity preserved.");
