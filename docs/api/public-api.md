# Public API

The package root is the only supported import boundary. Runtime modules are standards-compliant ESM and contain no Node-only imports.

```ts
import {
  createModelBuilder,
  prepareAnalysis,
  combineResults,
  createEnvelopeCompatibility,
  streamEnvelope,
  modelToJsonValue,
  resultToJsonValue,
  parseModelJson,
} from "@jtgtools/xframe";
```

## Construction

`createModelBuilder(): ModelBuilder` creates a mutable transaction boundary. Add methods copy and validate caller-owned values and return the same builder for fluent use. `addBatch` is atomic. `snapshot()` returns immutable construction records. `finalize()` resolves references, active physical DOFs, elastic member geometry, load coordinates, result dependencies, and a deterministic model fingerprint.

The builder supports `setUnitSystem`, `addNode`, `addMaterial`, `addFrameSection`, `addTrussSection`, `addFrame`, `addTruss`, `addSpring`, `addConstraint`, `addRigidDiaphragm`, `addLoadCase`, `addCombination`, and `addBatch`.

Identifiers are NFC-normalized strings. Empty values, control characters, spreadsheet-formula prefixes, non-strings, and duplicates are rejected. Registries use `Map`, so names such as `__proto__` do not mutate object prototypes.

## Units

Every model requires exactly this version-one metadata:

```ts
interface UnitSystem {
  readonly version: "1";
  readonly length: string;
  readonly force: string;
  readonly moment: string;
  readonly modulus: string;
  readonly distributedForce: string;
  readonly density: string;
  readonly rotation: "rad";
}
```

Unit labels are descriptive. There is no unit conversion. The caller is responsible for a consistent force-length system.

## Analysis

`prepareAnalysis(model, options?)` assembles and factorizes one compatible linear system. It returns `PreparedAnalysis`.

- `solveCase(id)` solves one finalized load case.
- `solveCases(ids)` solves several cases while reusing assembly and factorization.
- `statistics` reports assembly, factorization, solve, sparse-nonzero, skyline-storage, row-width, and bandwidth counts.

The default memory preflight rejects unsafe skyline allocations before typed arrays are created. Under-restraint and non-positive pivots fail; xframe never adds hidden restraints or stabilizing stiffness.

## Results

A `CaseResult` is immutable and includes:

- full and reduced displacement/load vectors;
- nodal coordinates, active-DOF displacements, and reactions;
- frame local/global end displacements and forces, exact internal-force segments, and derived stations;
- truss extension, strain, axial force, `globalEndForces` (six elastic-end force components), and `globalReferenceEndForces` (twelve reference-node force/moment components);
- spring end forces;
- residual, equilibrium, energy, pivot, and sparse-storage diagnostics;
- model fingerprint, unit metadata, conventions, and load provenance.

`combineResults(id, factors)` linearly combines compatible case or combination results. Each `factors` entry is `{ result, factor }`, pairing a `StructuralResult` with its finite scalar multiplier:

```ts
const combination = combineResults("uls", [{ result: deadLoad, factor: 1.35 }]);
```

For frames it combines segment coefficients before deriving stations, so extrema from a new linear combination are retained. `createEnvelopeCompatibility(result, components)` produces the required immutable metadata. `streamEnvelope(records, components)` consumes records incrementally and retains all tied minimum and maximum governors with complete provenance.

Every envelope record carries strict compatibility metadata: the `sha256` model fingerprint, the complete unit system, result conventions, and the exact ordered component layout. `streamEnvelope` compares every record with the first record and the supplied layout before reading values. Bare legacy records and every mismatch fail with `RESULT_INCOMPATIBLE`.

## JSON and canonical artifacts

- `MODEL_SCHEMA_VERSION` is `"1"`; `RESULT_SCHEMA_VERSION` is `"2"`.
- `modelToJsonValue(model)` and `resultToJsonValue(result)` create complete plain-data artifacts.
- `parseModelJson(value)` validates model schema version `1`; `parseResultJson(value)` validates result schema version `2` and rejects result schema version `1` with `SCHEMA_UNSUPPORTED`.
- `canonicalJson(value)` sorts object keys, preserves array order, rejects unsupported/non-finite data, and normalizes negative zero.
- `artifactHash(value)` returns a lowercase SHA-256 hex digest through Web Crypto.

See [JSON input](json-input.md).

## Errors

All expected validation and numerical failures use `XFrameError`. Stable codes are:

`INPUT_INVALID`, `IDENTIFIER_INVALID`, `DUPLICATE_IDENTIFIER`, `REFERENCE_NOT_FOUND`, `UNITS_INVALID`, `GEOMETRY_INVALID`, `MATERIAL_INVALID`, `SECTION_INVALID`, `LOAD_INVALID`, `CONSTRAINT_CONTRADICTION`, `CONSTRAINT_CYCLE`, `CONSTRAINT_RANK_DEFICIENT`, `ELEMENT_LOCAL_MECHANISM`, `GLOBAL_MECHANISM`, `FACTORIZATION_FAILED`, `NON_FINITE_VALUE`, `MEMORY_LIMIT_EXCEEDED`, `SCHEMA_UNSUPPORTED`, `SCHEMA_INVALID`, `RESULT_INCOMPATIBLE`, and `UNSUPPORTED_FEATURE`.

The message is human-readable. `code` and `context` are the machine contract. Native programming errors are not converted into structural-analysis success.

## Compatibility

`XFRAME_VERSION` identifies the package implementation. JSON compatibility is controlled independently by `schemaVersion`. Unknown schema versions fail closed. Minor package releases may add exports but do not reinterpret an existing schema version.

## Verification boundary

Overlapping frame and truss behavior is compared directly with Frame3DD outputs, including element and assembled stiffness matrices. xframe-specific springs, affine constraints, result combinations, envelopes, JSON, and identifier security have independent tests because Frame3DD does not define those contracts.
