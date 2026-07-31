# Part 05: DOF Topology and Model Finalization — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Resolve references and elastic geometry, derive active physical DOFs, validate analysis completeness, and produce deterministic immutable finalized models.

## Prerequisites

Parts 00 through 04 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/model/reference-resolution.ts`
- `src/model/dof-key.ts`
- `src/model/dof-topology.ts`
- `src/model/model-finalizer.ts`
- `src/model/finalized-model.ts`
- `src/model/model-fingerprint.ts`
- `test/unit/reference-resolution.test.ts`
- `test/unit/dof-topology.test.ts`
- `test/integration/model-finalization.test.ts`
- `test/regression/no-auto-restraint.test.ts`

## Interface contracts

- `finalizeModel(builderState): FinalizedModel`.
- `FinalizedModel.physicalDofs` maps deterministic physical DOF keys to metadata.
- Fingerprint is explicitly non-cryptographic.

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

### Task 1: Resolve references

- [x] **1.1** Resolve all entity references and aggregate independent errors deterministically.
- [x] **1.2** Sort errors by entity type, ID, and field path.

### Task 2: Derive physical DOF requests

- [x] **2.1** Frames request 6 DOFs per connected node; trusses request translations only; springs request defined components.
- [x] **2.2** Reject constraints targeting physically unavailable DOFs.

### Task 3: Number topology deterministically

- [x] **3.1** Separate physical DOF identity from reduced equation numbers.
- [x] **3.2** Store reverse maps for diagnostics.
- [x] **3.3** Prove truss-only rotations do not exist.

### Task 4: Resolve elastic geometry and member coordinates

- [x] **4.1** Compute deformable endpoints and elastic lengths.
- [x] **4.2** Validate point/partial-span load coordinates after geometry is known.

### Task 5: Validate completeness and freeze

- [x] **5.1** Reject empty/incomplete models, ID collisions, unresolved units, and invalid density requirements.
- [x] **5.2** Deep-copy/freeze records.
- [x] **5.3** Compute deterministic non-cryptographic fingerprint.

### Task 6: Lock mechanism regressions

- [x] **6.1** Create free/under-restrained truss inputs and assert their physical translations remain present.
- [x] **6.2** Do not solve yet; prove finalization did not invent restraints.

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

`docs/verification/finalization-report.md` records deterministic topology tables for representative mixed models.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Finalized models are immutable and deterministic, all references/geometry are resolved, and no physical DOF is silently created or restrained incorrectly.

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [x] Required benchmark/verification evidence is stored.
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied.
