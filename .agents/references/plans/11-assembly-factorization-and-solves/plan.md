# Part 11: Assembly, Factorization, and Case Solves — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Integrate topology, constraints, element kernels, sparse assembly, ordering, reusable factorization, load-case solves, reactions, and mechanism diagnostics.

## Prerequisites

Parts 00 through 10 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/analysis/prepare-analysis.ts`
- `src/analysis/element-equation-map.ts`
- `src/analysis/assemble-stiffness.ts`
- `src/analysis/assemble-load-case.ts`
- `src/analysis/prepared-analysis.ts`
- `src/analysis/recover-reactions.ts`
- `src/analysis/analysis-cache-key.ts`
- `test/integration/global-assembly.test.ts`
- `test/integration/case-solve.test.ts`
- `test/integration/factorization-reuse.test.ts`
- `test/regression/global-mechanisms.test.ts`

## Interface contracts

- `prepareAnalysis(model): PreparedAnalysis`.
- Prepared analysis owns immutable factorization and supports multiple case solves.
- All failures map reduced equations back to physical node/DOF metadata.

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

### Task 1: Build preparation pipeline

- [ ] **1.1** Compile physical/reduced topology, constraints, element maps, and memory estimates.
- [ ] **1.2** Reject unsafe allocations before assembly.

### Task 2: Assemble global stiffness

- [ ] **2.1** Transform and add element contributions sparsely.
- [ ] **2.2** Apply affine reduction without a dense transform.
- [ ] **2.3** Provide contribution tracing in test/debug mode.

### Task 3: Order and factorize

- [ ] **3.1** Apply RCM, profile conversion, and Cholesky once.
- [ ] **3.2** Map pivot failures to physical entities and constraints.

### Task 4: Assemble load cases

- [ ] **4.1** Combine nodal, member-equivalent, self-weight, prescribed-displacement, and affine-offset contributions.
- [ ] **4.2** Use multiple RHS solves where possible.

### Task 5: Recover reactions

- [ ] **5.1** Recover full displacement and support/prescribed/spring/constraint reactions from equilibrium.
- [ ] **5.2** Never infer reactions from suppressed rows.

### Task 6: Implement reuse

- [ ] **6.1** Key preparation by immutable stiffness compatibility.
- [ ] **6.2** Expose assembly/factorization reuse flags.
- [ ] **6.3** Invalidate on stiffness/topology changes.

### Task 7: Mechanism regression

- [ ] **7.1** Test free frames, under-restrained trusses, release mechanisms, spring mechanisms, and constraint rank failures.
- [ ] **7.2** Require stable structured diagnostics.

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

Create `docs/verification/analysis-integration-report.md` with hand assemblies, reuse counters, and mechanism diagnostics.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Integrated small models match independent solutions, compatible cases reuse factors, and every mechanism fails with physical structured diagnostics.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
