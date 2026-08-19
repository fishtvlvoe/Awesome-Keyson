import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { DOM_EXTRACTION_SCRIPT, extractFields } from "./dom-extractor.js";
import { BrowserOperationError, type BrowserAdapter } from "./browser-adapter.js";
import type { FieldMetadata } from "./types.js";

interface EgoResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface EgoBrowserAdapterOptions {
  command?: string;
  taskSpace?: string;
  commandTimeoutMs?: number;
}

export class EgoBrowserAdapter implements BrowserAdapter {
  private readonly command: string;
  private readonly taskSpace: string;
  private readonly commandTimeoutMs: number;

  constructor(options: EgoBrowserAdapterOptions = {}) {
    this.command = options.command ?? process.env.EGO_BROWSER_COMMAND ?? "ego-browser";
    this.taskSpace = options.taskSpace ?? taskSpaceForUrl(process.env.EGO_TARGET_URL ?? "form-filler");
    this.commandTimeoutMs = options.commandTimeoutMs ?? 45_000;
  }

  async open(url: string, options: { timeoutSeconds?: number } = {}): Promise<void> {
    const timeoutSeconds = options.timeoutSeconds ?? 20;
    await this.execute(`
      const task = await useOrCreateTaskSpace(${JSON.stringify(this.taskSpace)});
      const response = await serverFetch(${JSON.stringify(url)});
      if (response && response.ok === false) {
        throw new Error('目標網址載入失敗：HTTP ' + response.status);
      }
      await openOrReuseTab(${JSON.stringify(url)}, { wait: true, timeout: ${timeoutSeconds} });
      const info = await pageInfo();
      if (!info || info.w === 0 || info.h === 0) throw new Error('目標頁面沒有可用瀏覽器視窗');
      cliLog(JSON.stringify({ ok: true, data: { taskSpace: task.id, url: info.url } }));
    `, timeoutSeconds * 1000 + this.commandTimeoutMs);
  }

  async extractFields(): Promise<FieldMetadata[]> {
    const result = await this.execute(`
      await useOrCreateTaskSpace(${JSON.stringify(this.taskSpace)});
      const tab = await ensureRealTab();
      if (!tab) throw new Error('找不到目標頁面');
      const fields = await js(String.raw\`${escapeTemplate(DOM_EXTRACTION_SCRIPT)}\`);
      cliLog(JSON.stringify({ ok: true, data: fields }));
    `);
    return extractFields(async () => result.data);
  }

  async fillField(field: FieldMetadata, value: string): Promise<void> {
    await this.execute(`
      await useOrCreateTaskSpace(${JSON.stringify(this.taskSpace)});
      const filled = await js(String.raw\`(() => {
        const element = document.querySelectorAll('input, textarea, select')[${field.index}];
        if (!element) return false;
        const value = ${JSON.stringify(value)};
        if (element.tagName.toLowerCase() === 'select') {
          const option = [...element.options].find((item) => item.value === value || item.textContent?.trim() === value);
          if (option) element.value = option.value;
          else element.value = value;
        } else {
          const prototype = Object.getPrototypeOf(element);
          const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
            || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
            || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
          descriptor?.set?.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return element.value === value;
      })()\`);
      if (!filled) throw new Error('欄位填入後值不一致');
      cliLog(JSON.stringify({ ok: true }));
    `);
  }

  async clickSubmit(): Promise<void> {
    await this.execute(`
      await useOrCreateTaskSpace(${JSON.stringify(this.taskSpace)});
      const clicked = await js(String.raw\`(() => {
        const button = document.querySelector('button[type="submit"], input[type="submit"]');
        if (!button) return false;
        button.click();
        return true;
      })()\`);
      if (!clicked) throw new Error('找不到表單送出按鈕');
      cliLog(JSON.stringify({ ok: true }));
    `);
  }

  async close(): Promise<void> {
    try {
      await this.execute(`
        await completeTaskSpace(${JSON.stringify(this.taskSpace)}, { keep: false });
        cliLog(JSON.stringify({ ok: true }));
      `, 15_000);
    } catch {
      // Cleanup is best effort; the runner already reports the original operation failure.
    }
  }

  private async execute(body: string, timeoutMs = this.commandTimeoutMs): Promise<EgoResult> {
    const script = `
      try {
        ${body}
      } catch (error) {
        cliLog(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
        process.exitCode = 1;
      }
    `;
    const { stdout, stderr, code, timedOut } = await runProcess(this.command, ["nodejs", "-e", script], timeoutMs);
    const result = parseResult(`${stdout}\n${stderr}`);
    if (timedOut) throw new BrowserOperationError("ego-browser 執行逾時");
    if (!result || !result.ok || code !== 0) {
      const message = result?.error || stderr.trim() || `ego-browser 結束碼 ${code ?? "未知"}`;
      throw new BrowserOperationError(message);
    }
    return result;
  }
}

function taskSpaceForUrl(value: string): string {
  return `awesome-keyson-${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function escapeTemplate(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/`/gu, "\\`").replace(/\$\{/gu, "\\${");
}

function parseResult(stdout: string): EgoResult | undefined {
  const lines = stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).reverse();
  for (const line of lines) {
    try {
      const value = JSON.parse(line) as unknown;
      if (isEgoResult(value)) return value;
    } catch {
      // ego-browser may print diagnostics; keep looking for the final JSON line.
    }
  }
  return undefined;
}

function isEgoResult(value: unknown): value is EgoResult {
  return typeof value === "object" && value !== null && "ok" in value && typeof value.ok === "boolean";
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
}

function runProcess(command: string, args: string[], timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut });
    });
  });
}
