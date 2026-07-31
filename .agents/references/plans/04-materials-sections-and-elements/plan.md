# Part 04: Materials, Sections, and Element Definitions — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement physically constrained isotropic materials, distinct frame/truss sections, frame/truss/spring records, and explicit theory contracts.

## Prerequisites

Parts 00 through 03 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/materials/isotropic-material.ts`
- `src/sections/frame-section.ts`
- `src/sections/truss-section.ts`
- `src/elements/frame-element.ts`
- `src/elements/truss-element.ts`
- `src/elements/spring-element.ts`
- `src/elements/frame-theory.ts`
- `test/unit/material.test.ts`
- `test/unit/sections.test.ts`
- `test/unit/element-definitions.test.ts`

## Interface contracts

- `createIsotropicMaterial(input): IsotropicMaterial`.
- `createFrameSection(input): FrameSection`.
- `createTrussSection(input): TrussSection`.
- Frame theory is the closed union `euler-bernoulli | timoshenko`.

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

### Task 1: Implement materials

- [x] **1.1** Support E+G, E+nu, and consistent E+G+nu.
- [x] **1.2** Derive the missing property.
- [x] **1.3** Reject nonpositive moduli, invalid nu, and inconsistent triples.

### Task 2: Implement frame sections

- [x] **2.1** Define area, torsional constant, two inertias, and optional effective shear areas.
- [x] **2.2** Require shear areas only when consumed by Timoshenko frames.
- [x] **2.3** Document principal-axis conventions.

### Task 3: Implement truss sections

- [x] **3.1** Require only axial area and material ID.
- [x] **3.2** Reject frame-only properties through schema/type discrimination.

### Task 4: Implement element records

- [x] **4.1** Define immutable frame, truss, ground-spring, and two-node-spring inputs/finalized records.
- [x] **4.2** Validate distinct nodes, orientations, component stiffness, and theory-specific requirements.

### Task 5: Create numerical specification tests

- [x] **5.1** Create failing mathematical test files for future stiffness/load kernels without `.todo` or `.skip`.
- [x] **5.2** Keep only definition-level tests enabled until each numerical part implements the behavior.

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

Record material relation checks and domain-contract examples in `docs/verification/material-section-report.md`.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Material/section contracts are physically specific, theory requirements are explicit, and unsupported element/property combinations cannot pass validation.

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [x] Required benchmark/verification evidence is stored.
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied.
