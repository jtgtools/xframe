# Safety-Correctness Remediation Implementation Plan

> **Required execution mode:** Use `subagent-driven-development` task by task. Every implementation task gets a fresh `openai-codex/gpt-5.6-luna:max` implementer, followed first by a fresh specification review and then a fresh quality review using `openai-codex/gpt-5.6-sol:max`. Only one writer may operate on `master` at a time.

**Goal:** Implement FR-SAFE-001, FR-SAFE-002, FR-SAFE-003, FR-SAFE-004, FR-SAFE-007, FR-SAFE-010, FR-SAFE-013, and FR-SAFE-014 from the approved design.

**Architecture:** Establish deterministic/collision-resistant identity first, then repair constraint numerics, implement a work-conjugate eccentric-truss transform, represent frame-force diagrams as exact piecewise polynomials, and publish both new result forms together in one atomic result-schema-v2 change. Finish with reproducible OpenSees/Frame3DD evidence and the repository acceptance gate.

**Tech stack:** TypeScript 5.9, standards-compliant browser-safe ESM, npm, Vitest 4, Oxlint/Oxfmt, sparse coordinate assembly, OpenSees 3.8.0, Frame3DD 20140514+.

**Design:** `docs/superpowers/specs/2026-08-01-safety-correctness-design.md`

## Execution rules

- Work directly on `master`, as explicitly requested.
- Read `.agents/skills/ponytail/SKILL.md` before every implementation or review assignment.
- Strict TDD: add a failing test first, run it, and confirm the intended failure before production edits.
- Every new test title includes its `FR-SAFE-*` requirement ID.
- Never use `.skip`, `.only`, or `.todo`.
- Never add hidden stiffness, restraints, epsilon roots, swallowed errors, or dense global matrices.
- Use focused Vitest/type/lint/format commands during tasks. Run `npm run check` only at final acceptance.
- Commit each accepted task. Review fixes go back to the same implementer session and receive fresh re-review.
- External executables stay outside the repository; only scripts, inputs, references, hashes, and reports are committed.

## Task 1: Make structural ordering host-independent (XF-010)

**Files**

- Modify: `src/model/identifier.ts`
- Modify: `src/model/model-finalizer.ts`
- Modify: `src/model/dof-topology.ts`
- Modify: `src/model/reference-resolution.ts`
- Modify: `src/constraints/compile-constraints.ts`
- Modify: `src/constraints/constraint-rank.ts`
- Test: `test/unit/identifier.test.ts`
- Test: `test/integration/model-finalization.test.ts`
- Test: `test/unit/reference-resolution.test.ts`
- Test: `test/integration/constraint-compiler.test.ts`

### Step 1: Write RED tests

Add tests equivalent to:

```ts
it("FR-SAFE-010: compares normalized identifiers by ECMAScript code units", () => {
  expect(compareIdentifiers("z" as EntityId, "ä" as EntityId)).toBe(-1);
  expect(compareIdentifiers("ä" as EntityId, "z" as EntityId)).toBe(1);
  expect(compareIdentifiers("z" as EntityId, "z" as EntityId)).toBe(0);
});

it("FR-SAFE-010: finalization never consults host collation", () => {
  const original = String.prototype.localeCompare;
  String.prototype.localeCompare = () => {
    throw new Error("localeCompare used");
  };
  try {
    expect(finalizeUnicodeModel().nodes.map(({ id }) => id)).toEqual(["a", "z", "ä"]);
  } finally {
    String.prototype.localeCompare = original;
  }
});
```

Cover model arrays, physical DOFs, reference diagnostics, constraint order, and source-ID order. Do not leave a global monkey patch active across assertions.

### Step 2: Run RED

```bash
npx vitest run test/unit/identifier.test.ts test/integration/model-finalization.test.ts test/unit/reference-resolution.test.ts test/integration/constraint-compiler.test.ts
```

Expected: missing comparator or a deliberate `localeCompare used` failure.

### Step 3: Implement GREEN

Export this single comparator from `src/model/identifier.ts`:

```ts
export function compareIdentifiers(left: EntityId, right: EntityId): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
```

Replace every structural `localeCompare` under `src`. Keep numerical sorts numerical. Use `toSorted` where Oxlint requires a non-mutating sort.

### Step 4: Verify and commit

```bash
npx vitest run test/unit/identifier.test.ts test/integration/model-finalization.test.ts test/unit/reference-resolution.test.ts test/integration/constraint-compiler.test.ts
npm run typecheck
npx oxlint src/model/identifier.ts src/model/model-finalizer.ts src/model/dof-topology.ts src/model/reference-resolution.ts src/constraints/compile-constraints.ts src/constraints/constraint-rank.ts test/unit/identifier.test.ts test/integration/model-finalization.test.ts test/unit/reference-resolution.test.ts test/integration/constraint-compiler.test.ts
npx oxfmt --check src/model/identifier.ts src/model/model-finalizer.ts src/model/dof-topology.ts src/model/reference-resolution.ts src/constraints/compile-constraints.ts src/constraints/constraint-rank.ts test/unit/identifier.test.ts test/integration/model-finalization.test.ts test/unit/reference-resolution.test.ts test/integration/constraint-compiler.test.ts
rg -n "localeCompare" src && exit 1 || true
git add src test
git commit -m "fix: make structural ordering host independent"
```

## Task 2: Replace FNV model identity with synchronous SHA-256 (XF-001)

**Files**

- Create: `src/serialization/sha-256.ts`
- Create: `test/unit/model-fingerprint.test.ts`
- Modify: `src/model/model-fingerprint.ts`
- Modify: `test/integration/model-finalization.test.ts`
- Modify: `test/unit/loads.test.ts`
- Modify: `test/integration/combinations.test.ts`

### Step 1: Write RED tests

Test published empty-string and `abc` SHA-256 vectors, 55/56/63/64/65-byte block boundaries, UTF-8 Unicode against Web Crypto, and the known old-FNV collision:

```ts
const collisionAreas = [0.00015793100000000002, 0.000164232] as const;

it("FR-SAFE-001: separates the reproduced FNV collision", () => {
  const values = collisionAreas.map((area) => canonicalModelValue(area));
  expect(legacyFnv(values[0])).toBe(legacyFnv(values[1]));
  expect(computeModelFingerprint(values[0])).not.toBe(computeModelFingerprint(values[1]));
});

it("FR-SAFE-001: emits canonical SHA-256 identities", () => {
  expect(model().finalize().fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
});
```

The test-local FNV helper proves the fixture remains a collision. Do not run a probabilistic search in tests.

### Step 2: Run RED

```bash
npx vitest run test/unit/model-fingerprint.test.ts test/integration/model-finalization.test.ts test/unit/loads.test.ts test/integration/combinations.test.ts
```

Expected: `sha-256.ts` is absent and existing fingerprints start with `fnv1a32:`.

### Step 3: Implement GREEN

- Implement browser-safe synchronous `sha256Hex(text)` with `TextEncoder`, fixed 32-bit words, standard SHA-256 constants, and no Node import or dependency.
- Remove the duplicate canonical serializer from `model-fingerprint.ts`.
- Hash `canonicalJson(value)` and return `sha256:${digest}`.
- Preserve `computeModelFingerprint(value): string`.
- Keep `artifactHash` async and unchanged.
- Update compatibility-prefix expectations and retain the `combineResults` mismatch test.

### Step 4: Verify and commit

```bash
npx vitest run test/unit/model-fingerprint.test.ts test/integration/model-finalization.test.ts test/unit/loads.test.ts test/integration/combinations.test.ts
npm run typecheck
npm run check:runtime
npx oxlint src/serialization/sha-256.ts src/model/model-fingerprint.ts test/unit/model-fingerprint.test.ts test/integration/model-finalization.test.ts test/unit/loads.test.ts test/integration/combinations.test.ts
npx oxfmt --check src/serialization/sha-256.ts src/model/model-fingerprint.ts test/unit/model-fingerprint.test.ts test/integration/model-finalization.test.ts test/unit/loads.test.ts test/integration/combinations.test.ts
git add src test
git commit -m "fix: use canonical sha256 model fingerprints"
```

## Task 3: Require envelope compatibility identity (XF-014)

**Files**

- Modify: `src/results/result-types.ts`
- Modify: `src/results/stream-envelope.ts`
- Modify: `src/index.ts`
- Modify: `test/integration/stream-envelope.test.ts`
- Modify: `test/unit/public-api-snapshot.test.ts`

### Step 1: Write RED tests

Add `FR-SAFE-014` cases for absent metadata and each mismatch reason. Ensure validation happens before values are read:

```ts
it("FR-SAFE-014: rejects a model mismatch before reading values", () => {
  let read = false;
  const record = {
    ...baseRecord,
    compatibility: { ...compatibility, modelFingerprint: otherFingerprint },
    get values() {
      read = true;
      return [1];
    },
  };
  expect(() => streamEnvelope([baseRecord, record], components)).toThrowError(
    /model fingerprints differ/u,
  );
  expect(read).toBe(false);
});
```

Also cover unit-system, conventions, metadata component layout, supplied component layout, immutability, and the existing 150,000-record stream.

### Step 2: Run RED

```bash
npx vitest run test/integration/stream-envelope.test.ts test/unit/public-api-snapshot.test.ts
```

Expected: types/helper are absent and bare records are accepted.

### Step 3: Implement GREEN

- Add immutable `EnvelopeCompatibility` containing `modelFingerprint`, complete `unitSystem`, `conventions`, and ordered `components`.
- Require it on `EnvelopeInputRecord`.
- Add public `createEnvelopeCompatibility(result, components)` that copies and freezes nested metadata.
- Normalize supplied components once.
- Validate first metadata against supplied components and every later metadata against both before reading `values`.
- Throw `RESULT_INCOMPATIBLE` with the exact design reasons.

### Step 4: Verify and commit

```bash
npx vitest run test/integration/stream-envelope.test.ts test/unit/public-api-snapshot.test.ts
npm run typecheck
npx oxlint src/results/result-types.ts src/results/stream-envelope.ts src/index.ts test/integration/stream-envelope.test.ts test/unit/public-api-snapshot.test.ts
npx oxfmt --check src/results/result-types.ts src/results/stream-envelope.ts src/index.ts test/integration/stream-envelope.test.ts test/unit/public-api-snapshot.test.ts
git add src test
git commit -m "fix: require envelope compatibility metadata"
```

## Task 4: Canonicalize affine constraints by coefficient scale (XF-003)

**Files**

- Modify: `src/constraints/canonicalize-constraint.ts`
- Modify: `test/unit/constraint-canonicalization.test.ts`
- Modify: `test/integration/constraint-compiler.test.ts`

### Step 1: Write RED tests

Use finite scalar multiples spanning `1e-300` through `1e300`, positive and negative, while choosing base values that keep products finite. Include duplicate cancellation and RHS independence:

```ts
it.each([1e-300, -1e-300, 1e-120, -1, 1e120, 1e300])(
  "FR-SAFE-003: canonical topology is invariant at scale %s",
  (scale) => {
    expect(canonicalizeConstraint(scaledEquation(scale))).toEqual(referenceEquation);
  },
);

it("FR-SAFE-003: treats every exact nonzero zero-term RHS as contradictory", () => {
  expect(() =>
    canonicalizeConstraint({ sourceId: "c", terms: [], rightHandSide: Number.MIN_VALUE }),
  ).toThrowError(/contradict/u);
});
```

### Step 2: Run RED

```bash
npx vitest run test/unit/constraint-canonicalization.test.ts test/integration/constraint-compiler.test.ts
```

Expected: sub-unit coefficients disappear or tiny nonzero identities are accepted.

### Step 3: Implement GREEN

- Accumulate duplicate coefficients and track the largest absolute original coefficient in one bounded loop.
- Prune summed coefficients relative only to that coefficient scale.
- Do not use an absolute floor of `1` or RHS magnitude to decide coefficient existence.
- If no term survives, accept only exact RHS zero.
- Normalize terms and RHS by the same deterministic first surviving coefficient/sign.
- Finite-check arithmetic using existing boundaries/errors.

### Step 4: Verify and commit

```bash
npx vitest run test/unit/constraint-canonicalization.test.ts test/integration/constraint-compiler.test.ts
npm run typecheck
npx oxlint src/constraints/canonicalize-constraint.ts test/unit/constraint-canonicalization.test.ts test/integration/constraint-compiler.test.ts
npx oxfmt --check src/constraints/canonicalize-constraint.ts test/unit/constraint-canonicalization.test.ts test/integration/constraint-compiler.test.ts
git add src/constraints/canonicalize-constraint.ts test/unit/constraint-canonicalization.test.ts test/integration/constraint-compiler.test.ts
git commit -m "fix: normalize affine constraints by coefficient scale"
```

## Task 5: Make constraint rank elimination scale-relative (XF-003)

**Files**

- Modify: `src/constraints/constraint-rank.ts`
- Modify: `test/unit/constraint-rank.test.ts`
- Modify: `test/regression/constraint-failures.test.ts`

### Step 1: Write RED tests

Add `FR-SAFE-003` rows that become redundant or contradictory after cancellation at small/large and negative scales. Assert rank, redundant IDs, pivot DOFs, and contradiction code—not merely that an error occurs.

### Step 2: Run RED

```bash
npx vitest run test/unit/constraint-rank.test.ts test/regression/constraint-failures.test.ts
```

Expected: current floor/RHS-dependent pruning changes classification.

### Step 3: Implement GREEN

- Add loop-based maximum-absolute-map-value and minimum-map-key helpers.
- Derive coefficient cancellation scale from contributing coefficient rows before subtraction.
- Track RHS cancellation scale separately; RHS never decides whether a coefficient exists.
- Normalize each retained row by the deterministic pivot.
- Apply the same rule during backward elimination.
- Reject nonfinite intermediate arithmetic structurally; never regularize.

### Step 4: Verify and commit

```bash
npx vitest run test/unit/constraint-rank.test.ts test/regression/constraint-failures.test.ts
npm run typecheck
npx oxlint src/constraints/constraint-rank.ts test/unit/constraint-rank.test.ts test/regression/constraint-failures.test.ts
npx oxfmt --check src/constraints/constraint-rank.ts test/unit/constraint-rank.test.ts test/regression/constraint-failures.test.ts
git add src/constraints/constraint-rank.ts test/unit/constraint-rank.test.ts test/regression/constraint-failures.test.ts
git commit -m "fix: use scale relative constraint elimination"
```

## Task 6: Remove model-sized variadic and recursive stack hazards (XF-013)

**Files**

- Create: `test/regression/large-array-reductions.test.ts`
- Modify: `src/constraints/compile-constraints.ts`
- Modify: `src/analysis/prepare-analysis.ts`
- Modify: `src/linalg/skyline-profile.ts`
- Modify constraint files from Tasks 4–5 only if a remaining model-sized spread is found

### Step 1: Write RED tests

Add `FR-SAFE-013` coverage for:

- a canonical/rank row with 250,000 unique terms;
- an equal-DOF cycle containing at least 250,000 total terms, producing `CONSTRAINT_CYCLE`, never `RangeError`;
- 250,000 skyline row widths through a loop-based exported/internal helper.

Keep the successful large case sparse and linear-time; never build a dense matrix or O(n²) successful elimination.

### Step 2: Run RED

```bash
npx vitest run test/regression/large-array-reductions.test.ts
```

Expected: native `RangeError`, recursive overflow, or missing skyline helper.

### Step 3: Implement GREEN

- Replace model-sized variadic max/min/pivot selection with loops.
- Replace recursive equal-DOF DFS with an explicit stack storing node, parent, and neighbor position.
- Add and use `maximumSkylineRowWidth(firstColumns)`.
- Leave fixed-size three-, six-, and twelve-component local reductions alone.

### Step 4: Verify and commit

```bash
npx vitest run test/regression/large-array-reductions.test.ts test/unit/constraint-canonicalization.test.ts test/unit/constraint-rank.test.ts
npm run typecheck
npx oxlint src/constraints/compile-constraints.ts src/analysis/prepare-analysis.ts src/linalg/skyline-profile.ts test/regression/large-array-reductions.test.ts
npx oxfmt --check src/constraints/compile-constraints.ts src/analysis/prepare-analysis.ts src/linalg/skyline-profile.ts test/regression/large-array-reductions.test.ts
git add src test/regression/large-array-reductions.test.ts
git commit -m "fix: bound model sized reductions and traversals"
```

## Task 7: Add eccentric-truss kinematics and topology (XF-002)

**Files**

- Create: `src/elements/truss/rigid-offset-kinematics.ts`
- Create: `test/unit/truss-rigid-offset-kinematics.test.ts`
- Modify: `src/model/dof-topology.ts`
- Modify: `src/analysis/element-equation-map.ts`
- Modify: `test/unit/dof-topology.test.ts`
- Modify: `test/regression/truss-mechanism-topology.test.ts`

### Step 1: Write RED tests

Test the exact compatibility vector, rigid-body displacement, work conjugacy, topology, and zero-offset fast path:

```ts
it("FR-SAFE-002: maps eccentric truss compatibility and force work exactly", () => {
  const kinematics = createTrussRigidOffsetKinematics(n, rA, rB);
  const delta = dot(kinematics.compatibility, referenceDisplacements);
  const endpointDisplacements = kinematics.elasticTranslations(referenceDisplacements);
  expect(delta).toBeCloseTo(
    dot(n, subtract(end(endpointDisplacements), start(endpointDisplacements))),
    14,
  );
  expect(dot(referenceActions, referenceDisplacements)).toBeCloseTo(
    dot(elasticActions, endpointDisplacements),
    14,
  );
});
```

Assert compatibility order `[-n, -(rA×n), +n, +(rB×n)]`, all six reference DOFs at every nonzero-offset endpoint, and translations only for exact zero offsets.

### Step 2: Run RED

```bash
npx vitest run test/unit/truss-rigid-offset-kinematics.test.ts test/unit/dof-topology.test.ts test/regression/truss-mechanism-topology.test.ts
```

Expected: helper absent and offset rotations unavailable.

### Step 3: Implement GREEN

- Reuse `transferRigidBodyDisplacement` and `transferRigidEndpointForceToNode` from `src/geometry/rigid-offset.ts`.
- Produce fixed twelve-reference-component compatibility plus the active equation-map ordering.
- Convert active reference displacements to six elastic translations.
- Convert six elastic end forces to twelve reference actions, then gather active components.
- Request all rotations at each nonzero-offset endpoint and only translations otherwise.
- Preserve the existing six-translation map for zero-offset trusses.

### Step 4: Verify and commit

```bash
npx vitest run test/unit/truss-rigid-offset-kinematics.test.ts test/unit/dof-topology.test.ts test/regression/truss-mechanism-topology.test.ts
npm run typecheck
npm run check:dense
npx oxlint src/elements/truss/rigid-offset-kinematics.ts src/model/dof-topology.ts src/analysis/element-equation-map.ts test/unit/truss-rigid-offset-kinematics.test.ts test/unit/dof-topology.test.ts test/regression/truss-mechanism-topology.test.ts
npx oxfmt --check src/elements/truss/rigid-offset-kinematics.ts src/model/dof-topology.ts src/analysis/element-equation-map.ts test/unit/truss-rigid-offset-kinematics.test.ts test/unit/dof-topology.test.ts test/regression/truss-mechanism-topology.test.ts
git add src test
git commit -m "feat: add eccentric truss kinematics"
```

## Task 8: Assemble eccentric truss stiffness, loads, and recovery (XF-002)

**Files**

- Create: `test/integration/truss-rigid-offset.test.ts`
- Modify: `src/analysis/assemble-stiffness.ts`
- Modify: `src/analysis/assemble-load-case.ts`
- Modify: `src/results/result-factory.ts`
- Modify: `test/integration/global-assembly.test.ts`
- Modify: `test/regression/global-mechanisms.test.ts`

### Step 1: Write RED tests

Add `FR-SAFE-002` integration tests for:

- direct eccentric entries `(EA/L) BᵀB`;
- corrected two-spring model: `thetaA=2/3`, `thetaB=1/3`, `|N|=1000/3`;
- free-B model: `thetaA=thetaB=1`, `N=0`;
- genuinely free offset rotations yielding `GLOBAL_MECHANISM`;
- truss self-weight rigid-arm moments.

Assert full structured error codes and equilibrium, not just approximate displacements.

### Step 2: Run RED

```bash
npx vitest run test/unit/truss-rigid-offset-kinematics.test.ts test/integration/truss-rigid-offset.test.ts test/integration/global-assembly.test.ts test/regression/global-mechanisms.test.ts
```

Expected: rotational constraints are unavailable or six-translation mechanics produces wrong rotations/forces/moments.

### Step 3: Implement GREEN

- Retain the existing fixed 6×6 zero-offset kernel.
- For eccentric trusses, scatter `(EA/L)B[row]B[column]` directly through `SymmetricCoordinateBuilder`.
- Transform each self-weight elastic endpoint force through the rigid arm before scatter.
- Gather active reference displacements, transform to elastic translations, and call `recoverTrussResult`.
- Keep reference actions internal until the atomic schema-v2 task; do not prematurely change result schema 1.
- Never constrain or stiffen free rotations.

### Step 4: Verify and commit

```bash
npx vitest run test/integration/truss-rigid-offset.test.ts test/integration/global-assembly.test.ts test/regression/global-mechanisms.test.ts verification/analytical/truss-spring-cases.test.ts
npm run typecheck
npm run check:dense
npx oxlint src/analysis/assemble-stiffness.ts src/analysis/assemble-load-case.ts src/results/result-factory.ts test/integration/truss-rigid-offset.test.ts test/integration/global-assembly.test.ts test/regression/global-mechanisms.test.ts
npx oxfmt --check src/analysis/assemble-stiffness.ts src/analysis/assemble-load-case.ts src/results/result-factory.ts test/integration/truss-rigid-offset.test.ts test/integration/global-assembly.test.ts test/regression/global-mechanisms.test.ts
git add src test
git commit -m "fix: assemble complete truss rigid offset mechanics"
```

## Task 9: Expose endpoint-sided frame actions (XF-007)

**Files**

- Modify: `src/results/frame-internal-forces.ts`
- Modify: `test/integration/internal-forces.test.ts`

### Step 1: Write RED tests

Add `FR-SAFE-007` point-force and point-moment cases at `x=0` and `x=L`. Assert both sides and the complete jump, including nonzero `x=L,left` shear/moment and post-action `x=L,right`.

### Step 2: Run RED

```bash
npx vitest run test/integration/internal-forces.test.ts
```

Expected: endpoint coordinates produce only `single` records.

### Step 3: Implement GREEN

Add every point-action coordinate—including `0` and `L`—to `pointCoordinates`. Preserve `pointIncluded` and all sign conventions.

### Step 4: Verify and commit

```bash
npx vitest run test/integration/internal-forces.test.ts
npx oxlint src/results/frame-internal-forces.ts test/integration/internal-forces.test.ts
npx oxfmt --check src/results/frame-internal-forces.ts test/integration/internal-forces.test.ts
git add src/results/frame-internal-forces.ts test/integration/internal-forces.test.ts
git commit -m "fix: expose endpoint sided frame actions"
```

## Task 10: Implement exact frame-force polynomial kernels (XF-004)

**Files**

- Create: `test/unit/frame-internal-forces.test.ts`
- Modify: `src/results/frame-internal-forces.ts`
- Add internal types in that module; defer public result types/schema to Task 11

### Step 1: Write RED tests

Add `FR-SAFE-004` tests for:

- model-wide boundary union;
- constant and linearly varying distributed loads;
- all six force/moment components;
- point jumps at boundaries;
- local-`xi` four-coefficient tuples;
- exact linear/quadratic derivative roots inside a segment;
- exact degree-degenerate and double-root handling;
- a synthetic linear combination with an extremum absent from both source station lists.

Cross-check polynomial evaluation against the existing direct equilibrium evaluator at representative points.

### Step 2: Run RED

```bash
npx vitest run test/unit/frame-internal-forces.test.ts
```

Expected: segment/coefficient/root helpers do not exist.

### Step 3: Implement GREEN

- Build boundaries from `0`, `L`, every model load-case distributed start/end, and every point coordinate.
- Represent each component with `[c0,c1,c2,c3]` at `xi=x-start`.
- Derive coefficients from start actions and resolved loads using the same sign convention as `recoverFrameInternalForces`.
- Treat point actions as boundary jumps, never within-segment polynomials.
- Solve derivative polynomials analytically with a cancellation-resistant quadratic formula.
- Select polynomial degree by exact represented coefficients and accept roots only for strict `0 < xi < segmentLength`; add no epsilon or sampling.
- Add pure helpers to evaluate/add segment coefficients and derive stations.

### Step 4: Verify and commit

```bash
npx vitest run test/unit/frame-internal-forces.test.ts test/integration/internal-forces.test.ts
npm run typecheck
npx oxlint src/results/frame-internal-forces.ts test/unit/frame-internal-forces.test.ts test/integration/internal-forces.test.ts
npx oxfmt --check src/results/frame-internal-forces.ts test/unit/frame-internal-forces.test.ts test/integration/internal-forces.test.ts
git add src/results/frame-internal-forces.ts test/unit/frame-internal-forces.test.ts test/integration/internal-forces.test.ts
git commit -m "feat: add exact frame force polynomial kernels"
```

## Task 11: Publish complete result schema v2 atomically (XF-002, XF-004)

Do not publish a partial schema v2. This one task introduces both new required result fields together.

**Files**

- Modify: `src/results/result-types.ts`
- Modify: `src/results/result-factory.ts`
- Modify: `src/results/combine-results.ts`
- Modify: `src/results/frame-internal-forces.ts`
- Modify: `src/serialization/result-schema.ts`
- Modify: `src/serialization/parse-result-json.ts`
- Modify: `schemas/result.schema.json`
- Modify: `src/index.ts`
- Modify: `test/integration/truss-rigid-offset.test.ts`
- Modify: `test/integration/internal-forces.test.ts`
- Modify: `test/integration/combinations.test.ts`
- Modify: `test/unit/result-json.test.ts`
- Modify: `test/unit/json-schema-files.test.ts`
- Modify: `test/unit/result-immutability.test.ts`

### Step 1: Write RED tests

Add tests asserting:

```ts
it("FR-SAFE-002/FR-SAFE-004: round trips complete result schema v2", () => {
  const value = resultToJsonValue(result);
  expect(value.schemaVersion).toBe("2");
  expect(value.result.trusses[0]?.globalReferenceEndForces).toHaveLength(12);
  expect(value.result.frames[0]?.internalForceSegments.length).toBeGreaterThan(0);
  expect(parseResultJson(JSON.stringify(value))).toEqual(value.result);
});
```

Also assert:

- six elastic `globalEndForces` remain unchanged;
- twelve frozen `globalReferenceEndForces` include `r×F` moments;
- `FrameResult.internalForceSegments` is contiguous and frozen;
- simply supported 10 m, `q=1000` contains `x=5`, `|M|=12500`;
- arbitrary combination coefficients produce a new closed-form extremum absent from source station lists;
- v1 rejects with `SCHEMA_UNSUPPORTED`;
- malformed/noncontiguous/nonfinite segments reject;
- model fingerprints match exact SHA format.

### Step 2: Run RED

```bash
npx vitest run test/integration/truss-rigid-offset.test.ts test/integration/internal-forces.test.ts test/integration/combinations.test.ts test/unit/result-json.test.ts test/unit/json-schema-files.test.ts test/unit/result-immutability.test.ts
```

Expected: new fields/version are absent; combinations rely on station-array equality.

### Step 3: Implement GREEN

- Add `globalReferenceEndForces` to `TrussElementResult` in `[Fx,Fy,Fz,Mx,My,Mz]` start-then-end order.
- Add `internalForceSegments` to `FrameResult`, with six fixed four-coefficient tuples per segment.
- Populate both in `result-factory` using Tasks 7–10 helpers.
- In `combineResults`, require matching segment boundaries/layout, combine coefficients first, and regenerate discontinuities/extrema. Stop requiring equal derived station arrays.
- Combine reference truss actions component-wise.
- Set `RESULT_SCHEMA_VERSION = "2"` and export `ResultJsonV2`.
- Update runtime parser and JSON Schema together; require both new fields and exact SHA fingerprint format.
- Reject every non-v2 result before body interpretation.
- Export new public types from `src/index.ts`.

### Step 4: Verify and commit

```bash
npx vitest run test/unit/frame-internal-forces.test.ts test/integration/truss-rigid-offset.test.ts test/integration/internal-forces.test.ts test/integration/combinations.test.ts test/unit/result-json.test.ts test/unit/json-schema-files.test.ts test/unit/result-immutability.test.ts
npm run typecheck
npm run check:dense
npx oxlint src/results/result-types.ts src/results/result-factory.ts src/results/combine-results.ts src/results/frame-internal-forces.ts src/serialization/result-schema.ts src/serialization/parse-result-json.ts src/index.ts test/integration/truss-rigid-offset.test.ts test/integration/internal-forces.test.ts test/integration/combinations.test.ts test/unit/result-json.test.ts test/unit/json-schema-files.test.ts test/unit/result-immutability.test.ts
npx oxfmt --check src/results/result-types.ts src/results/result-factory.ts src/results/combine-results.ts src/results/frame-internal-forces.ts src/serialization/result-schema.ts src/serialization/parse-result-json.ts schemas/result.schema.json src/index.ts test/integration/truss-rigid-offset.test.ts test/integration/internal-forces.test.ts test/integration/combinations.test.ts test/unit/result-json.test.ts test/unit/json-schema-files.test.ts test/unit/result-immutability.test.ts
git add src schemas/result.schema.json test
git commit -m "feat: publish exact result schema v2"
```

## Task 12: Add reproducible OpenSees and Windows Frame3DD evidence

**Files**

- Create: `verification/external/opensees-eccentric-truss.test.ts`
- Create: `verification/reference-data/opensees/eccentric-truss.tcl`
- Create: `verification/reference-data/opensees/eccentric-truss-reference.json`
- Create: `scripts/verify-opensees.mjs`
- Modify: `scripts/regenerate-frame3dd-reference.mjs`
- Modify: `scripts/verify-frame3dd.mjs`
- Modify: `package.json`
- Modify: `test/specification/release-readiness.test.ts`

### Step 1: Write RED tests

Add `FR-SAFE-002` committed-reference and release-readiness assertions for the Tcl/reference/script/package command, OpenSees 3.8.0 identity, and approved hashes.

### Step 2: Run RED

```bash
npx vitest run verification/external/opensees-eccentric-truss.test.ts test/specification/release-readiness.test.ts
```

Expected: OpenSees assets and command are absent.

### Step 3: Implement GREEN

- Model rigid links from reference nodes to elastic nodes, a truss between elastic nodes, two `rz=1000` springs, and `M_A=1000`.
- Store exact input hash, executable identity, `thetaA`, `thetaB`, and `|N|` in reference JSON.
- `verify-opensees.mjs` requires `OPENSEES_BIN`, verifies SHA-256 `5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d`, runs in a temporary directory, parses deterministic output, compares reference values, and leaves the repository unchanged.
- Add `verify:opensees` to `package.json`.
- Permit both approved Frame3DD identities, including Windows SHA-256 `ad7056c210ad413c37d3627b8e9868fdc40ce09d76f167f2d5f98077d3aad626`, without changing numerical reference meaning.

### Step 4: Verify and commit

```bash
npx vitest run verification/external/opensees-eccentric-truss.test.ts test/specification/release-readiness.test.ts
OPENSEES_BIN=D:/DEV/tools/OpenSees3.8.0/bin/OpenSees.exe npm run verify:opensees
FRAME3DD_BIN=D:/DEV/tools/Frame3DD/windows/frame3dd.exe npm run verify:frame3dd
npm run typecheck
npx oxlint verification/external/opensees-eccentric-truss.test.ts scripts/verify-opensees.mjs scripts/regenerate-frame3dd-reference.mjs scripts/verify-frame3dd.mjs test/specification/release-readiness.test.ts
npx oxfmt --check verification/external/opensees-eccentric-truss.test.ts verification/reference-data/opensees/eccentric-truss.tcl verification/reference-data/opensees/eccentric-truss-reference.json scripts/verify-opensees.mjs scripts/regenerate-frame3dd-reference.mjs scripts/verify-frame3dd.mjs package.json test/specification/release-readiness.test.ts
git add verification scripts package.json test/specification/release-readiness.test.ts
git commit -m "test: verify eccentric truss against opensees"
```

## Task 13: Update current-facing contracts and evidence

**Files**

- Create: `docs/verification/safety-correctness-report.md`
- Modify: `README.md`
- Modify: `docs/api/public-api.md`
- Modify: `docs/api/json-input.md`
- Modify: `docs/architecture/system-architecture.md`
- Modify: `docs/engineering-use.md`
- Modify: `docs/theory/numerical-conventions.md`
- Modify: `docs/theory/structural-model.md`
- Modify: `docs/theory/solution-and-results.md`
- Modify current verification/roadmap reports that state superseded behavior
- Modify: `test/specification/documentation.test.ts`
- Modify: `test/specification/release-readiness.test.ts`

### Step 1: Write RED tests

Assert current docs mention SHA-256, model schema 1/result schema 2, strict envelope metadata, `createEnvelopeCompatibility`, eccentric-truss rotations/reference actions, exact polynomial coefficients/extrema, endpoint sides, and OpenSees evidence.

### Step 2: Run RED

```bash
npx vitest run test/specification/documentation.test.ts test/specification/release-readiness.test.ts
```

Expected: current docs contain FNV/schema-1/translation-only/station-only claims.

### Step 3: Implement GREEN

- Document actual public signatures and v1 result rejection.
- Document `B`, rigid-arm load transfer, physical rotation mechanisms, both truss force arrays, fixed cubic coefficient layout, local `xi`, analytical roots, endpoint limits, and coefficient-first combinations.
- Add supersession notes to historical reports rather than rewriting historical execution counts.
- Record actual commands, versions, hashes, tolerances, and outputs in the new report; never invent counts.

### Step 4: Verify and commit

```bash
npx vitest run test/specification/documentation.test.ts test/specification/release-readiness.test.ts
npx oxfmt --check README.md docs
npx oxlint test/specification/documentation.test.ts test/specification/release-readiness.test.ts
git add README.md docs test/specification
git commit -m "docs: record safety correctness remediation"
```

## Task 14: Repair known pre-existing native acceptance-gate blockers

This task is required by `AGENTS.md` and the design acceptance clause. It does not broaden product behavior. Keep mechanical cleanup separate from safety commits.

**Known blockers**

- Oxfmt reports 152 existing files.
- Oxlint reports existing mutation, shadowing, conditional-expect, missing-expect, ambiguous-array, and erasing-operation violations.
- `test/integration/internal-forces.test.ts` has an existing `number | undefined` type error.
- `scripts/check-runtime-imports.mjs` constructs a malformed Windows root path.

**Files**

- Modify only files named by current formatter/linter/type/runtime output.
- Likely modify: `.oxfmtrc.json`, source/test/verification/scripts files reported by those tools.
- Do not lower coverage thresholds or disable lint rules.

### Step 1: Capture focused baseline

```bash
npm run format:check
npm run lint
npm run typecheck
npm run check:runtime
```

Confirm failures match known categories. This is not `npm run check`.

### Step 2: Apply mechanical fixes

- Run `npm run format` once and isolate that mechanical diff.
- Replace mutating sorts/reverses with non-mutating standard methods where semantics match.
- Refactor conditional expectations into captured values followed by unconditional expectations.
- Make assertion helpers return asserted data or add explicit expectations.
- Rename shadowed bindings/remove unused imports.
- Correct genuine erasing operations rather than suppressing them.
- Fix the internal-force type narrowing.
- Resolve the runtime-check root using URL/path APIs without concatenating a drive prefix twice.
- Add no lint disables unless a reviewer proves the rule is inapplicable and documents why.

### Step 3: Verify gate components

```bash
npm run format:check
npm run lint
npm run typecheck
npm run check:runtime
npm run check:dense
```

Run focused Vitest files for every nontrivial test/helper edit. Do not run `npm run check` yet.

### Step 4: Commit

```bash
git diff --check
git add -A
git commit -m "chore: restore native repository gates"
```

## Task 15: Final external, aggregate, and independent acceptance

### Step 1: Run external oracles

```bash
OPENSEES_BIN=D:/DEV/tools/OpenSees3.8.0/bin/OpenSees.exe npm run verify:opensees
FRAME3DD_BIN=D:/DEV/tools/Frame3DD/windows/frame3dd.exe npm run verify:frame3dd
```

### Step 2: Run the aggregate gate once

```bash
npm run check
git diff --check
git status --short
```

Expected: all commands exit zero; status is clean; no coverage threshold is weakened.

### Step 3: Search forbidden regressions

```bash
rg -n "\.skip\(|\.only\(|\.todo\(" test verification && exit 1 || true
rg -n "localeCompare|fnv1a32" src && exit 1 || true
rg -n "node:" src && exit 1 || true
```

### Step 4: Final whole-branch review

Dispatch a fresh `openai-codex/gpt-5.6-sol:max` reviewer over the complete range from design commit `e43c599` to `HEAD`. Require requirement-by-requirement findings, command evidence, schema/mechanics/numerics review, and residual risks. Any blocker returns to the owning implementer session and must receive fresh focused validation and re-review before acceptance.

No final commit is created unless a reviewed fix is required.

## Task dependency graph

- Task 2 depends on Task 1 so fingerprints are computed from deterministic structural order.
- Task 3 depends on Task 2 for the final model identity contract.
- Task 5 depends on Task 4 normalized rows.
- Task 6 depends on Tasks 4–5 so bounded helpers are not duplicated.
- Task 8 depends on Task 7 kinematics/topology.
- Task 10 depends on Task 9 endpoint semantics.
- Task 11 depends on Tasks 2, 7–10 and is the only result-schema-version change.
- Task 12 depends on completed Task 8 mechanics and Task 11 public results.
- Task 13 depends on all production/schema/oracle behavior.
- Task 14 follows domain work to keep baseline mechanical cleanup separate.
- Task 15 depends on every accepted task and is the only aggregate `npm run check`.

## Residual implementation risks to review explicitly

1. SHA-256 padding/block boundaries and UTF-8 encoding.
2. Constraint pre-cancellation coefficient scale versus separately scaled RHS classification.
3. Exact work conjugacy and sign order for `r×F` reference moments.
4. Physical mechanisms exposed by newly active eccentric-joint rotations.
5. Frame endpoint exterior/interior signs at both `0` and `L`.
6. Polynomial moment signs and cancellation-resistant derivative roots without epsilon fabrication.
7. Atomic result-schema-v2 publication; no partial v2 commit.
8. Large-input tests remaining sparse/linear rather than exhausting memory.
9. External executable/hash provenance and non-destructive temporary output.
10. Mechanical gate cleanup not masking behavior or weakening checks.
