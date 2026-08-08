import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, it } from "vitest";

const requiredFiles = [
  "README.md",
  "docs/api/public-api.md",
  "docs/api/json-input.md",
  "docs/architecture/system-architecture.md",
  "docs/engineering-use.md",
  "docs/security-reporting.md",
  "docs/theory/structural-model.md",
  "docs/theory/solution-and-results.md",
  "docs/verification/documentation-audit.md",
  "examples/basic-truss.ts",
  "examples/json-roundtrip.ts",
] as const;

it("DOC-AUD-001: required public documentation and executable examples exist", () => {
  for (const path of requiredFiles) expect(existsSync(path)).toBe(true);
});

it("DOC-AUD-002: public documentation states scope, units, JSON, CSV, review, and certification limits", () => {
  const publicText = [
    "README.md",
    "docs/api/public-api.md",
    "docs/api/json-input.md",
    "docs/engineering-use.md",
  ].map((path) => readFileSync(path, "utf8")).join("\n");

  for (const phrase of [
    "linear-static 3D",
    "unit conversion",
    "CSV input is not supported",
    "professional review",
    "not formally certified",
    "schemaVersion",
    "Frame3DD",
  ]) expect(publicText).toContain(phrase);
  expect(publicText).not.toMatch(/\b(?:TBD|TODO|FIXME)\b/);
});

it("DOC-AUD-003: local Markdown links in public documentation resolve", () => {
  const markdownFiles = requiredFiles.filter((path) => path.endsWith(".md"));
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const file of markdownFiles) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(linkPattern)) {
      const target = match[1]!;
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const path = resolve(dirname(file), target.split("#", 1)[0]!);
      expect(existsSync(path)).toBe(true);
    }
  }
});

it("FR-SAFE-001/002/004/007/014/DOC-AUD-004: current documentation states the remediated safety contracts", () => {
  const currentDocumentation = [
    "README.md",
    "docs/api/public-api.md",
    "docs/api/json-input.md",
    "docs/architecture/system-architecture.md",
    "docs/engineering-use.md",
    "docs/theory/numerical-conventions.md",
    "docs/theory/structural-model.md",
    "docs/theory/solution-and-results.md",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  const requiredPhrases = [
    "sha256:<64 lowercase hexadecimal digits>",
    "model artifacts use schema version `1` and result artifacts use schema version `2`",
    "result schema version `1` fails with `SCHEMA_UNSUPPORTED`",
    "strict compatibility metadata",
    "createEnvelopeCompatibility(result, components)",
    "compatibility vector `B`",
    "`globalEndForces` (six elastic-end force components)",
    "`globalReferenceEndForces` (twelve reference-node force/moment components)",
    "fixed cubic `[c0, c1, c2, c3]`",
    "local `xi = x - start`",
    "analytical derivative roots",
    "both `left` and `right` endpoint limits",
    "combines segment coefficients before deriving stations",
  ];
  expect(requiredPhrases.filter((phrase) => !currentDocumentation.includes(phrase))).toEqual([]);

  const supersessionMarker = "Safety-correctness supersession (2026-08-08)";
  const historicalReports = [
    "docs/verification/finalization-report.md",
    "docs/verification/json-api-report.md",
    "docs/verification/truss-spring-offset-report.md",
    "docs/verification/result-diagnostics-report.md",
  ];
  expect(
    historicalReports.filter((path) => !readFileSync(path, "utf8").includes(supersessionMarker)),
  ).toEqual([]);
});
