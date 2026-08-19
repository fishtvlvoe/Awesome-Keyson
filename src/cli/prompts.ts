import { createInterface, type Interface } from "node:readline";
import type { ReadStream } from "node:tty";

export interface PromptSession {
  ask(message: string): Promise<string>;
  secret(message: string): Promise<string>;
  close(): void;
}

export function createPromptSession(input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout): PromptSession {
  const terminalInput = input as ReadStream;
  const terminalOutput = output;
  const isTerminal = terminalInput.isTTY === true && typeof terminalInput.setRawMode === "function";
  const readline = createInterface({ input, output, terminal: isTerminal });
  const queuedLines: string[] = [];
  const waitingLines: Array<(line: string) => void> = [];
  readline.on("line", (line) => {
    const resolve = waitingLines.shift();
    if (resolve) resolve(line);
    else queuedLines.push(line);
  });

  const ask = async (message: string): Promise<string> => {
    terminalOutput.write(message);
    const queued = queuedLines.shift();
    if (queued !== undefined) return queued;
    return new Promise<string>((resolve) => waitingLines.push(resolve));
  };

  return {
    ask,
    secret: async (message) => {
      if (!isTerminal) return ask(message);
      readline.pause();
      return readHidden(message, terminalInput, terminalOutput, readline);
    },
    close: () => readline.close(),
  };
}

async function readHidden(message: string, input: ReadStream, output: NodeJS.WritableStream, readline: Interface): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const previousRawMode = input.isRaw ?? false;
    const previousEncoding = input.readableEncoding;

    const restore = () => {
      input.off("data", onData);
      input.setRawMode?.(previousRawMode);
      input.setEncoding(previousEncoding ?? "utf8");
      readline.resume();
    };
    const finish = (result: string) => {
      restore();
      output.write("\n");
      resolve(result);
    };
    const onData = (chunk: string | Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          restore();
          output.write("\n");
          reject(new Error("使用者中止輸入"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish(value);
          return;
        }
        if (character === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };

    output.write(message);
    input.setRawMode?.(true);
    input.setEncoding("utf8");
    input.on("data", onData);
    input.resume();
  });
}
