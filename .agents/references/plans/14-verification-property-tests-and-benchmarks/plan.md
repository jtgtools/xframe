# Part 14: Verification, Property Tests, and Benchmarks — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Complete the independent numerical verification corpus, metamorphic/adversarial tests, coverage closure, sparse scalability evidence, and dense-regression guards.

## Prerequisites

Parts 00 through 13 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `verification/analytical/*.test.ts`
- `verification/external/*.test.ts`
- `verification/metamorphic/*.test.ts`
- `verification/reference-data/*`
- `test/property/model-invariants.test.ts`
- `test/regression/mandatory-regressions.test.ts`
- `scripts/run-benchmarks.ts`
- `scripts/check-no-dense-global.mjs`
- `docs/verification/verification-report.md`
- `docs/verification/benchmark-report.md`

## Interface contracts

- Each reference case records provenance, units, expected values, tolerances, and comparison IDs.
- Benchmarks emit deterministic raw JSON plus human-readable summaries.

## Mandatory execution discipline

- [ ] Read this entire plan before changing files.
- [ ] Mark this part `in-progress` in `docs/roadmap/progress.md`.
- [ ] For each behavior, write a failing Vitest test and run it to prove the intended failure.
- [ ] Implement the minimum mathematically correct behavior.
- [ ] Per edit, run only what it touches (narrow test file, typecheck/lint/format on touched files); run `npm run check` once at part acceptance.
- [ ] Never weaken a tolerance or expected result without written mathematical justification.
- [ ] Never use `.skip`, `.only`, or `.todo`.
- [ ] Never introduce silent restraints, arbitrary stiffness, swallowed errors, or unsupported implied behavior.

## Tasks

### Task 1: Build verification corpus

- [ ] **1.1** Create at least twelve independent named cases and one hundred finite scalar comparisons.
- [ ] **1.2** Cover every supported element, theory, load, constraint, release, offset, spring, combination, result, and serialization boundary.

### Task 2: Implement analytical oracles

- [ ] **2.1** Add axial bar, cantilever, simply supported, spring, prescribed-displacement, and superposition closed forms.
- [ ] **2.2** Do not generate expected values using production functions.

### Task 3: Implement metamorphic properties

- [ ] **3.1** Test translation, rotation, connectivity reversal, model/load/stiffness scaling, subdivision, reciprocity, superposition, energy, equilibrium, and transforms.
- [ ] **3.2** Use fixed seeds and preserve failures.

### Task 4: Complete adversarial regressions

- [ ] **4.1** Include every mandatory regression from the master prompt.
- [ ] **4.2** Test extreme/mixed scales and near-singular systems.

### Task 5: Close coverage

- [ ] **5.1** Meet all Vitest thresholds.
- [ ] **5.2** Review uncovered numerical/validation branches manually.
- [ ] **5.3** Do not add meaningless tests solely to increase coverage.

### Task 6: Run sparse benchmarks

- [ ] **6.1** Generate near 500, 2,000, 5,000, and conditionally 10,000 equations.
- [ ] **6.2** Measure topology, assembly, ordering, factorization, solve, recovery, memory, reuse, and multiple cases.
- [ ] **6.3** Run dense-global guard.

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

- [ ] Every public behavior has a requirement ID.
- [ ] Every touched requirement has tests.
- [ ] Errors use stable structured codes and contexts.
- [ ] Inputs and intermediate numerical boundaries reject non-finite values.
- [ ] Untrusted identifiers are never stored in ordinary object prototypes.
- [ ] Caller-owned mutable arrays/objects are not retained.
- [ ] No dense global numerical allocation was introduced.
- [ ] Browser-safe runtime boundaries remain intact.
- [ ] Documentation describes only implemented behavior.
- [ ] All required commands pass.

## Required evidence

The formal verification and benchmark reports are the evidence outputs for this part, generated from actual test/benchmark data.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

At least twelve independent cases and one hundred finite comparisons pass, mandatory properties/regressions pass, coverage meets thresholds, and sparse benchmarks complete without dense regression.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
