import { getStoragePaths, type StoragePaths } from "../storage-paths.js";
import { purgeVaultFiles } from "../vault.js";
import type { PromptSession } from "./prompts.js";

export interface PurgeCommandOptions {
  paths?: StoragePaths;
  prompts: PromptSession;
  output?: { write(chunk: string): unknown };
}

export async function runPurge(options: PurgeCommandOptions): Promise<number> {
  const paths = options.paths ?? getStoragePaths();
  const output = options.output ?? process.stdout;
  if (!(await confirm(options.prompts, "第一次確認：要刪除 Profile 與 Vault 嗎？輸入 y/n："))) {
    output.write("已取消 Vault purge，檔案未變更\n");
    return 0;
  }
  if (!(await confirm(options.prompts, "第二次確認：這個動作無法復原，輸入 y/n："))) {
    output.write("已取消 Vault purge，檔案未變更\n");
    return 0;
  }

  await purgeVaultFiles(paths.profilePath, paths.vaultPath);
  output.write("Vault purge 完成：Profile 與 Vault 已刪除\n");
  return 0;
}

async function confirm(prompts: PromptSession, message: string): Promise<boolean> {
  return (await prompts.ask(message)).trim().toLowerCase() === "y";
}
