# Part 06: Loads, Cases, and Combinations — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement unambiguous loads, self-weight prerequisites, globally unique result identities, safe combination graphs, and load provenance.

## Prerequisites

Parts 00 through 05 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/loads/nodal-load.ts`
- `src/loads/member-point-load.ts`
- `src/loads/distributed-load.ts`
- `src/loads/self-weight.ts`
- `src/loads/load-case.ts`
- `src/loads/load-combination.ts`
- `src/loads/result-id-registry.ts`
- `test/unit/loads.test.ts`
- `test/unit/combinations.test.ts`
- `test/regression/prototype-id.test.ts`
- `test/regression/self-weight-density.test.ts`

## Interface contracts

- Point actions use `distanceFromElasticStart`; ratio construction uses `positionRatio` and is converted at finalization.
- Cases/combinations share `ResultIdRegistry`.
- Combination factors are arrays/Maps, never ordinary object records.

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

### Task 1: Implement nodal actions

- [x] **1.1** Define explicit force/moment components.
- [x] **1.2** Validate node references and finite values.
- [x] **1.3** Document all-zero action policy.

### Task 2: Implement member point actions

- [x] **2.1** Use explicit physical distance and separate ratio constructors.
- [x] **2.2** Reject ambiguous `position` in JSON.
- [x] **2.3** Gate point moments on verified theory support.

### Task 3: Implement distributed loads

- [x] **3.1** Support uniform/linearly varying and full/partial spans.
- [x] **3.2** Validate intervals and intensities.
- [x] **3.3** Preserve discontinuity coordinates.

### Task 4: Implement self-weight

- [x] **4.1** Require density for every affected element/material.
- [x] **4.2** Use explicit gravity vector.
- [x] **4.3** Aggregate missing-density diagnostics.

### Task 5: Implement cases/combinations

- [x] **5.1** Enforce one result-ID collision domain.
- [x] **5.2** Detect missing references, duplicate factors, cycles, empty combinations policy, and non-finite factors.
- [x] **5.3** Test prototype-like IDs as ordinary safe data or explicit rejections.

### Task 6: Define load provenance

- [x] **6.1** Create immutable contribution metadata for later recovery and combination.
- [x] **6.2** Define compatibility keys for stiffness/factorization reuse.

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

`docs/verification/load-contract-report.md` records coordinate, self-weight, ID, and combination-graph tests.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

All loads are unambiguous and finite, self-weight cannot silently vanish, and case/combination identities and graphs are safe and deterministic.

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [x] Required benchmark/verification evidence is stored.
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied.
