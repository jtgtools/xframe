# xframe

`@jtgtools/xframe` is a deterministic, browser-safe TypeScript engine for linear-static 3D structural analysis of frames, trusses, and discrete springs. It provides programmatic model construction, strict versioned JSON artifacts, sparse affine constraints, reusable sparse factorization, immutable results, load combinations, envelopes, and numerical diagnostics.

The engine is analysis-only. It is not formally certified, does not perform design-code checks, and does not replace professional review by a qualified structural engineer.

## Requirements

- Node.js 22 or newer for development and server-side use
- npm 11
- A modern browser with ECMAScript modules and Web Crypto for browser use and artifact hashing

```bash
npm install @jtgtools/xframe
```

The repository uses npm only. CSV input is not supported.

## Quick start

```ts
import { createModelBuilder, prepareAnalysis } from "@jtgtools/xframe";

const units = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
} as const;

const builder = createModelBuilder()
  .setUnitSystem(units)
  .addNode({ id: "a", coordinates: [0, 0, 0] })
  .addNode({ id: "b", coordinates: [2, 0, 0] })
  .addMaterial({ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3 })
  .addTrussSection({ id: "bar", area: 0.01 })
  .addTruss({
    id: "t1",
    startNodeId: "a",
    endNodeId: "b",
    materialId: "steel",
    sectionId: "bar",
  });

for (const [nodeId, dofs] of [
  ["a", ["tx", "ty", "tz"]],
  ["b", ["ty", "tz"]],
] as const) {
  for (const dof of dofs) {
    builder.addConstraint({
      id: `fix:${nodeId}:${dof}`,
      terms: [{ nodeId, dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  }
}

const model = builder
  .addLoadCase({
    id: "service",
    loads: [{ kind: "nodal", nodeId: "b", force: [10_000, 0, 0] }],
  })
  .finalize();

const analysis = prepareAnalysis(model);
const result = analysis.solveCase("service");
console.log(result.nodes, result.trusses, result.diagnostics);
```

The complete executable version is [`examples/basic-truss.ts`](examples/basic-truss.ts). A canonical JSON and hashing example is in [`examples/json-roundtrip.ts`](examples/json-roundtrip.ts).

## Supported analysis scope

Version 0.0.1 implements:

- 3D Euler-Bernoulli and Timoshenko frame elements;
- 3D axial truss elements;
- grounded and two-node six-component springs;
- deterministic local axes and rigid end offsets;
- exact frame-end release condensation without artificial stiffness;
- nodal forces and moments, member point forces and moments, partial or full linearly varying member loads, and density-based self-weight;
- prescribed displacements, general sparse affine constraints, and principal-plane rigid diaphragms;
- one factorization reused across compatible load cases;
- immutable nodal, frame, truss, spring, reaction, exact internal-force, diagnostic, combination, and streaming-envelope results;
- strict `schemaVersion: "1"` model artifacts and `schemaVersion: "2"` result artifacts;
- canonical JSON, synchronous SHA-256 structural fingerprints, and Web-Crypto SHA-256 artifact hashes.

All quantities must be entered consistently in the declared unit system. Unit labels are metadata; version one performs no unit conversion. Rotations are radians.

## Results and diagnostics

`prepareAnalysis(model)` validates topology, assembles the sparse global stiffness matrix, compiles affine constraints, applies deterministic reverse Cuthill-McKee ordering, and factorizes a skyline matrix. `solveCase(id)` returns an immutable `CaseResult` containing displacements, reactions, element forces, exact frame internal-force segments and their derived stations, equilibrium measures, strain energy, residuals, normalized pivots, and sparse-storage statistics.

A physical mechanism, contradictory constraint, invalid release, non-finite value, unsupported schema, or unsafe allocation fails with an `XFrameError`. Use `error.code` for stable machine handling and `error.context` for structured details. The complete code list is documented in [`docs/api/public-api.md`](docs/api/public-api.md).

## JSON artifacts

Current JSON contracts: model artifacts use schema version `1` and result artifacts use schema version `2`. Use `modelToJsonValue` and `resultToJsonValue` to produce those complete values. Finalized models and results carry a `sha256:<64 lowercase hexadecimal digits>` model fingerprint. Use `canonicalJson` for deterministic text and `artifactHash` for a Web-Crypto SHA-256 artifact digest. Use `parseModelJson` and `parseResultJson` only on parsed JSON values; both reject unknown fields, missing fields, non-finite values, unsafe identifiers, and unsupported versions.

The distributable schemas are [`schemas/model.schema.json`](schemas/model.schema.json) and [`schemas/result.schema.json`](schemas/result.schema.json). See [`docs/api/json-input.md`](docs/api/json-input.md).

## Verification

The independent verification corpus includes closed-form solutions, seeded structural properties, metamorphic identities, all 4,096 frame-release masks, sparse benchmarks, direct Frame3DD comparisons, and an OpenSees eccentric-truss oracle. Frame3DD outputs are compared for overlapping frame/truss behavior, including transformed element stiffness matrices, assembled global stiffness matrices, nodal displacements, reactions, frame-end forces, truss axial force, prescribed movement, and supported static loads. OpenSees 3.8.0 independently checks rigid-arm eccentric-truss rotations and axial force. Frame3DD does not define xframe-only springs, general affine constraints, combinations, envelopes, JSON, or identifier policy; those features use independent analytical and adversarial evidence.

See [`docs/verification/verification-report.md`](docs/verification/verification-report.md), [`docs/verification/safety-correctness-report.md`](docs/verification/safety-correctness-report.md), and [`docs/verification/benchmark-report.md`](docs/verification/benchmark-report.md).

## Explicit exclusions

Version 0.0.1 does not implement geometric nonlinearity, material nonlinearity, second-order or geometric stiffness, buckling, modal or dynamic analysis, mass matrices, damping, plastic hinges, temperature loads, moving loads, staged construction, soil-structure interaction, section-property calculation, code checking, member design, connection design, optimization, meshing, visualization, or unit conversion. CSV input is not supported.

Read [`docs/engineering-use.md`](docs/engineering-use.md) before engineering use. Security reporting is described in [`docs/security-reporting.md`](docs/security-reporting.md).

## Development

```bash
npm ci
npm run check
FRAME3DD_BIN=/absolute/path/to/frame3dd node scripts/regenerate-frame3dd-reference.mjs
npm run verify
```

The Frame3DD executable is external and is not distributed with this MIT-licensed repository.
