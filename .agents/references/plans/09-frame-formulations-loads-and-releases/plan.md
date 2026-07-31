# Part 09: Frame Formulations, Member Loads, and Releases — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement and independently verify 3D Euler-Bernoulli and Timoshenko frame stiffness, theory-consistent member loads, fixed-end/end-force recovery, and release condensation.

## Prerequisites

Parts 00 through 08 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `docs/theory/frame-element.md`
- `docs/theory/member-loads.md`
- `docs/theory/releases.md`
- `src/elements/frame/local-stiffness.ts`
- `src/elements/frame/member-load-vector.ts`
- `src/elements/frame/release-condensation.ts`
- `src/elements/frame/end-force-recovery.ts`
- `src/elements/frame/release-mask-enumerator.ts`
- `test/unit/frame-stiffness.test.ts`
- `test/unit/member-loads.test.ts`
- `test/unit/release-condensation.test.ts`
- `verification/analytical/frame-cases.test.ts`
- `verification/external/frame-reference.test.ts`

## Interface contracts

- `computeFrameLocalStiffness(input): Float64Array(144)`.
- `computeFrameEquivalentLoad(input): Float64Array(12)`.
- `condenseFrameEndReleases(k, p, mask): CondensedFrameKernel`.

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

### Task 1: Document equations first

- [ ] **1.1** Assign equation IDs for stiffness, Timoshenko shear parameters, interpolation, equivalent loads, signs, fixed-end forces, and condensation.
- [ ] **1.2** Link each equation to planned tests.

### Task 2: Implement unreleased stiffness

- [ ] **2.1** Implement Euler-Bernoulli and Timoshenko 12x12 matrices.
- [ ] **2.2** Verify symmetry, scale behavior, energy, expected rigid modes, and independent shear parameters in both planes.

### Task 3: Implement theory-consistent loads

- [ ] **3.1** Implement point force, verified point moment, uniform, linearly varying, and partial-span variants.
- [ ] **3.2** Check resultant force/moment equilibrium for each.
- [ ] **3.3** Never reuse Euler-Bernoulli formulas under Timoshenko unless mathematically proven identical.

### Task 4: Implement release condensation

- [ ] **4.1** Partition retained/released DOFs.
- [ ] **4.2** Detect singular released blocks before global assembly.
- [ ] **4.3** Condense both stiffness and load vectors consistently.

### Task 5: Enumerate 4,096 masks

- [ ] **5.1** Generate every mask and classify valid/invalid deterministically.
- [ ] **5.2** Persist summary evidence and assert no unclassified state.

### Task 6: Implement end-force recovery

- [ ] **6.1** Apply stiffness, equivalent loads, releases, and signs consistently.
- [ ] **6.2** Verify superposition, connectivity reversal, equilibrium, and rigid displacement invariance.

### Task 7: Independent verification

- [ ] **7.1** Use closed forms, split-member equivalence, and external reference data, including shear-flexible loaded Timoshenko cases.
- [ ] **7.2** Do not expose point moments until verified.

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

Create `docs/verification/frame-verification-report.md` with equations, cases, tolerances, 4,096-mask summary, and finite comparison tables.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Both theories and every exposed member load pass independent verification; all 4,096 release masks are classified; no artificial stiffness is used.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
