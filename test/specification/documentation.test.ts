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
  "examples/two-story-two-bay-frame.ts",
  "examples/industrial-portal-with-truss-roof.ts",
  "examples/tower-grid-floor.ts",
  "examples/building-json-roundtrip.ts",
] as const;

const task13MarkdownCheck =
  "npx oxfmt --check README.md docs/api/json-input.md docs/api/public-api.md docs/architecture/system-architecture.md docs/engineering-use.md docs/roadmap/progress.md docs/theory/numerical-conventions.md docs/theory/solution-and-results.md docs/theory/structural-model.md docs/verification/finalization-report.md docs/verification/json-api-report.md docs/verification/result-diagnostics-report.md docs/verification/safety-correctness-report.md docs/verification/truss-spring-offset-report.md docs/verification/verification-report.md";

it("required public documentation and executable examples exist", () => {
  for (const path of requiredFiles) expect(existsSync(path)).toBe(true);
});

it("public documentation states scope, units, JSON, CSV, review, and certification limits", () => {
  const publicText = [
    "README.md",
    "docs/api/public-api.md",
    "docs/api/json-input.md",
    "docs/engineering-use.md",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

  for (const phrase of [
    "linear-static 3D",
    "unit conversion",
    "CSV input is not supported",
    "professional review",
    "not formally certified",
    "schemaVersion",
    "OpenSees",
  ])
    expect(publicText).toContain(phrase);
  expect(publicText).not.toMatch(/\b(?:TBD|TODO|FIXME)\b/);
});

it("local Markdown links in public documentation resolve", () => {
  const markdownFiles = requiredFiles.filter((path) => path.endsWith(".md"));
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const file of markdownFiles) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(linkPattern)) {
      const target = match[1];
      if (typeof target !== "string") continue;
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const path = resolve(dirname(file), target.split("#", 1)[0]!);
      expect(existsSync(path)).toBe(true);
    }
  }
});

it("current documentation states the remediated safety contracts", () => {
  const requiredPhrasesByFile: readonly (readonly [string, readonly string[]])[] = [
    [
      "README.md",
      [
        "sha256:<64 lowercase hexadecimal digits>",
        "model artifacts use schema version `2` and result artifacts use schema version `3`",
      ],
    ],
    [
      "docs/api/json-input.md",
      [
        "A result schema version `2` fails with `SCHEMA_UNSUPPORTED`",
        "six fixed cubic coefficient arrays per segment",
      ],
    ],
    [
      "docs/api/public-api.md",
      [
        "strict compatibility metadata",
        "`createEnvelopeCompatibility(result, components)`",
        "`streamEnvelope(records, components)`",
        "`combineResults(id, factors)`",
        "`{ result, factor }`",
      ],
    ],
    [
      "docs/architecture/system-architecture.md",
      ["compatibility vector `B`", "all six reference-node DOFs, including physical rotations"],
    ],
    [
      "docs/engineering-use.md",
      ["an unconstrained rotation is a physical mechanism, not a solver-added restraint."],
    ],
    [
      "docs/theory/numerical-conventions.md",
      [
        "A nonzero truss rigid offset requests all three reference-node",
        "rotations as physical DOFs",
        "synchronous SHA-256",
      ],
    ],
    [
      "docs/theory/structural-model.md",
      [
        "The compatibility vector `B` gives `delta = B q =",
        "`globalEndForces` contains the six elastic-end force components",
        "`globalReferenceEndForces` contains twelve reference-node force/moment components",
      ],
    ],
    [
      "docs/theory/solution-and-results.md",
      [
        "fixed cubic `[c0, c1, c2, c3]`",
        "local `xi = x - start`",
        "analytical derivative roots",
        "both `left` and `right` endpoint limits",
        "combines segment coefficients before deriving stations",
        "Bare legacy records or any mismatch fail with `RESULT_INCOMPATIBLE`",
      ],
    ],
    [
      "docs/verification/safety-correctness-report.md",
      ["OpenSees 3.8.0", "OpenSees references verified non-destructively", task13MarkdownCheck],
    ],
  ];
  for (const [path, phrases] of requiredPhrasesByFile) {
    const document = readFileSync(path, "utf8");
    for (const phrase of phrases) expect(document).toContain(phrase);
  }

  const obsoletePhrasesByFile: readonly (readonly [string, readonly string[]])[] = [
    [
      "README.md",
      [
        "FNV-1a",
        "result artifacts use schema version `1`",
        'strict `schemaVersion: "1"` JSON model and result artifacts',
      ],
    ],
    [
      "docs/api/public-api.md",
      [
        "`combineResults(id, factors, results)`",
        "`streamEnvelope(records)`",
        "`streamEnvelope(components, records)`",
        "Bare legacy records are accepted",
      ],
    ],
    [
      "docs/theory/numerical-conventions.md",
      [
        "A truss endpoint requests translations only.",
        "Truss-only rotations are absent by topology",
      ],
    ],
    ["docs/theory/solution-and-results.md", ["Frame results expose stations only."]],
  ];
  for (const [path, phrases] of obsoletePhrasesByFile) {
    const document = readFileSync(path, "utf8");
    for (const phrase of phrases) expect(document).not.toContain(phrase);
  }

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
