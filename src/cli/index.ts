#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { EgoBrowserAdapter } from "../ego-browser-adapter.js";
import { runFill } from "../fill-runner.js";
import { getStoragePaths } from "../storage-paths.js";
import { readKeychainSecret } from "../vault.js";
import { runInit } from "./init-command.js";
import { runPurge } from "./purge-command.js";
import { createPromptSession } from "./prompts.js";

const HELP = `Usage: form-filler <command>

Commands:
  init              建立或編輯本機 Profile
  fill <url>        開啟網址並依分級規則填寫表單
  vault purge       二次確認後刪除本機 Profile 與 Vault
`;

const INIT_HELP = `Usage: form-filler init

互動蒐集 L1 Profile，可選擇以 Master Password 設定 L2 Vault。
`;

const FILL_HELP = `Usage: form-filler fill <url>

開啟目標網址、填入可安全映射的欄位，並在送出前等待 y/n 確認。
`;

const VAULT_HELP = `Usage: form-filler vault purge

二次確認後刪除本機 Profile 與加密 Vault。
`;

export function printHelp(scope?: "init" | "fill" | "vault"): void {
  process.stdout.write(scope === "init" ? INIT_HELP : scope === "fill" ? FILL_HELP : scope === "vault" ? VAULT_HELP : HELP);
}

export async function main(args = process.argv.slice(2)): Promise<number> {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return 0;
  }

  if (command === "init") return runInitCommand(args.slice(1));
  if (command === "fill") return runFillCommand(args.slice(1));
  if (command === "vault") return runVaultCommand(args.slice(1));

  process.stderr.write(`未知指令：${command}\n`);
  printHelp();
  return 2;
}

async function runInitCommand(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp("init");
    return 0;
  }
  const prompts = createPromptSession();
  try {
    return await runInit({ prompts, paths: getStoragePaths() });
  } finally {
    prompts.close();
  }
}

async function runFillCommand(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp("fill");
    return 0;
  }
  const url = args[0];
  if (!url) {
    process.stderr.write("錯誤：fill 需要目標網址\n");
    printHelp("fill");
    return 2;
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "file:"].includes(parsed.protocol)) throw new Error("只支援 http、https 或 file 網址");
  } catch (error) {
    process.stderr.write(`錯誤：網址無效，${error instanceof Error ? error.message : "請檢查網址"}\n`);
    return 2;
  }

  const prompts = createPromptSession();
  try {
    const keychainSecret = readKeychainSecret();
    const browser = process.env.EGO_TASK_SPACE
      ? new EgoBrowserAdapter({ taskSpace: process.env.EGO_TASK_SPACE })
      : new EgoBrowserAdapter();
    const result = await runFill({
      url,
      profilePath: getStoragePaths().profilePath,
      vaultPath: getStoragePaths().vaultPath,
      browser,
      promptVaultPassword: async () => {
        if (keychainSecret) return keychainSecret;
        const vaultSecret = await prompts.secret("輸入 Vault 密碼（留白跳過）：");
        return vaultSecret || undefined;
      },
      confirmSubmit: async () => (await prompts.ask("確認送出？輸入 y/n：")).trim().toLowerCase() === "y",
    });
    return result.exitCode;
  } finally {
    prompts.close();
  }
}

async function runVaultCommand(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h") || args[0] === undefined) {
    printHelp("vault");
    return args[0] === undefined ? 2 : 0;
  }
  if (args[0] !== "purge") {
    process.stderr.write(`未知 vault 指令：${args[0]}\n`);
    printHelp("vault");
    return 2;
  }
  const prompts = createPromptSession();
  try {
    return await runPurge({ prompts, paths: getStoragePaths() });
  } finally {
    prompts.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error: unknown) => {
    process.stderr.write(`錯誤：${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
