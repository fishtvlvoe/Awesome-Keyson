import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractFieldsFromDocument } from "../src/dom-extractor.js";
import { matchField } from "../src/field-matcher.js";

describe("DOM field extraction", () => {
  it("extracts mixed input, textarea, and select metadata from a fixture document", () => {
    const companyInput = fixtureElement("input", {
      id: "company",
      placeholder: "Legal Business Name",
      name: "company_name",
    });
    const taxInput = fixtureElement("input", { id: "tax", name: "tax_id" });
    const address = fixtureElement("textarea", { name: "address" });
    const country = fixtureElement("select", { "aria-label": "Country" });
    const document = fixtureDocument(
      [companyInput, taxInput, address, country],
      new Map([
        ["company", "公司名稱"],
        ["tax", "統一編號"],
      ]),
    );

    assert.deepEqual(extractFieldsFromDocument(document), [
      {
        index: 0,
        tagName: "input",
        label: "公司名稱",
        placeholder: "Legal Business Name",
        name: "company_name",
      },
      { index: 1, tagName: "input", label: "統一編號", name: "tax_id" },
      { index: 2, tagName: "textarea", name: "address" },
      { index: 3, tagName: "select", ariaLabel: "Country" },
    ]);
  });
});

describe("semantic field matcher", () => {
  const cases = [
    ["統一編號", "company.tax_id", "L1"],
    ["VAT", "company.tax_id", "L1"],
    ["EIN", "company.tax_id", "L1"],
    ["DBA", "company.dba", "L1"],
    ["負責人", "user.name", "L1"],
    ["Representative", "user.name", "L1"],
    ["身分證字號", "user.id_number", "L2"],
    ["Passport No.", "user.passport_number", "L2"],
  ] as const;

  for (const [label, profileKey, level] of cases) {
    it(`maps ${label}`, () => {
      assert.deepEqual(matchField({ index: 0, tagName: "input", label }), {
        profileKey,
        level,
        confidence: "high",
      });
    });
  }

  it("classifies a credit-card field as L3 without a fillable key", () => {
    assert.deepEqual(
      matchField({ index: 0, tagName: "input", ariaLabel: "Credit Card Number" }),
      { profileKey: null, level: "L3", confidence: "high" },
    );
    assert.deepEqual(matchField({ index: 1, tagName: "input", label: "CVV" }), {
      profileKey: null,
      level: "L3",
      confidence: "high",
    });
  });

  it("returns null for an unrecognized field instead of guessing", () => {
    assert.equal(
      matchField({ index: 0, tagName: "input", placeholder: "Tell us something unusual" }),
      null,
    );
  });
});

interface FixtureElement {
  tagName?: string;
  attributes: Record<string, string>;
  getAttribute?: (name: string) => string | null;
}

function fixtureElement(tagName: string, attributes: Record<string, string>): FixtureElement {
  return {
    tagName,
    attributes,
    getAttribute: (name: string) => attributes[name] ?? null,
  };
}

function fixtureDocument(elements: FixtureElement[], labels: Map<string, string>) {
  return {
    querySelectorAll: () => elements,
    querySelector: (selector: string) => {
      const match = /^label\[for="([^"]+)"\]$/.exec(selector);
      if (!match) return null;
      const value = labels.get(match[1] ?? "");
      return value ? { textContent: value } : null;
    },
  };
}
