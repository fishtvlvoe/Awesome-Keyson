import { argon2Sync, createDecipheriv, createCipheriv, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

export interface L2VaultData {
  id_number?: string;
  passport_number?: string;
  dob?: string;
}

export interface VaultEnvelope {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

const L2_FIELDS = ["id_number", "passport_number", "dob"] as const;
const KEYCHAIN_SERVICE = "awesome-keyson-vault";
const KEYCHAIN_ACCOUNT = "form-filler";
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export function validateL2Data(value: unknown): value is L2VaultData {
  if (!isRecord(value)) return false;
  return Object.keys(value).every((field) => {
    if (!L2_FIELDS.includes(field as (typeof L2_FIELDS)[number])) return false;
    return typeof value[field] === "string";
  });
}

export function deriveVaultKey(password: string, salt: Buffer): Buffer {
  if (password.length === 0) throw new VaultInputError("Vault 密碼不可為空");
  return argon2Sync("argon2id", {
    message: Buffer.from(password, "utf8"),
    nonce: salt,
    parallelism: 2,
    tagLength: KEY_LENGTH,
    memory: 64 * 1024,
    passes: 3,
  });
}

export function encryptVault(data: L2VaultData, password: string): VaultEnvelope {
  if (!validateL2Data(data)) throw new VaultInputError("L2 資料格式無效");
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveVaultKey(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return {
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptVault(envelope: VaultEnvelope, password: string): L2VaultData {
  const salt = decodeBase64(envelope.salt, "salt");
  const iv = decodeBase64(envelope.iv, "iv");
  const authTag = decodeBase64(envelope.authTag, "authTag");
  const ciphertext = decodeBase64(envelope.ciphertext, "ciphertext");
  const key = deriveVaultKey(password, salt);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const data = JSON.parse(plaintext) as unknown;
    if (!validateL2Data(data)) throw new VaultFormatError("Vault 內容格式無效");
    return data;
  } catch (error) {
    if (error instanceof VaultFormatError) throw error;
    throw new VaultDecryptionError();
  }
}

export async function writeVault(path: string, data: L2VaultData, password: string): Promise<VaultEnvelope> {
  const envelope = encryptVault(data, password);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await chmod(dirname(path), 0o700);
  const temporaryPath = join(dirname(path), `.vault-${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(envelope, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, path);
    await chmod(path, 0o600);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
  return envelope;
}

export async function readVault(path: string, password: string): Promise<L2VaultData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") throw error;
    throw new VaultFormatError("Vault 檔案格式無效");
  }
  if (!isVaultEnvelope(parsed)) throw new VaultFormatError("Vault 檔案格式無效");
  return decryptVault(parsed, password);
}

export async function purgeVaultFiles(profilePath: string, vaultPath: string): Promise<void> {
  await Promise.all([profilePath, vaultPath].map((path) => unlink(path).catch((error: unknown) => {
    if (!isNodeError(error) || error.code !== "ENOENT") throw error;
  })));
}

export function readKeychainSecret(): string | null {
  if (process.platform !== "darwin") return null;
  try {
    const value = execFileSync(
      "security",
      ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export class VaultDecryptionError extends Error {
  constructor() {
    super("密碼錯誤，無法解密 L2 資料");
    this.name = "VaultDecryptionError";
  }
}

export class VaultFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultFormatError";
  }
}

export class VaultInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultInputError";
  }
}

function isVaultEnvelope(value: unknown): value is VaultEnvelope {
  if (!isRecord(value)) return false;
  return ["salt", "iv", "authTag", "ciphertext"].every(
    (field) => typeof value[field] === "string" && value[field].length > 0,
  );
}

function decodeBase64(value: string, field: string): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) throw new VaultFormatError(`Vault ${field} 不是有效 base64`);
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 0) throw new VaultFormatError(`Vault ${field} 不可為空`);
  return decoded;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}
