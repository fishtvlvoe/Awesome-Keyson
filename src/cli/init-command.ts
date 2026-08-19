import { readProfile, writeProfile, type Profile } from "../profile-schema.js";
import { getStoragePaths, type StoragePaths } from "../storage-paths.js";
import { writeVault } from "../vault.js";
import type { PromptSession } from "./prompts.js";

export interface InitCommandOptions {
  paths?: StoragePaths;
  prompts: PromptSession;
  output?: { write(chunk: string): unknown };
}

export async function runInit(options: InitCommandOptions): Promise<number> {
  const paths = options.paths ?? getStoragePaths();
  const output = options.output ?? process.stdout;
  const existing = await readExistingProfile(paths.profilePath);

  const profile: Profile = {
    company: {
      name: await askWithDefault(options.prompts, "公司名稱", existing?.company.name),
      tax_id: await askWithDefault(options.prompts, "統一編號", existing?.company.tax_id),
      dba: await askWithDefault(options.prompts, "營業別名 DBA", existing?.company.dba),
      registered_address: await askWithDefault(options.prompts, "登記地址", existing?.company.registered_address),
    },
    user: {
      name: await askWithDefault(options.prompts, "負責人姓名", existing?.user.name),
      phone: await askWithDefault(options.prompts, "聯絡電話", existing?.user.phone),
      email: await askWithDefault(options.prompts, "電子信箱", existing?.user.email),
    },
  };

  await writeProfile(paths.profilePath, profile);
  writeLine(output, `Profile 已儲存：${paths.profilePath}`);

  const configureVault = (await options.prompts.ask("設定 L2 個資 Vault？輸入 y/n：")).trim().toLowerCase() === "y";
  if (!configureVault) return 0;

  writeLine(output, "密碼遺失無法救回，只能 vault purge 後重設。");
  const masterSecret = await options.prompts.secret("設定 Master Password：");
  if (masterSecret.length === 0) {
    writeLine(output, "錯誤：Master Password 不可為空");
    return 1;
  }
  const confirmation = await options.prompts.secret("再次輸入 Master Password：");
  if (masterSecret !== confirmation) {
    writeLine(output, "錯誤：兩次 Master Password 不一致");
    return 1;
  }

  const data = {
    id_number: await askOptional(options.prompts, "身分證字號"),
    passport_number: await askOptional(options.prompts, "護照號碼"),
    dob: await askOptional(options.prompts, "出生年月日"),
  };
  await writeVault(paths.vaultPath, data, masterSecret);
  writeLine(output, `L2 Vault 已加密儲存：${paths.vaultPath}`);
  return 0;
}

async function readExistingProfile(path: string): Promise<Profile | undefined> {
  try {
    return await readProfile(path);
  } catch (error) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
}

async function askWithDefault(prompts: PromptSession, label: string, current: string | undefined): Promise<string> {
  const suffix = current ? ` [${current}]` : "";
  const value = (await prompts.ask(`${label}${suffix}：`)).trim();
  return value || current || "";
}

async function askOptional(prompts: PromptSession, label: string): Promise<string> {
  return (await prompts.ask(`${label}（可留白）：`)).trim();
}

function writeLine(output: { write(chunk: string): unknown }, message: string): void {
  output.write(`${message}\n`);
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
