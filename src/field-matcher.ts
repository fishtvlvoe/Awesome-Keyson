import type { FieldMatch, FieldMetadata, L1ProfileKey, L2ProfileKey, SensitivityLevel } from "./types.js";

interface FieldRule {
  terms: readonly string[];
  profileKey: L1ProfileKey | L2ProfileKey | null;
  level: SensitivityLevel;
}

export const FIELD_RULES: readonly FieldRule[] = [
  {
    terms: [
      "信用卡號",
      "信用卡号",
      "credit card number",
      "creditcardnumber",
      "card number",
      "cardnumber",
      "cvv",
      "cvc",
      "security code",
      "securitycode",
      "安全碼",
      "安全码",
    ],
    profileKey: null,
    level: "L3",
  },
  {
    terms: [
      "有效期限",
      "有效期",
      "到期日",
      "expiry date",
      "expirydate",
      "expiration date",
      "expirationdate",
      "exp date",
      "expdate",
    ],
    profileKey: null,
    level: "L3",
  },
  {
    terms: [
      "網銀",
      "网银",
      "網路銀行",
      "网络银行",
      "online banking",
      "onlinebanking",
      "bank account",
      "bankaccount",
      "bank username",
      "bankusername",
      "bank password",
      "bankpassword",
      "銀行帳號",
      "银行账号",
      "銀行密碼",
      "银行密码",
    ],
    profileKey: null,
    level: "L3",
  },
  {
    terms: ["身分證字號", "身分證號", "身份证号码", "national id", "nationalid", "id number", "idnumber"],
    profileKey: "user.id_number",
    level: "L2",
  },
  {
    terms: ["護照號碼", "护照号码", "passport no", "passportno", "passport number", "passportnumber"],
    profileKey: "user.passport_number",
    level: "L2",
  },
  {
    terms: ["出生年月日", "出生日期", "生日", "date of birth", "dateofbirth", "dob"],
    profileKey: "user.dob",
    level: "L2",
  },
  {
    terms: ["公司名稱", "公司名", "法定商業名稱", "legal business name", "legalbusinessname", "company name", "companyname", "company"],
    profileKey: "company.name",
    level: "L1",
  },
  {
    terms: ["統一編號", "統編", "统一编号", "統一編號", "vat", "vat number", "vatnumber", "ein", "tax id", "taxid", "brn"],
    profileKey: "company.tax_id",
    level: "L1",
  },
  {
    terms: ["營業別名", "品牌名稱", "营业别名", "品牌名称", "dba", "trade name", "tradename"],
    profileKey: "company.dba",
    level: "L1",
  },
  {
    terms: ["登記地址", "公司地址", "登记地址", "公司地址", "registered address", "registeredaddress", "business address", "businessaddress"],
    profileKey: "company.registered_address",
    level: "L1",
  },
  {
    terms: ["負責人", "代表人", "负责人", "代表人", "姓名", "全名", "representative", "full name", "fullname", "contact name", "contactname"],
    profileKey: "user.name",
    level: "L1",
  },
  {
    terms: ["聯絡電話", "手機", "联系电话", "手机", "phone", "telephone", "mobile"],
    profileKey: "user.phone",
    level: "L1",
  },
  {
    terms: ["電子信箱", "電子郵件", "电子信箱", "电子邮件", "email", "e mail", "e-mail"],
    profileKey: "user.email",
    level: "L1",
  },
];

export function matchField(field: Omit<FieldMetadata, "index" | "tagName"> & Partial<Pick<FieldMetadata, "index" | "tagName">>): FieldMatch | null {
  const values = [field.label, field.placeholder, field.name, field.ariaLabel]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalize);
  for (const rule of FIELD_RULES) {
    if (rule.terms.some((term) => values.some((value) => value.includes(normalize(term))))) {
      return { profileKey: rule.profileKey, level: rule.level, confidence: "high" };
    }
  }
  return null;
}

export function normalizeFieldText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-Hant-TW")
    .replace(/[\s\-_.:/：＿－（）()]+/gu, "");
}

function normalize(value: string): string {
  return normalizeFieldText(value);
}
