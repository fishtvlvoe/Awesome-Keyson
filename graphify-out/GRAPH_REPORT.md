# Graph Report - /Users/fishtv/Development/Awesome-Keyson  (2026-08-24)

## Corpus Check
- Corpus is ~23,304 words - fits in a single context window. You may not need a graph.

## Summary
- 156 nodes · 305 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `runFill()` - 16 edges
2. `runInit()` - 10 edges
3. `EgoBrowserAdapter` - 9 edges
4. `getStoragePaths()` - 9 edges
5. `FakeBrowser` - 7 edges
6. `writeVault()` - 7 edges
7. `readVault()` - 7 edges
8. `FieldMetadata` - 7 edges
9. `runFillCommand()` - 7 edges
10. `runPurge()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `setup()` --calls--> `writeProfile()`  [EXTRACTED]
  test/fill-runner.test.ts → src/profile-schema.ts
- `setup()` --calls--> `writeVault()`  [EXTRACTED]
  test/fill-runner.test.ts → src/vault.ts
- `runInit()` --calls--> `getStoragePaths()`  [EXTRACTED]
  src/cli/init-command.ts → src/storage-paths.ts
- `runFill()` --calls--> `readVault()`  [EXTRACTED]
  src/fill-runner.ts → src/vault.ts
- `runFill()` --calls--> `readProfile()`  [EXTRACTED]
  src/fill-runner.ts → src/profile-schema.ts

## Communities (9 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (20): BrowserAdapter, BrowserOperationError, cleanText(), DOM_EXTRACTION_SCRIPT, DomDocumentLike, DomElementLike, extractFields(), isRecord() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (25): askOptional(), askWithDefault(), InitCommandOptions, isMissingFile(), readExistingProfile(), runInit(), writeLine(), COMPANY_FIELDS (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (21): decodeBase64(), decryptVault(), deriveVaultKey(), encryptVault(), isNodeError(), isRecord(), isVaultEnvelope(), L2_FIELDS (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.26
Nodes (14): main(), printHelp(), runFillCommand(), runInitCommand(), runVaultCommand(), createPromptSession(), PromptSession, confirm() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (15): matchField(), describeField(), failure(), FillOutput, FillRecord, FillRunOptions, FillRunResult, getL2VaultValue() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (8): extractFieldsFromDocument(), address, cases, companyInput, country, document, FixtureElement, taxInput

### Community 6 - "Community 6"
Cohesion: 0.31
Nodes (8): FIELD_RULES, FieldRule, normalize(), normalizeFieldText(), FieldMatch, L1ProfileKey, L2ProfileKey, SensitivityLevel

## Knowledge Gaps
- **38 isolated node(s):** `companyInput`, `taxInput`, `address`, `country`, `document` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EgoBrowserAdapter` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `FakeBrowser` connect `Community 7` to `Community 1`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `runFill()` connect `Community 4` to `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `companyInput`, `taxInput`, `address` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._