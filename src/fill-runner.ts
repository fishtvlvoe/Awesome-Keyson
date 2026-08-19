import { readProfile, getL1ProfileValue } from "./profile-schema.js";
import { matchField } from "./field-matcher.js";
import { readVault, VaultDecryptionError } from "./vault.js";
import type { BrowserAdapter } from "./browser-adapter.js";
import type { FieldMetadata, L1ProfileKey, L2ProfileKey } from "./types.js";

export interface FillOutput {
  write(chunk: string): unknown;
}

export interface FillRecord {
  field: string;
  profileKey: string | null;
  level?: "L1" | "L2" | "L3";
  reason?: string;
}

export interface FillRunResult {
  exitCode: number;
  submitted: boolean;
  browserKept: boolean;
  filled: FillRecord[];
  skipped: FillRecord[];
  unrecognized: FillRecord[];
  error?: string;
}

export interface FillRunOptions {
  url: string;
  profilePath: string;
  vaultPath: string;
  browser: BrowserAdapter;
  output?: FillOutput;
  vaultPassword?: string;
  promptVaultPassword?: () => Promise<string | undefined>;
  confirmSubmit?: () => Promise<boolean>;
  pageTimeoutSeconds?: number;
}

export async function runFill(options: FillRunOptions): Promise<FillRunResult> {
  const output = options.output ?? process.stdout;
  const filled: FillRecord[] = [];
  const skipped: FillRecord[] = [];
  const unrecognized: FillRecord[] = [];
  let profile;

  try {
    profile = await readProfile(options.profilePath);
  } catch (error) {
    const message = isMissingFile(error)
      ? "尚未設定 Profile，請先執行 form-filler init"
      : error instanceof Error
        ? error.message
        : "Profile 讀取失敗";
    writeLine(output, `錯誤：${message}`);
    return failure(message, filled, skipped, unrecognized);
  }

  try {
    await options.browser.open(options.url, { timeoutSeconds: options.pageTimeoutSeconds ?? 20 });
    const fields = await options.browser.extractFields();
    let vaultData: Awaited<ReturnType<typeof readVault>> | undefined;
    let vaultAttempted = false;
    let vaultPassword = options.vaultPassword;

    for (const field of fields) {
      const label = describeField(field);
      const match = matchField(field);
      if (!match) {
        unrecognized.push({ field: label, profileKey: null, reason: "未辨識" });
        continue;
      }

      if (match.level === "L3") {
        skipped.push({ field: label, profileKey: null, level: "L3", reason: "高風險欄位必須手動填寫" });
        continue;
      }

      if (match.level === "L1" && match.profileKey) {
        if (!isL1ProfileKey(match.profileKey)) throw new Error("L1 欄位映射格式無效");
        const value = getL1ProfileValue(profile, match.profileKey);
        if (value.length === 0) {
          skipped.push({ field: label, profileKey: match.profileKey, level: "L1", reason: "Profile 沒有值" });
          continue;
        }
        await options.browser.fillField(field, value);
        filled.push({ field: label, profileKey: match.profileKey, level: "L1" });
        continue;
      }

      if (match.level === "L2" && match.profileKey) {
        if (!vaultAttempted) {
          vaultAttempted = true;
          vaultPassword ??= await options.promptVaultPassword?.();
          if (vaultPassword) {
            try {
              vaultData = await readVault(options.vaultPath, vaultPassword);
            } catch (error) {
              if (error instanceof VaultDecryptionError) {
                writeLine(output, error.message);
              } else if (isMissingFile(error)) {
                writeLine(output, "找不到 L2 Vault，L2 欄位將跳過");
              } else {
                writeLine(output, error instanceof Error ? error.message : "L2 Vault 讀取失敗");
              }
            }
          } else {
            writeLine(output, "未提供 Vault 密碼，L2 欄位將跳過");
          }
        }
        if (!isL2ProfileKey(match.profileKey)) throw new Error("L2 欄位映射格式無效");
        const value = vaultData && getL2VaultValue(vaultData, match.profileKey);
        if (!value) {
          skipped.push({ field: label, profileKey: match.profileKey, level: "L2", reason: "需要手動填寫" });
          continue;
        }
        await options.browser.fillField(field, value);
        filled.push({ field: label, profileKey: match.profileKey, level: "L2" });
      }
    }

    printSummary(output, filled, skipped, unrecognized);
    const confirmed = (await options.confirmSubmit?.()) ?? false;
    if (!confirmed) {
      writeLine(output, "已放棄自動送出，瀏覽器視窗保留供手動操作");
      return { exitCode: 0, submitted: false, browserKept: true, filled, skipped, unrecognized };
    }

    await options.browser.clickSubmit();
    writeLine(output, "已確認並送出表單");
    await options.browser.close().catch(() => undefined);
    return { exitCode: 0, submitted: true, browserKept: false, filled, skipped, unrecognized };
  } catch (error) {
    await options.browser.close().catch(() => undefined);
    const message = error instanceof Error ? error.message : "Fill 執行失敗";
    writeLine(output, `錯誤：${message}`);
    return failure(message, filled, skipped, unrecognized);
  }
}

function printSummary(output: FillOutput, filled: FillRecord[], skipped: FillRecord[], unrecognized: FillRecord[]): void {
  writeLine(output, `已自動填入 ${filled.length} 個欄位：${filled.map((item) => item.field).join("、") || "無"}`);
  writeLine(output, `以下欄位需自行填寫：${skipped.map((item) => item.field).join("、") || "無"}`);
  writeLine(output, `未辨識欄位：${unrecognized.map((item) => item.field).join("、") || "無"}`);
  writeLine(output, "請檢查表單內容，輸入 y 送出，輸入 n 放棄：");
}

function describeField(field: FieldMetadata): string {
  return field.label ?? field.ariaLabel ?? field.placeholder ?? field.name ?? `${field.tagName}[${field.index}]`;
}

function getL2VaultValue(data: Awaited<ReturnType<typeof readVault>>, key: L2ProfileKey): string | undefined {
  switch (key) {
    case "user.id_number":
      return data.id_number;
    case "user.passport_number":
      return data.passport_number;
    case "user.dob":
      return data.dob;
  }
}

function failure(
  error: string,
  filled: FillRecord[],
  skipped: FillRecord[],
  unrecognized: FillRecord[],
): FillRunResult {
  return { exitCode: 1, submitted: false, browserKept: false, filled, skipped, unrecognized, error };
}

function writeLine(output: FillOutput, message: string): void {
  output.write(`${message}\n`);
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isL1ProfileKey(value: string | null): value is L1ProfileKey {
  return value !== null && value.startsWith("company.") || value === "user.name" || value === "user.phone" || value === "user.email";
}

function isL2ProfileKey(value: string | null): value is L2ProfileKey {
  return value === "user.id_number" || value === "user.passport_number" || value === "user.dob";
}
