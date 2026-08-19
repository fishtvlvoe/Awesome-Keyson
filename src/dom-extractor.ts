import type { FieldMetadata } from "./types.js";

export interface DomElementLike {
  tagName?: string;
  textContent?: string | null;
  getAttribute?: (name: string) => string | null;
  closest?: (selector: string) => DomElementLike | null;
  labels?: ArrayLike<DomElementLike> | null;
}

export interface DomDocumentLike {
  querySelectorAll: (selector: string) => ArrayLike<DomElementLike>;
  querySelector?: (selector: string) => DomElementLike | null;
}

export function extractFieldsFromDocument(document: DomDocumentLike): FieldMetadata[] {
  const elements = Array.from(document.querySelectorAll("input, textarea, select"));
  return elements.map((element, index) => {
    const id = readAttribute(element, "id");
    const explicitLabel = id ? document.querySelector?.(`label[for="${escapeSelectorValue(id)}"]`) : undefined;
    const associatedLabel = explicitLabel ?? element.labels?.[0] ?? element.closest?.("label");
    const result: FieldMetadata = {
      index,
      tagName: normalizeTagName(element.tagName),
    };
    setOptional(result, "label", cleanText(associatedLabel?.textContent));
    setOptional(result, "placeholder", readAttribute(element, "placeholder"));
    setOptional(result, "name", readAttribute(element, "name"));
    setOptional(result, "ariaLabel", readAttribute(element, "aria-label"));
    return result;
  });
}

export async function extractFields(
  evaluate: (script: string) => Promise<unknown>,
): Promise<FieldMetadata[]> {
  const value = await evaluate(DOM_EXTRACTION_SCRIPT);
  if (!Array.isArray(value)) throw new Error("瀏覽器未回傳欄位清單");
  return value.map((field, index) => normalizeField(field, index));
}

export const DOM_EXTRACTION_SCRIPT = String.raw`(() => {
  const clean = (value) => {
    const text = value?.trim();
    return text ? text : undefined;
  };
  const fields = [...document.querySelectorAll('input, textarea, select')];
  return fields.map((element, index) => {
    const id = element.getAttribute('id');
    const label = (id && document.querySelector('label[for="' + CSS.escape(id) + '"]'))
      || element.labels?.[0]
      || element.closest('label');
    const result = {
      index,
      tagName: element.tagName.toLowerCase(),
      label: clean(label?.textContent),
      placeholder: clean(element.getAttribute('placeholder')),
      name: clean(element.getAttribute('name')),
      ariaLabel: clean(element.getAttribute('aria-label')),
    };
    return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  });
})()`;

function normalizeField(value: unknown, fallbackIndex: number): FieldMetadata {
  if (!isRecord(value)) throw new Error(`瀏覽器欄位 ${fallbackIndex + 1} 格式無效`);
  const tagName = value.tagName;
  if (tagName !== "input" && tagName !== "textarea" && tagName !== "select") {
    throw new Error(`瀏覽器欄位 ${fallbackIndex + 1} 標籤無效`);
  }
  const index = typeof value.index === "number" && Number.isInteger(value.index) ? value.index : fallbackIndex;
  const result: FieldMetadata = { index, tagName };
  for (const key of ["label", "placeholder", "name", "ariaLabel"] as const) {
    if (typeof value[key] === "string" && value[key].trim()) result[key] = value[key].trim();
  }
  return result;
}

function normalizeTagName(value = "input"): FieldMetadata["tagName"] {
  const tagName = value.toLowerCase();
  if (tagName === "textarea" || tagName === "select") return tagName;
  return "input";
}

function readAttribute(element: DomElementLike, name: string): string | undefined {
  const value = element.getAttribute?.(name);
  return cleanText(value);
}

function cleanText(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function setOptional<K extends "label" | "placeholder" | "name" | "ariaLabel">(
  target: FieldMetadata,
  key: K,
  value: string | undefined,
): void {
  if (value) target[key] = value;
}

function escapeSelectorValue(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
