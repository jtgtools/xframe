# xframe

`@jtgtools/xframe` is a linear-static 3D structural analysis engine for frames, trusses, and springs. Models are built in code and solved deterministically in Node or the browser.

The engine is analysis-only. It is not formally certified, performs no design-code checks, and does not replace professional review by a qualified structural engineer.

## Requirements

- Node.js 22 or newer
- npm 11 or newer (npm only)
- A modern browser with ECMAScript modules and Web Crypto for browser use and artifact hashing

```bash
npm install @jtgtools/xframe
```

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

const model = createModelBuilder()
  .setUnitSystem(units)
  .addNode({ id: "support", coordinates: [0, 0, 0] })
  .addNode({ id: "tip", coordinates: [2, 0, 0] })
  .addMaterial({ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3 })
  .addTrussSection({ id: "bar", area: 0.01 })
  .addTruss({
    id: "member",
    startNodeId: "support",
    endNodeId: "tip",
    materialId: "steel",
    sectionId: "bar",
  })
  .addConstraint({
    id: "fix:support:tx",
    terms: [{ nodeId: "support", dof: "tx", coefficient: 1 }],
    rightHandSide: 0,
  })
  .addConstraint({
    id: "fix:support:ty",
    terms: [{ nodeId: "support", dof: "ty", coefficient: 1 }],
    rightHandSide: 0,
  })
  .addConstraint({
    id: "fix:support:tz",
    terms: [{ nodeId: "support", dof: "tz", coefficient: 1 }],
    rightHandSide: 0,
  })
  .addConstraint({
    id: "fix:tip:ty",
    terms: [{ nodeId: "tip", dof: "ty", coefficient: 1 }],
    rightHandSide: 0,
  })
  .addConstraint({
    id: "fix:tip:tz",
    terms: [{ nodeId: "tip", dof: "tz", coefficient: 1 }],
    rightHandSide: 0,
  })
  .addLoadCase({ id: "service", loads: [{ kind: "nodal", nodeId: "tip", force: [10_000, 0, 0] }] })
  .finalize();

const result = prepareAnalysis(model).solveCase("service");
console.log(result.diagnostics.status);
```

The runnable building versions are [`examples/two-story-two-bay-frame.ts`](examples/two-story-two-bay-frame.ts), [`examples/industrial-portal-with-truss-roof.ts`](examples/industrial-portal-with-truss-roof.ts), [`examples/tower-grid-floor.ts`](examples/tower-grid-floor.ts), and [`examples/building-json-roundtrip.ts`](examples/building-json-roundtrip.ts).

## Scope

Frames are 3D Euler-Bernoulli or Timoshenko members, trusses are axial-only, and springs are grounded or two-node. Loads are static nodal forces, member loads, and self-weight. Supports are prescribed displacements, sparse affine constraints, and rigid diaphragms. Results are immutable and include displacements, reactions, element forces, load combinations, envelopes, and equilibrium diagnostics.

Unit labels are metadata only; version one performs no unit conversion. Rotations are radians. CSV input is not supported.

Failures (mechanisms, contradictory constraints, bad releases, non-finite values, unsupported schemas) raise an `XFrameError` with a stable `error.code`. See [`docs/api/public-api.md`](docs/api/public-api.md).

## JSON

In JSON, model artifacts use schema version `1` and result artifacts use schema version `2`, marked by their `schemaVersion` field, with a `sha256:<64 lowercase hexadecimal digits>` model fingerprint. See [`docs/api/json-input.md`](docs/api/json-input.md) and the [`schemas/model.schema.json`](schemas/model.schema.json) / [`schemas/result.schema.json`](schemas/result.schema.json) schemas.

## Verification

Frame, truss, and building behavior is compared against the OpenSees Tcl binary (no openseespy): cantilever, single-bay portal, two-story two-bay frame, triangular truss with settlement, and eccentric-truss rigid-link rotations. That evidence is not certification. See [`docs/verification/verification-report.md`](docs/verification/verification-report.md), [`docs/verification/safety-correctness-report.md`](docs/verification/safety-correctness-report.md), and [`docs/verification/benchmark-report.md`](docs/verification/benchmark-report.md).

## Limits

No nonlinearity, dynamics, buckling, temperature, staged construction, meshing, visualization, or member design. Read [`docs/engineering-use.md`](docs/engineering-use.md) before engineering use. Security reports: [`docs/security-reporting.md`](docs/security-reporting.md).

## Development

```bash
npm ci
npm run check
```

`npm run build` bundles the package into `dist/` with tsdown.
