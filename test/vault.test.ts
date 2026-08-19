import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import {
  decryptVault,
  encryptVault,
  purgeVaultFiles,
  readVault,
  validateL2Data,
  writeVault,
  VaultDecryptionError,
} from "../src/vault.js";
import { validateProfile } from "../src/profile-schema.js";
import { runPurge } from "../src/cli/purge-command.js";
import type { PromptSession } from "../src/cli/prompts.js";

const tempDirectories: string[] = [];

afterEach(async () => {
  for (const directory of tempDirectories.splice(0)) {
    const { rm } = await import("node:fs/promises");
    await rm(directory, { recursive: true, force: true });
  }
});

async function makeTempDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "awesome-keyson-vault-"));
  tempDirectories.push(directory);
  return directory;
}

describe("profile schema", () => {
  it("accepts the L1 profile shape and rejects missing sections", () => {
    assert.equal(
      validateProfile({
        company: {
          name: "Key神有限公司",
          tax_id: "12345678",
          dba: "Key神",
          registered_address: "台北市",
        },
        user: {
          name: "王小明",
          phone: "0912345678",
          email: "fish@example.test",
        },
      }),
      true,
    );
    assert.equal(validateProfile({ company: {}, user: {} }), false);
  });
});

describe("encrypted vault", () => {
  it("round-trips L2 data and writes the documented base64 envelope", async () => {
    const directory = await makeTempDirectory();
    const vaultPath = join(directory, "vault.enc");
    const data = {
      id_number: "A123456789",
      passport_number: "900000001",
      dob: "1990-01-02",
    } as const;

    const envelope = await writeVault(vaultPath, data, "correct horse battery staple");
    assert.deepEqual(await readVault(vaultPath, "correct horse battery staple"), data);
    for (const key of ["salt", "iv", "authTag", "ciphertext"] as const) {
      assert.match(envelope[key], /^[A-Za-z0-9+/]+=*$/);
    }
    assert.deepEqual(JSON.parse(await readFile(vaultPath, "utf8")), envelope);
  });

  it("rejects a wrong password without returning plaintext", () => {
    const envelope = encryptVault({ id_number: "A123456789" }, "correct horse battery staple");
    assert.throws(
      () => decryptVault(envelope, "wrong password"),
      (error: unknown) => {
        assert.ok(error instanceof VaultDecryptionError);
        assert.equal((error as Error).message, "密碼錯誤，無法解密 L2 資料");
        return true;
      },
    );
  });

  it("only accepts the explicit L2 data shape", () => {
    assert.equal(validateL2Data({ id_number: "A123456789" }), true);
    assert.equal(validateL2Data({ unknown: "value" }), false);
    assert.equal(validateL2Data({ id_number: 123 }), false);
  });

  it("purges both files only when the caller confirms", async () => {
    const directory = await makeTempDirectory();
    const profilePath = join(directory, "profile.json");
    const vaultPath = join(directory, "vault.enc");
    await writeFile(profilePath, "profile");
    await writeFile(vaultPath, "vault");

    const aborted = await runPurge({
      paths: { directory, profilePath, vaultPath },
      prompts: promptSession(["y", "n"]),
      output: { write: () => undefined },
    });
    assert.equal(aborted, 0);
    assert.equal(await exists(profilePath), true);
    assert.equal(await exists(vaultPath), true);

    const purged = await runPurge({
      paths: { directory, profilePath, vaultPath },
      prompts: promptSession(["y", "y"]),
      output: { write: () => undefined },
    });
    assert.equal(purged, 0);
    assert.equal(await exists(profilePath), false);
    assert.equal(await exists(vaultPath), false);
  });
});

describe("L3 persistence guard", () => {
  it("keeps the vault writer type restricted to L2 data", () => {
    const safeData: Parameters<typeof writeVault>[1] = { id_number: "A123456789" };
    assert.equal(validateL2Data(safeData), true);
    if (false) {
      // @ts-expect-error Deliberately verifies that a high-risk field cannot reach the writer API.
      void writeVault("/tmp/should-not-be-written", { credit_card_number: "4111111111111111" }, "test password");
    }
  });

  it("keeps the schema and vault source free of high-risk storage fields", async () => {
    const [schemaSource, vaultSource] = await Promise.all([
      readFile(new URL("../../src/profile-schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/vault.ts", import.meta.url), "utf8"),
    ]);
    const forbidden = /credit\\s*card|cvv|cvc|expir(?:y|ation)|bank(?:ing)?|網銀|信用卡/iu;
    assert.equal(forbidden.test(schemaSource), false);
    assert.equal(forbidden.test(vaultSource), false);
    assert.match(vaultSource, /data:\s*L2VaultData/);
    assert.doesNotMatch(vaultSource, /reset.*password|recover.*password|password.*recovery/iu);
  });
});

function promptSession(answers: string[]): PromptSession {
  return {
    ask: async () => answers.shift() ?? "n",
    secret: async () => "",
    close: () => undefined,
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}
