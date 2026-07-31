# Part 08: Sparse Affine Constraint Compiler — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Canonicalize and compile general affine equations sparsely, detect invalid systems, and recover full displacements and reactions with source traceability.

## Prerequisites

Parts 00 through 07 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/constraints/affine-equation.ts`
- `src/constraints/canonicalize-constraint.ts`
- `src/constraints/constraint-block.ts`
- `src/constraints/constraint-rank.ts`
- `src/constraints/compile-constraints.ts`
- `src/constraints/recover-constrained-state.ts`
- `test/unit/constraint-canonicalization.test.ts`
- `test/unit/constraint-rank.test.ts`
- `test/integration/constraint-compiler.test.ts`
- `test/regression/constraint-failures.test.ts`

## Interface contracts

- Constraint equation: terms `{ dof, coefficient }[]`, RHS, source ID.
- Compiled mapping represents reduced-to-full coefficients sparsely plus affine offsets.

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

### Task 1: Define/canonicalize equations

- [ ] **1.1** Combine duplicate DOF terms, remove scaled zeros, normalize equation scale, preserve source ID.
- [ ] **1.2** Reject empty contradictory equations.

### Task 2: Build incidence/dependency blocks

- [ ] **2.1** Map constraints to DOFs and connected blocks.
- [ ] **2.2** Detect exact duplicate equations and deterministic ordering.

### Task 3: Detect redundancy and invalidity

- [ ] **3.1** Implement rank-aware block checks.
- [ ] **3.2** Differentiate harmless redundancy, conflicting RHS, cycles, and unresolved rank deficiency.
- [ ] **3.3** Verify hand systems.

### Task 4: Compile sparse reduction

- [ ] **4.1** Choose/document sparse substitution or sparse null-space construction.
- [ ] **4.2** Avoid dense full transforms.
- [ ] **4.3** Pre-estimate memory.

### Task 5: Recover full state/reactions

- [ ] **5.1** Recover full displacements and constraint forces/reactions.
- [ ] **5.2** Verify prescribed displacement, equal DOF, offset, and diaphragm hand examples.

### Task 6: Test transactional convenience APIs

- [ ] **6.1** A failed rigid-diaphragm or multi-constraint add must roll back completely.

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

`docs/verification/constraint-report.md` includes hand matrices, ranks, recovered states, reactions, and invalid-system classifications.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Constraint compilation is sparse, deterministic, rank-aware, and verified for valid and invalid systems with complete recovery.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
