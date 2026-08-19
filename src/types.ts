export type SensitivityLevel = "L1" | "L2" | "L3";

export type L1ProfileKey =
  | "company.name"
  | "company.tax_id"
  | "company.dba"
  | "company.registered_address"
  | "user.name"
  | "user.phone"
  | "user.email";

export type L2ProfileKey = "user.id_number" | "user.passport_number" | "user.dob";

export interface FieldMetadata {
  index: number;
  tagName: "input" | "textarea" | "select";
  label?: string;
  placeholder?: string;
  name?: string;
  ariaLabel?: string;
}

export interface FieldMatch {
  profileKey: L1ProfileKey | L2ProfileKey | null;
  level: SensitivityLevel;
  confidence: "high" | "low";
}
