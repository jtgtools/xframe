# Part 03: Units, Geometry, and Coordinate Systems — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement exact unit metadata, finite/tolerance utilities, 3D vector and fixed-size transform kernels, local-axis construction, and rigid-offset geometry.

## Prerequisites

Parts 00 through 02 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/units/unit-system.ts`
- `src/geometry/finite.ts`
- `src/geometry/tolerance.ts`
- `src/geometry/vector-3.ts`
- `src/geometry/matrix-3.ts`
- `src/geometry/local-axes.ts`
- `src/geometry/rigid-offset.ts`
- `test/unit/unit-system.test.ts`
- `test/unit/vector-3.test.ts`
- `test/unit/local-axes.test.ts`
- `test/property/geometry-properties.test.ts`

## Interface contracts

- `parseUnitSystem(unknown): UnitSystem`.
- `buildLocalAxes(start, end, orientation?): LocalAxes`.
- `resolveElasticGeometry(nodeI, nodeJ, offsetI, offsetJ): ElasticGeometry`.

## Mandatory execution discipline

- [x] Read this entire plan before changing files.
- [x] Mark this part `in-progress` in `docs/roadmap/progress.md`.
- [x] For each behavior, write a failing Vitest test and run it to prove the intended failure.
- [x] Implement the minimum mathematically correct behavior.
- [x] Per edit, run only what it touches (narrow test file, typecheck/lint/format on touched files); run `npm run check` once at part acceptance.
- [x] Never weaken a tolerance or expected result without written mathematical justification.
- [x] Never use `.skip`, `.only`, or `.todo`.
- [x] Never introduce silent restraints, arbitrary stiffness, swallowed errors, or unsupported implied behavior.

## Tasks

### Task 1: Implement exact unit schema

- [x] **1.1** Require exact versioned keys for length, force, moment, modulus, distributed force, density, and rotation.
- [x] **1.2** Reject missing/additional/misspelled keys.
- [x] **1.3** Do not implement conversion.

### Task 2: Implement finite and tolerance helpers

- [x] **2.1** Validate scalars and typed arrays.
- [x] **2.2** Implement combined absolute-relative comparison and scaled-zero checks.
- [x] **2.3** Test NaN, infinities, negative zero, subnormals, overflow, and mixed scales.

### Task 3: Implement vector/matrix primitives

- [x] **3.1** Provide add/subtract/dot/cross/norm/normalize/scale and fixed 3x3 transforms.
- [x] **3.2** Use copy-safe typed arrays.
- [x] **3.3** Verify algebraic identities and non-aliasing.

### Task 4: Implement local axes

- [x] **4.1** Create deterministic right-handed orthonormal bases.
- [x] **4.2** Reject zero length and near-parallel orientation vectors.
- [x] **4.3** Verify unit norms, orthogonality, determinant +1, fallback determinism, and connectivity reversal.

### Task 5: Implement rigid-offset geometry

- [x] **5.1** Compute deformable endpoints and elastic length.
- [x] **5.2** Reject overlapping/inverted elastic spans.
- [x] **5.3** Implement rigid-body displacement and force transfer.
- [x] **5.4** Verify virtual work and force/moment equilibrium.

## Required command sequence

During development, run the narrowest relevant Vitest file, for example:

```bash
npx vitest run path/to/test-file.test.ts
```

Before completion, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run verify
npm run build
npm run coverage
npm run check
```

Run `npm run benchmark` when this part introduces or changes numerical performance.

## Review checklist

- [x] Every public behavior has a requirement ID.
- [x] Every touched requirement has tests.
- [x] Errors use stable structured codes and contexts.
- [x] Inputs and intermediate numerical boundaries reject non-finite values.
- [x] Untrusted identifiers are never stored in ordinary object prototypes.
- [x] Caller-owned mutable arrays/objects are not retained.
- [x] No dense global numerical allocation was introduced.
- [x] Browser-safe runtime boundaries remain intact.
- [x] Documentation describes only implemented behavior.
- [x] All required commands pass.

## Required evidence

Store property-test seeds and representative orthogonality/equilibrium results in `docs/verification/geometry-report.md`.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Geometry passes finite, handedness, orthogonality, reversal, virtual-work, and rigid-offset equilibrium tests with documented tolerances.

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [x] Required benchmark/verification evidence is stored.
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied.
