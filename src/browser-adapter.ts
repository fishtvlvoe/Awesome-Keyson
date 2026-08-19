import type { FieldMetadata } from "./types.js";

export interface BrowserAdapter {
  open(url: string, options?: { timeoutSeconds?: number }): Promise<void>;
  extractFields(): Promise<FieldMetadata[]>;
  fillField(field: FieldMetadata, value: string): Promise<void>;
  clickSubmit(): Promise<void>;
  close(): Promise<void>;
}

export class BrowserOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserOperationError";
  }
}
