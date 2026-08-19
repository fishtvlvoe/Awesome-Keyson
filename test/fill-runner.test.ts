import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { writeProfile } from "../src/profile-schema.js";
import { runFill } from "../src/fill-runner.js";
import { writeVault } from "../src/vault.js";
import type { BrowserAdapter } from "../src/browser-adapter.js";
import type { FieldMetadata } from "../src/types.js";

const directories: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

const profile = {
  company: {
    name: "Key神有限公司",
    tax_id: "12345678",
    dba: "Key神",
    registered_address: "台北市信義區",
  },
  user: {
    name: "王小明",
    phone: "0912345678",
    email: "fish@example.test",
  },
} as const;

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "awesome-keyson-fill-"));
  directories.push(directory);
  const profilePath = join(directory, "profile.json");
  const vaultPath = join(directory, "vault.enc");
  await writeProfile(profilePath, profile);
  await writeVault(vaultPath, { id_number: "A123456789" }, "correct horse battery staple");
  return { profilePath, vaultPath };
}

class FakeBrowser implements BrowserAdapter {
  constructor(
    private readonly fields: FieldMetadata[],
    private readonly openError?: Error,
  ) {}

  readonly values = new Map<number, string>();
  opened = false;
  submitted = false;
  closed = false;

  async open(): Promise<void> {
    if (this.openError) throw this.openError;
    this.opened = true;
  }

  async extractFields(): Promise<FieldMetadata[]> {
    return this.fields;
  }

  async fillField(field: FieldMetadata, value: string): Promise<void> {
    this.values.set(field.index, value);
  }

  async clickSubmit(): Promise<void> {
    this.submitted = true;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

function outputBuffer() {
  let value = "";
  return {
    output: { write: (chunk: string) => void (value += chunk) },
    read: () => value,
  };
}

describe("fill runner", () => {
  it("fills L1 and decrypted L2, skips L3, then submits only after y", async () => {
    const { profilePath, vaultPath } = await setup();
    const fields: FieldMetadata[] = [
      { index: 0, tagName: "input", label: "公司名稱" },
      { index: 1, tagName: "input", label: "身分證字號" },
      { index: 2, tagName: "input", label: "Credit Card Number" },
      { index: 3, tagName: "input", label: "神秘欄位" },
    ];
    const browser = new FakeBrowser(fields);
    const output = outputBuffer();

    const result = await runFill({
      url: "https://example.test/form",
      profilePath,
      vaultPath,
      browser,
      vaultPassword: "correct horse battery staple",
      confirmSubmit: async () => true,
      output: output.output,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(browser.values.get(0), "Key神有限公司");
    assert.equal(browser.values.get(1), "A123456789");
    assert.equal(browser.values.has(2), false);
    assert.equal(browser.values.has(3), false);
    assert.equal(browser.submitted, true);
    assert.match(output.read(), /以下欄位需自行填寫/);
    assert.match(output.read(), /未辨識/);
  });

  it("keeps L1 filling when no vault password is supplied", async () => {
    const { profilePath, vaultPath } = await setup();
    const browser = new FakeBrowser([
      { index: 0, tagName: "input", label: "Company" },
      { index: 1, tagName: "input", label: "National ID" },
    ]);

    const result = await runFill({
      url: "https://example.test/form",
      profilePath,
      vaultPath,
      browser,
      promptVaultPassword: async () => undefined,
      confirmSubmit: async () => false,
      output: { write: () => undefined },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(browser.values.get(0), "Key神有限公司");
    assert.equal(browser.values.has(1), false);
    assert.equal(browser.submitted, false);
    assert.equal(browser.closed, false);
  });

  it("treats a wrong vault password as skipped L2 and continues", async () => {
    const { profilePath, vaultPath } = await setup();
    const browser = new FakeBrowser([
      { index: 0, tagName: "input", label: "Company" },
      { index: 1, tagName: "input", label: "National ID" },
    ]);
    const output = outputBuffer();

    const result = await runFill({
      url: "https://example.test/form",
      profilePath,
      vaultPath,
      browser,
      vaultPassword: "wrong password",
      confirmSubmit: async () => false,
      output: output.output,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(browser.values.get(0), "Key神有限公司");
    assert.equal(browser.values.has(1), false);
    assert.match(output.read(), /密碼錯誤，無法解密 L2 資料/);
  });

  it("does not submit when the user declines and keeps the browser", async () => {
    const { profilePath, vaultPath } = await setup();
    const browser = new FakeBrowser([{ index: 0, tagName: "input", label: "Company" }]);
    const result = await runFill({
      url: "https://example.test/form",
      profilePath,
      vaultPath,
      browser,
      confirmSubmit: async () => false,
      output: { write: () => undefined },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.browserKept, true);
    assert.equal(browser.submitted, false);
    assert.equal(browser.closed, false);
  });

  it("fails before opening a browser when the profile is missing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "awesome-keyson-missing-"));
    directories.push(directory);
    const browser = new FakeBrowser([]);
    const result = await runFill({
      url: "https://example.test/form",
      profilePath: join(directory, "profile.json"),
      vaultPath: join(directory, "vault.enc"),
      browser,
      output: { write: () => undefined },
    });

    assert.notEqual(result.exitCode, 0);
    assert.match(result.error ?? "", /尚未設定 Profile，請先執行 form-filler init/);
    assert.equal(browser.opened, false);
  });

  it("closes the browser after a target page timeout", async () => {
    const { profilePath, vaultPath } = await setup();
    const browser = new FakeBrowser([], new Error("timeout"));
    const result = await runFill({
      url: "https://example.test/slow",
      profilePath,
      vaultPath,
      browser,
      output: { write: () => undefined },
    });

    assert.notEqual(result.exitCode, 0);
    assert.equal(browser.closed, true);
    assert.match(result.error ?? "", /timeout/);
  });
});
