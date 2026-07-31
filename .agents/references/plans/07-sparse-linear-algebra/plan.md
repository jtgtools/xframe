# Part 07: Sparse Linear Algebra — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement domain-independent sparse symmetric assembly, RCM ordering, skyline/profile storage, Cholesky factorization, multiple RHS solves, residuals, and memory guards.

## Prerequisites

Parts 00 through 06 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/linalg/symmetric-coordinate-matrix.ts`
- `src/linalg/adjacency.ts`
- `src/linalg/reverse-cuthill-mckee.ts`
- `src/linalg/skyline-profile.ts`
- `src/linalg/skyline-cholesky.ts`
- `src/linalg/residual.ts`
- `src/linalg/memory-estimate.ts`
- `test/unit/sparse-assembly.test.ts`
- `test/unit/rcm.test.ts`
- `test/unit/skyline-cholesky.test.ts`
- `test/property/linalg-properties.test.ts`
- `scripts/run-linalg-benchmarks.ts`

## Interface contracts

- Sparse assembly accepts lower-triangle `(row, column, value)` contributions.
- Factorization returns an immutable solver plus pivot diagnostics.
- Memory estimation executes before typed-array allocation.

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

### Task 1: Define swappable interfaces

- [x] **1.1** Specify assembly, ordering, symbolic profile, factorization, and RHS solve boundaries.
- [x] **1.2** Fix zero-based index and symmetry invariants.

### Task 2: Implement coordinate assembly

- [x] **2.1** Combine duplicate entries deterministically.
- [x] **2.2** Reject non-finite contributions.
- [x] **2.3** Test insertion-order invariance and hand matrices.

### Task 3: Implement adjacency and RCM

- [x] **3.1** Use stable tie-breaking and disconnected-component handling.
- [x] **3.2** Verify known bandwidth/profile examples.

### Task 4: Implement skyline/profile conversion

- [x] **4.1** Compute profile starts and storage using overflow-safe arithmetic.
- [x] **4.2** Reject configured memory excess before allocation.
- [x] **4.3** Verify exact hand storage.

### Task 5: Implement Cholesky and solves

- [x] **5.1** Implement SPD skyline Cholesky, scaled pivot checks, single/multiple RHS solves.
- [x] **5.2** Return structured failures for non-SPD/singular systems.

### Task 6: Implement residual/energy helpers

- [x] **6.1** Use original sparse matrix for matvec, residual norms, and quadratic forms.
- [x] **6.2** Compare with dense calculations only in tests.

### Task 7: Benchmark and dense guard

- [x] **7.1** Benchmark synthetic SPD systems.
- [x] **7.2** Add a source/static guard against production `n*n` global allocation patterns.

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

Store raw linalg benchmark JSON and hand-matrix comparison tables in `docs/verification/linalg-report.md`.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

All hand/property systems solve within justified tolerances, invalid pivots fail structurally, memory is prechecked, and no production dense global matrix exists.

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [x] Required benchmark/verification evidence is stored.
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied.
