import { homedir } from "node:os";
import { join } from "node:path";

export interface StoragePaths {
  directory: string;
  profilePath: string;
  vaultPath: string;
}

export function getStoragePaths(directory?: string): StoragePaths {
  const resolvedDirectory = directory ?? process.env.AUTOFILL_HOME ?? join(homedir(), ".autofill");
  return {
    directory: resolvedDirectory,
    profilePath: join(resolvedDirectory, "profile.json"),
    vaultPath: join(resolvedDirectory, "vault.enc"),
  };
}
