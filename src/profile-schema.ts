import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { L1ProfileKey } from "./types.js";

export interface CompanyProfile {
  name: string;
  tax_id: string;
  dba: string;
  registered_address: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
}

export interface Profile {
  company: CompanyProfile;
  user: UserProfile;
}

const COMPANY_FIELDS = ["name", "tax_id", "dba", "registered_address"] as const;
const USER_FIELDS = ["name", "phone", "email"] as const;

export function validateProfile(value: unknown): value is Profile {
  if (!isRecord(value)) return false;
  const company = value.company;
  const user = value.user;
  if (!isRecord(company) || !isRecord(user)) return false;
  return (
    COMPANY_FIELDS.every((field) => typeof company[field] === "string") &&
    USER_FIELDS.every((field) => typeof user[field] === "string") &&
    Object.keys(company).every((field) => COMPANY_FIELDS.includes(field as (typeof COMPANY_FIELDS)[number])) &&
    Object.keys(user).every((field) => USER_FIELDS.includes(field as (typeof USER_FIELDS)[number]))
  );
}

export function parseProfile(value: unknown): Profile {
  if (!validateProfile(value)) throw new ProfileValidationError();
  return value;
}

export async function readProfile(path: string): Promise<Profile> {
  const raw = await readFile(path, "utf8");
  try {
    return parseProfile(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof ProfileValidationError) throw error;
    throw new ProfileValidationError("Profile JSON 格式無效");
  }
}

export async function writeProfile(path: string, profile: Profile): Promise<void> {
  parseProfile(profile);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await chmod(dirname(path), 0o700);
  const temporaryPath = join(dirname(path), `.profile-${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(profile, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, path);
    await chmod(path, 0o600);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

export function getL1ProfileValue(profile: Profile, key: L1ProfileKey): string {
  switch (key) {
    case "company.name":
      return profile.company.name;
    case "company.tax_id":
      return profile.company.tax_id;
    case "company.dba":
      return profile.company.dba;
    case "company.registered_address":
      return profile.company.registered_address;
    case "user.name":
      return profile.user.name;
    case "user.phone":
      return profile.user.phone;
    case "user.email":
      return profile.user.email;
  }
}

export class ProfileValidationError extends Error {
  constructor(message = "Profile 結構無效") {
    super(message);
    this.name = "ProfileValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
